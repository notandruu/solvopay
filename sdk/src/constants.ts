import type { Address } from "viem";

export const BASE_MAINNET_ADDRESSES = {
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address,
  aavePool: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5" as Address,
  aUsdc: "0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB" as Address,
};

export const SESSION_FACTORY_ABI = [
  {
    type: "constructor",
    inputs: [
      { name: "_aavePool", type: "address" },
      { name: "_usdc", type: "address" },
      { name: "_aUsdc", type: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "openSession",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "depositAmount", type: "uint256" },
      { name: "agentYieldShare", type: "uint256" },
      { name: "deadlineAt", type: "uint256" },
    ],
    outputs: [
      { name: "sessionId", type: "bytes32" },
      { name: "escrow", type: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "sessions",
    inputs: [{ name: "sessionId", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "usdc",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "SessionOpened",
    inputs: [
      { name: "sessionId", type: "bytes32", indexed: true },
      { name: "escrow", type: "address", indexed: true },
      { name: "agent", type: "address", indexed: true },
      { name: "recipient", type: "address", indexed: false },
      { name: "deposit", type: "uint256", indexed: false },
      { name: "agentYieldShare", type: "uint256", indexed: false },
      { name: "deadlineAt", type: "uint256", indexed: false },
    ],
  },
] as const;

export const SESSION_ESCROW_ABI = [
  {
    type: "function",
    name: "settle",
    inputs: [
      {
        name: "voucher",
        type: "tuple",
        components: [
          { name: "sessionId", type: "bytes32" },
          { name: "totalAuthorized", type: "uint256" },
          { name: "nonce", type: "uint256" },
        ],
      },
      { name: "sig", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "refund",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "status",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "sessionId",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "agent",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "recipient",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "deposit",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "agentYieldShare",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "deadlineAt",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "highestNonce",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "aUsdc",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "Settled",
    inputs: [
      { name: "recipientAmount", type: "uint256", indexed: false },
      { name: "agentAmount", type: "uint256", indexed: false },
      { name: "totalYield", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Refunded",
    inputs: [{ name: "agentAmount", type: "uint256", indexed: false }],
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const VOUCHER_TYPES = {
  Voucher: [
    { name: "sessionId", type: "bytes32" },
    { name: "totalAuthorized", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
} as const;
