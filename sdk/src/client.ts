import {
  createWalletClient,
  createPublicClient,
  defineChain,
  http,
  parseEventLogs,
  type Address,
  type Chain,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import {
  SESSION_FACTORY_ABI,
  SESSION_ESCROW_ABI,
  ERC20_ABI,
} from "./constants";
import { VoucherSigner } from "./signer";
import type {
  SolvoPayConfig,
  OpenSessionParams,
  Session,
  SignVoucherParams,
  SignedVoucher,
} from "./types";

function resolveChain(config: SolvoPayConfig): Chain {
  if (!config.chainId || config.chainId === base.id) return base;
  return defineChain({
    id: config.chainId,
    name: `Chain ${config.chainId}`,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [config.rpcUrl] } },
  });
}

export class SolvoPayClient {
  private readonly walletClient: any;
  private readonly publicClient: any;
  private readonly factoryAddress: Address;
  private readonly chain: Chain;
  private readonly backendUrl: string | undefined;

  constructor(config: SolvoPayConfig) {
    this.chain = resolveChain(config);
    const account = privateKeyToAccount(config.agentPrivateKey);
    const transport = http(config.rpcUrl);

    this.walletClient = createWalletClient({ account, chain: this.chain, transport });
    this.publicClient = createPublicClient({ chain: this.chain, transport });
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

    const usdc = await this.publicClient.readContract({
      address: this.factoryAddress,
      abi: SESSION_FACTORY_ABI,
      functionName: "usdc",
    }) as Address;

    const approveTx = await this.walletClient.writeContract({
      account,
      chain: this.chain,
      address: usdc,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [this.factoryAddress, depositAmount],
    });
    await this.publicClient.waitForTransactionReceipt({ hash: approveTx });

    const openTx = await this.walletClient.writeContract({
      account,
      chain: this.chain,
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
    const signer = new VoucherSigner(this.walletClient as any, escrowAddress, this.chain.id);
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
    const aUsdc = await this.publicClient.readContract({
      address: escrowAddress,
      abi: SESSION_ESCROW_ABI,
      functionName: "aUsdc",
    }) as Address;

    return this.publicClient.readContract({
      address: aUsdc,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [escrowAddress],
    });
  }
}
