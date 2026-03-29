// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {VoucherLib} from "./VoucherLib.sol";

contract SessionEscrow is EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using VoucherLib for VoucherLib.Voucher;

    enum Status {
        ACTIVE,
        SETTLED,
        REFUNDED
    }

    bytes32 public immutable sessionId;
    address public immutable agent;
    address public immutable recipient;
    uint256 public immutable deposit;
    uint256 public immutable agentYieldShare;
    uint256 public immutable deadlineAt;

    IPool public immutable aavePool;
    IERC20 public immutable usdc;
    IERC20 public immutable aUsdc;

    Status public status;
    uint256 public highestNonce;

    event Settled(uint256 recipientAmount, uint256 agentAmount, uint256 totalYield);
    event Refunded(uint256 agentAmount);

    constructor(
        bytes32 _sessionId,
        address _agent,
        address _recipient,
        uint256 _deposit,
        uint256 _agentYieldShare,
        uint256 _deadlineAt,
        address _aavePool,
        address _usdc,
        address _aUsdc
    ) EIP712("SolvoPay", "1") {
        require(_agentYieldShare <= 100, "yield share > 100");
        require(_deadlineAt > block.timestamp, "deadline in past");
        sessionId = _sessionId;
        agent = _agent;
        recipient = _recipient;
        deposit = _deposit;
        agentYieldShare = _agentYieldShare;
        deadlineAt = _deadlineAt;
        aavePool = IPool(_aavePool);
        usdc = IERC20(_usdc);
        aUsdc = IERC20(_aUsdc);
        status = Status.ACTIVE;
    }

    function settle(
        VoucherLib.Voucher calldata voucher,
        bytes calldata sig
    ) external nonReentrant {
        require(status == Status.ACTIVE, "not active");
        require(msg.sender == recipient, "only recipient");
        require(voucher.sessionId == sessionId, "wrong session");
        require(voucher.nonce > highestNonce, "stale nonce");
        require(voucher.totalAuthorized <= deposit, "exceeds deposit");

        bytes32 digest = _hashTypedDataV4(voucher.hash());
        address signer = ECDSA.recover(digest, sig);
        require(signer == agent, "invalid sig");

        highestNonce = voucher.nonce;
        status = Status.SETTLED;

        uint256 aTokenBalance = aUsdc.balanceOf(address(this));
        uint256 totalWithdrawn = aavePool.withdraw(address(usdc), aTokenBalance, address(this));

        uint256 yieldEarned = totalWithdrawn > deposit ? totalWithdrawn - deposit : 0;
        uint256 agentYieldAmount = (yieldEarned * agentYieldShare) / 100;
        uint256 recipientYieldAmount = yieldEarned - agentYieldAmount;

        uint256 recipientTotal = voucher.totalAuthorized + recipientYieldAmount;
        uint256 agentTotal = (deposit - voucher.totalAuthorized) + agentYieldAmount;

        if (recipientTotal > 0) usdc.safeTransfer(recipient, recipientTotal);
        if (agentTotal > 0) usdc.safeTransfer(agent, agentTotal);

        emit Settled(recipientTotal, agentTotal, yieldEarned);
    }

    function refund() external nonReentrant {
        require(status == Status.ACTIVE, "not active");
        require(msg.sender == agent, "only agent");
        require(block.timestamp >= deadlineAt + 7 days, "too early");

        status = Status.REFUNDED;

        uint256 aTokenBalance = aUsdc.balanceOf(address(this));
        uint256 totalWithdrawn = aavePool.withdraw(address(usdc), aTokenBalance, address(this));

        usdc.safeTransfer(agent, totalWithdrawn);

        emit Refunded(totalWithdrawn);
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
