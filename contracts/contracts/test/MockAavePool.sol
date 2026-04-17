// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MockERC20} from "./MockERC20.sol";

/// Minimal Aave Pool mock: supply mints aTokens 1:1, withdraw burns them and returns underlying.
/// No yield accrual — keeps tests simple and deterministic.
contract MockAavePool {
    using SafeERC20 for IERC20;

    IERC20 public immutable underlying;
    MockERC20 public immutable aToken;

    constructor(address _underlying, address _aToken) {
        underlying = IERC20(_underlying);
        aToken = MockERC20(_aToken);
    }

    function supply(address asset, uint256 amount, address onBehalfOf, uint16) external {
        require(asset == address(underlying), "wrong asset");
        underlying.safeTransferFrom(msg.sender, address(this), amount);
        aToken.mint(onBehalfOf, amount);
    }

    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        require(asset == address(underlying), "wrong asset");
        aToken.burn(msg.sender, amount);
        underlying.safeTransfer(to, amount);
        return amount;
    }
}
