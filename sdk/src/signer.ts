import type { WalletClient, Address, Hash, Hex } from "viem";
import { VOUCHER_TYPES } from "./constants";
import type { SignedVoucher, SignVoucherParams } from "./types";

export class VoucherSigner {
  constructor(
    private readonly walletClient: WalletClient,
    private readonly escrowAddress: Address,
    private readonly chainId: number
  ) {}

  async sign(params: SignVoucherParams): Promise<SignedVoucher> {
    const { sessionId, totalAuthorized, nonce } = params;

    const sig = await this.walletClient.signTypedData({
      account: this.walletClient.account!,
      domain: {
        name: "SolvoPay",
        version: "1",
        chainId: this.chainId,
        verifyingContract: this.escrowAddress,
      },
      types: VOUCHER_TYPES,
      primaryType: "Voucher",
      message: {
        sessionId,
        totalAuthorized,
        nonce,
      },
    });

    return { sessionId, totalAuthorized, nonce, sig };
  }
}
