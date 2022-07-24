//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.14;

import "./Execute.sol";
import "./Membership.sol";
import "./Verify.sol";

enum VoteCast {
    NOT_VOTED_YET,
    VOTED_FOR,
    VOTED_AGAINST,
    VOTED_ABSTAIN
}

enum ProposalStatus {
    NON_EXISTENT,
    ONGOING_VOTING,
    REVOKED,
    FAILED,
    PASSED,
    EXECUTED
}

struct StructProposal {
    address proposedBy;
    uint256 proposedAt;
    bool isExecuted;
    bool isRevoked;
}

error ProposalNotFound();
error BadProposalStatus(ProposalStatus expected, ProposalStatus actual);

abstract contract Proposal is Execute, Membership, Verify {
    event ProposalSubmitted(uint256 proposalId, address by);
    event ProposalRevoked(uint256 proposalId, address by);
    event VoteSubmitted(uint256 proposalId, VoteCast vote, address voter);

    constructor(string memory _name, string memory _version)
        Verify(_name, _version)
    {}

    mapping(uint256 => StructProposal) public proposals;
    mapping(uint256 => mapping(VoteCast => uint256)) public tally;
    mapping(uint256 => mapping(address => VoteCast)) public voterToVote;

    bytes32 public constant BALLOT_TYPEHASH =
        keccak256("Ballot(uint256 proposalId,uint8 vote)");

    uint256 constant VOTING_WINDOW = 5 days;
    uint256 constant INVERSE_QUORUM_PERCENTAGE = 4; //(25% quorum limit becomes 4, because (25/100)^-1 = 4.

    function getProposalId(
        address[] memory contractAddresses,
        uint256[] memory values,
        bytes[] memory calldatas,
        uint256 disambiguator
    ) public pure returns (uint256) {
        bytes32 executionHash = _hashExecution(
            contractAddresses,
            values,
            calldatas
        );
        return uint256(keccak256(abi.encode(disambiguator, executionHash)));
    }

    function getProposalStatus(uint256 proposalId)
        public
        view
        returns (ProposalStatus)
    {
        StructProposal storage proposal = proposals[proposalId];
        if (proposal.proposedBy == address(0)) {
            return ProposalStatus.NON_EXISTENT;
        } else if (proposal.isExecuted) {
            return ProposalStatus.EXECUTED;
        } else if (proposal.isRevoked) {
            return ProposalStatus.REVOKED;
        } else if ((proposal.proposedAt + VOTING_WINDOW) > block.timestamp) {
            return ProposalStatus.ONGOING_VOTING;
        } else {
            mapping(VoteCast => uint256) storage currentTally = tally[proposalId];
            uint256 total = (currentTally[VoteCast.NOT_VOTED_YET] +
                currentTally[VoteCast.VOTED_FOR] +
                currentTally[VoteCast.VOTED_AGAINST] +
                currentTally[VoteCast.VOTED_ABSTAIN]);
            uint256 quorumNominator = total -
                currentTally[VoteCast.NOT_VOTED_YET];
            bool isQuorumReached = (INVERSE_QUORUM_PERCENTAGE *
                quorumNominator) >= total;
            bool isMajorityFor = currentTally[VoteCast.VOTED_FOR] >
                currentTally[VoteCast.VOTED_AGAINST];
            if (isQuorumReached && isMajorityFor) {
                return ProposalStatus.PASSED;
            } else {
                return ProposalStatus.FAILED;
            }
        }
    }

    function _propose__validated(uint256 proposalId) internal {
        StructProposal storage proposal = proposals[proposalId];
        proposal.proposedBy = msg.sender;
        proposal.proposedAt = block.timestamp;
        tally[proposalId][VoteCast.NOT_VOTED_YET] = numMembers;
        emit ProposalSubmitted(proposalId, proposal.proposedBy);
    }

    function _validateVote(
        uint256 proposalId,
        VoteCast vote,
        address voter
    ) internal view {
        if (vote == VoteCast.NOT_VOTED_YET) {
            revert("Cant vote back to not-voted");
        }
        ProposalStatus status = getProposalStatus(proposalId);
        if (status != ProposalStatus.ONGOING_VOTING) {
            revert BadProposalStatus(ProposalStatus.ONGOING_VOTING, status);
        }
        StructProposal storage proposal = proposals[proposalId];
        _requireOnlyMemberSince(proposal.proposedAt, voter);
    }

    function _castVote(
        uint256 proposalId,
        VoteCast vote,
        address voter
    ) internal {
        _validateVote(proposalId, vote, voter);
        VoteCast previousVote = voterToVote[proposalId][voter];
        tally[proposalId][previousVote]--;
        voterToVote[proposalId][voter] = vote;
        tally[proposalId][vote]++;
        emit VoteSubmitted(proposalId, vote, voter);
    }

    function structHashBallot(uint256 proposalId, VoteCast vote)
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(BALLOT_TYPEHASH, proposalId, vote));
    }

    function castVoteFromSignature(
        uint256 proposalId,
        VoteCast vote,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        bytes32 structHashed = structHashBallot(proposalId, vote);
        bytes32 domainHashed = domainHash(structHashed);
        address voter = ecrecover(domainHashed, v, r, s);
        _castVote(proposalId, vote, voter);
    }

    function revokeProposal(uint256 proposalId) external {
        ProposalStatus status = getProposalStatus(proposalId);
        if (status != ProposalStatus.ONGOING_VOTING) {
            revert BadProposalStatus(ProposalStatus.ONGOING_VOTING, status);
        }

        StructProposal storage proposal = proposals[proposalId];
        if (proposal.proposedBy != msg.sender) {
            revert("Cant revoke unless you proposed");
        }
        proposal.isRevoked = true;
        emit ProposalRevoked(proposalId, proposal.proposedBy);
    }

    function castVote(uint256 proposalId, VoteCast vote) external {
        _castVote(proposalId, vote, msg.sender);
    }

    function batchCastVotesFromSignatures(
        uint256[] calldata proposalIds,
        VoteCast[] calldata votes,
        uint8[] calldata vs,
        bytes32[] calldata rs,
        bytes32[] calldata ss
    ) external {
        if (proposalIds.length < 1) {
            revert("too short");
        } else if (proposalIds.length != votes.length) {
            revert("length mismatch");
        } else if (proposalIds.length != vs.length) {
            revert("length mismatch");
        } else if (proposalIds.length != rs.length) {
            revert("length mismatch");
        } else if (proposalIds.length != ss.length) {
            revert("length mismatch");
        }

        for (uint256 i = 0; i < proposalIds.length; i++) {
            castVoteFromSignature(
                proposalIds[i],
                votes[i],
                vs[i],
                rs[i],
                ss[i]
            );
        }
    }
}
