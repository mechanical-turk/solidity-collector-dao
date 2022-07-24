//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.14;

abstract contract Verify {
    bytes32 constant TYPE_HASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );
    bytes32 immutable HASHED_NAME;
    bytes32 immutable HASHED_VERSION;
    uint256 immutable CACHED_CHAIN_ID;
    bytes32 immutable CACHED_DOMAIN_SEPARATOR;

    constructor(string memory _name, string memory _version) {
        HASHED_NAME = keccak256(bytes(_name));
        HASHED_VERSION = keccak256(bytes(_version));
        CACHED_CHAIN_ID = block.chainid;
        CACHED_DOMAIN_SEPARATOR = _buildDomainSeparator();
    }

    function _buildDomainSeparator() internal view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    TYPE_HASH,
                    HASHED_NAME,
                    HASHED_VERSION,
                    block.chainid,
                    address(this)
                )
            );
    }

    function _getDomainSeparator() internal view returns (bytes32) {
        if (block.chainid != CACHED_CHAIN_ID) {
            return _buildDomainSeparator();
        } else {
            return CACHED_DOMAIN_SEPARATOR;
        }
    }

    function domainHash(bytes32 structHash)
        internal
        view
        virtual
        returns (bytes32)
    {
        return
            keccak256(
                abi.encodePacked("\x19\x01", _getDomainSeparator(), structHash)
            );
    }
}
