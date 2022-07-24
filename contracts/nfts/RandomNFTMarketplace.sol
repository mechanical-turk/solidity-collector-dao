//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.14;

import "./INftMarketplace.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract RandomNFTMarketplace is INftMarketplace {
    mapping(address => mapping(uint256 => uint256)) public listings;

    function getPrice(address nftContract, uint256 nftId)
        external
        view
        returns (uint256 price)
    {
        return listings[nftContract][nftId];
    }

    function buy(address nftContract, uint256 nftId)
        external
        payable
        returns (bool success)
    {
        IERC721 contr = IERC721(nftContract);
        uint256 price = listings[nftContract][nftId];
        require(msg.value == price, "price not equal");
        delete listings[nftContract][nftId];
        address previousOwner = contr.ownerOf(nftId);
        contr.safeTransferFrom(previousOwner, msg.sender, nftId);
        (bool paymentSuccessful, ) = previousOwner.call{value: msg.value}("");
        if (!paymentSuccessful) {
            revert("Unsuccessful payment");
        }
        return true;
    }

    function list(
        address nftContract,
        uint256 nftId,
        uint256 price
    ) external {
        IERC721 contr = IERC721(nftContract);
        address approved = contr.getApproved(nftId);
        require(approved == address(this), "only approved");
        listings[nftContract][nftId] = price;
    }
}
