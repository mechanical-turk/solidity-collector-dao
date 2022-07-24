//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.14;

contract Increment {
    uint256 public num;

    function increment() external {
        num++;
    }

    function incrementBy(uint256 by) external {
        num += by;
    }
}
