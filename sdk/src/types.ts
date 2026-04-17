import type { Address, Hash, Hex } from "viem";

export interface SolvoPayConfig {
  rpcUrl: string;
  agentPrivateKey: Hex;
  factoryAddress: Address;
  chainId?: number;
  backendUrl?: string;
}

export interface OpenSessionParams {
  serviceProvider: Address;
  depositAmount: bigint;
  agentYieldShare: number;
  deadlineAt?: bigint;
}

export interface Session {
  sessionId: Hash;
  escrow: Address;
  agent: Address;
  recipient: Address;
  deposit: bigint;
  agentYieldShare: number;
  deadlineAt: bigint;
  txHash: Hash;
}

export interface SignVoucherParams {
  sessionId: Hash;
  totalAuthorized: bigint;
  nonce: bigint;
}

export interface SignedVoucher {
  sessionId: Hash;
  totalAuthorized: bigint;
  nonce: bigint;
  sig: Hex;
}
