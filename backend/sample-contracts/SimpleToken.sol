// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleToken {
    mapping(address => uint256) public balance;

    function mint(address to, uint256 amount) public {
        balance[to] = balance[to] + amount;
    }

    function transfer(address to, uint256 amount) public {
        require(balance[msg.sender] >= amount, "insufficient");
        balance[msg.sender] -= amount;
        balance[to] += amount;
    }
}
