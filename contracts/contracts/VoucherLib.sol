// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library VoucherLib {
    struct Voucher {
        bytes32 sessionId;
        uint256 totalAuthorized;
        uint256 nonce;
    }

    bytes32 internal constant VOUCHER_TYPEHASH =
        keccak256("Voucher(bytes32 sessionId,uint256 totalAuthorized,uint256 nonce)");

    function hash(Voucher memory voucher) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                VOUCHER_TYPEHASH,
                voucher.sessionId,
                voucher.totalAuthorized,
                voucher.nonce
            )
        );
    }
}
