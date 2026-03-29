import {
  createWalletClient,
  createPublicClient,
  http,
  parseEventLogs,
  type Address,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import {
  SESSION_FACTORY_ABI,
  SESSION_ESCROW_ABI,
  ERC20_ABI,
  BASE_MAINNET_ADDRESSES,
} from "./constants";
import { VoucherSigner } from "./signer";
import type {
  SolvoPayConfig,
  OpenSessionParams,
  Session,
  SignVoucherParams,
  SignedVoucher,
} from "./types";

export class SolvoPayClient {
  private readonly walletClient: any;
  private readonly publicClient: any;
  private readonly factoryAddress: Address;
  private readonly backendUrl: string | undefined;

  constructor(config: SolvoPayConfig) {
    const account = privateKeyToAccount(config.agentPrivateKey);
    const transport = http(config.rpcUrl);

    this.walletClient = createWalletClient({ account, chain: base, transport });
    this.publicClient = createPublicClient({ chain: base, transport });
    this.factoryAddress = config.factoryAddress;
    this.backendUrl = config.backendUrl;
  }

  get agentAddress(): Address {
    return (this.walletClient.account as { address: Address }).address;
  }

  async openSession(params: OpenSessionParams): Promise<Session> {
    const {
      serviceProvider,
      depositAmount,
      agentYieldShare,
      deadlineAt = BigInt(Math.floor(Date.now() / 1000) + 3600),
    } = params;

    const account = this.walletClient.account!;

    const approveTx = await this.walletClient.writeContract({
      account,
      chain: base,
      address: BASE_MAINNET_ADDRESSES.usdc,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [this.factoryAddress, depositAmount],
    });
    await this.publicClient.waitForTransactionReceipt({ hash: approveTx });

    const openTx = await this.walletClient.writeContract({
      account,
      chain: base,
      address: this.factoryAddress,
      abi: SESSION_FACTORY_ABI,
      functionName: "openSession",
      args: [serviceProvider, depositAmount, BigInt(agentYieldShare), deadlineAt],
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: openTx });

    const logs = parseEventLogs({
      abi: SESSION_FACTORY_ABI,
      eventName: "SessionOpened",
      logs: receipt.logs,
    });

    if (logs.length === 0) throw new Error("SessionOpened event not found");

    const event = logs[0].args;

    const session: Session = {
      sessionId: event.sessionId as Hash,
      escrow: event.escrow as Address,
      agent: event.agent as Address,
      recipient: event.recipient as Address,
      deposit: event.deposit,
      agentYieldShare: Number(event.agentYieldShare),
      deadlineAt: event.deadlineAt,
      txHash: openTx,
    };

    if (this.backendUrl) {
      await fetch(`${this.backendUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.sessionId,
          escrow_address: session.escrow,
          agent: session.agent,
          recipient: session.recipient,
          deposit: session.deposit.toString(),
          agent_yield_share: session.agentYieldShare,
          deadline_at: session.deadlineAt.toString(),
        }),
      });
    }

    return session;
  }

  async signVoucher(params: SignVoucherParams, escrowAddress: Address): Promise<SignedVoucher> {
    const signer = new VoucherSigner(this.walletClient as any, escrowAddress, base.id);
    return signer.sign(params);
  }

  async closeSession(sessionId: Hash): Promise<void> {
    if (!this.backendUrl) throw new Error("backendUrl required for closeSession");
    const response = await fetch(`${this.backendUrl}/sessions/${sessionId}/settle`, {
      method: "POST",
    });
    if (!response.ok) throw new Error(`Backend settle failed: ${response.statusText}`);
  }

  async getSessionStatus(escrowAddress: Address): Promise<number> {
    const status = await this.publicClient.readContract({
      address: escrowAddress,
      abi: SESSION_ESCROW_ABI,
      functionName: "status",
    });
    return Number(status);
  }

  async getATokenBalance(escrowAddress: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: BASE_MAINNET_ADDRESSES.aUsdc,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [escrowAddress],
    });
  }
}
