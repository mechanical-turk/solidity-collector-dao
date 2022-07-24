//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.14;

import "./helpers/Proposal.sol";
import "./helpers/Verify.sol";
import "./nfts/INftMarketplace.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract DAO is Proposal, IERC721Receiver {
    event BoughtNFT(address nftContract, uint256 nftId, uint256 price);
    event ProposalExecuted(uint256 proposalId);

    INftMarketplace public immutable nftMarketplace;
    bool buyingNFT = false; // reentrancy guard

    constructor(
        string memory _name,
        string memory _version,
        address _nftMarketplaceAddress
    ) Proposal(_name, _version) {
        nftMarketplace = INftMarketplace(_nftMarketplaceAddress);
    }

    modifier onlyDAO() {
        if (address(msg.sender) != address(this)) {
            revert("only dao");
        }
        _;
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return
            bytes4(
                keccak256("onERC721Received(address,address,uint256,bytes)")
            );
    }

    function buyNft(
        address nftContract,
        uint256 nftId,
        uint256 maxValue
    ) external payable onlyDAO {
        require(!buyingNFT, "reentrancy");
        buyingNFT = true;
        uint256 price = nftMarketplace.getPrice(nftContract, nftId);
        if (price > maxValue) {
            revert("Price changed");
        }
        bool success = nftMarketplace.buy{value: price}(nftContract, nftId);
        if (!success) {
            revert("buyNFT Failed");
        }
        emit BoughtNFT(nftContract, nftId, price);
        buyingNFT = false;
    }

    function propose(
        address[] calldata contractAddresses,
        uint256[] calldata values,
        bytes[] calldata calldatas,
        uint256 disambiguator
    ) external {
        _requireOnlyMember(msg.sender);
        (bool isValid, EnumExecutionError e) = isValidExecution(
            contractAddresses,
            values,
            calldatas
        );
        if (!isValid) {
            revert ExecutionError(e);
        }
        uint256 proposalId = getProposalId(
            contractAddresses,
            values,
            calldatas,
            disambiguator
        );
        ProposalStatus status = getProposalStatus(proposalId);

        if (status != ProposalStatus.NON_EXISTENT) {
            revert BadProposalStatus(ProposalStatus.NON_EXISTENT, status);
        }

        _propose__validated(proposalId);
    }

    function execute(
        address[] calldata contractAddresses,
        uint256[] calldata values,
        bytes[] calldata calldatas,
        uint256 disambiguator
    ) external payable {
        uint256 proposalId = getProposalId(
            contractAddresses,
            values,
            calldatas,
            disambiguator
        );
        ProposalStatus status = getProposalStatus(proposalId);
        if (status != ProposalStatus.PASSED) {
            revert BadProposalStatus(ProposalStatus.PASSED, status);
        }
        StructProposal storage proposal = proposals[proposalId];
        _requireOnlyMemberSince(proposal.proposedAt, msg.sender);
        proposal.isExecuted = true;

        _execute__validated(contractAddresses, values, calldatas);
        emit ProposalExecuted(proposalId);
    }
}
