//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.14;

error AlreadyMember();
error InvalidMembershipFee();
error OnlyMember(address account);
error OnlyMemberSince(uint256 expected, uint256 actual, address account);

abstract contract Membership {
    event NewMember(address member);

    mapping(address => uint256) public becameMemberAt;
    uint256 constant MEMBERSHIP_FEE = 1 ether;
    uint256 public numMembers;

    function isMember(address member) public view returns (bool) {
        return becameMemberAt[member] > 0;
    }

    function isMemberSince(address member, uint256 since)
        public
        view
        returns (bool)
    {
        return isMember(member) && (becameMemberAt[member] <= since);
    }

    function _requireOnlyMember(address member) internal view {
        if (!isMember(member)) {
            revert OnlyMember(member);
        }
    }

    function _requireOnlyMemberSince(uint256 since, address member)
        internal
        view
    {
        if (!isMemberSince(member, since)) {
            revert OnlyMemberSince(since, becameMemberAt[member], member);
        }
    }

    function buyMembership() external payable {
        if (isMember(msg.sender)) {
            revert AlreadyMember();
        } else if (msg.value != MEMBERSHIP_FEE) {
            revert InvalidMembershipFee();
        }
        becameMemberAt[msg.sender] = block.timestamp;
        numMembers++;
        emit NewMember(msg.sender);
    }
}
