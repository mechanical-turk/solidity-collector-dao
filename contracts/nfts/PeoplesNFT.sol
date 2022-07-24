//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.14;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract PeoplesNFT is ERC721 {
    uint256 public lastTokenId = 0;

    constructor(string memory _name, string memory _version)
        ERC721(_name, _version)
    {}

    function mint(address to) external {
        lastTokenId++;
        _safeMint(to, lastTokenId);
    }
}
