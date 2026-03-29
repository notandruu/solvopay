// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {SessionEscrow} from "./SessionEscrow.sol";

contract SessionFactory {
    using SafeERC20 for IERC20;

    address public immutable aavePool;
    address public immutable usdc;
    address public immutable aUsdc;

    mapping(bytes32 => address) public sessions;

    event SessionOpened(
        bytes32 indexed sessionId,
        address indexed escrow,
        address indexed agent,
        address recipient,
        uint256 deposit,
        uint256 agentYieldShare,
        uint256 deadlineAt
    );

    constructor(address _aavePool, address _usdc, address _aUsdc) {
        aavePool = _aavePool;
        usdc = _usdc;
        aUsdc = _aUsdc;
    }

    function openSession(
        address recipient,
        uint256 depositAmount,
        uint256 agentYieldShare,
        uint256 deadlineAt
    ) external returns (bytes32 sessionId, address escrow) {
        require(depositAmount > 0, "zero deposit");
        require(recipient != address(0), "zero recipient");
        require(agentYieldShare <= 100, "yield share > 100");
        require(deadlineAt > block.timestamp, "deadline in past");

        sessionId = keccak256(
            abi.encode(msg.sender, recipient, block.timestamp, block.number, block.prevrandao)
        );
        require(sessions[sessionId] == address(0), "session exists");

        IERC20(usdc).safeTransferFrom(msg.sender, address(this), depositAmount);

        SessionEscrow escrowContract = new SessionEscrow(
            sessionId,
            msg.sender,
            recipient,
            depositAmount,
            agentYieldShare,
            deadlineAt,
            aavePool,
            usdc,
            aUsdc
        );
        escrow = address(escrowContract);
        sessions[sessionId] = escrow;

        IERC20(usdc).forceApprove(aavePool, depositAmount);
        IPool(aavePool).supply(usdc, depositAmount, escrow, 0);

        emit SessionOpened(sessionId, escrow, msg.sender, recipient, depositAmount, agentYieldShare, deadlineAt);
    }
}
