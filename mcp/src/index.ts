#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseEventLogs,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

// ── env ──────────────────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const RPC_URL = requireEnv("RPC_URL");
const RAW_KEY = requireEnv("PRIVATE_KEY");
const PRIVATE_KEY = (RAW_KEY.startsWith("0x") ? RAW_KEY : `0x${RAW_KEY}`) as Hex;
const FACTORY_ADDRESS = requireEnv("SESSION_FACTORY_ADDRESS") as Address;
const CHAIN_ID = parseInt(requireEnv("CHAIN_ID"), 10);

// ── chain + clients ───────────────────────────────────────────────────────────

const chain = defineChain({
  id: CHAIN_ID,
  name: `Chain ${CHAIN_ID}`,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const account = privateKeyToAccount(PRIVATE_KEY);
const rpcTransport = http(RPC_URL);
const publicClient = createPublicClient({ chain, transport: rpcTransport });
const walletClient = createWalletClient({ account, chain, transport: rpcTransport });

// ── ABIs ──────────────────────────────────────────────────────────────────────

const SESSION_FACTORY_ABI = [
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

const SESSION_ESCROW_ABI = [
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
  { type: "function", name: "status", inputs: [], outputs: [{ name: "", type: "uint8" }], stateMutability: "view" },
  { type: "function", name: "sessionId", inputs: [], outputs: [{ name: "", type: "bytes32" }], stateMutability: "view" },
  { type: "function", name: "agent", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "recipient", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "deposit", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "agentYieldShare", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "deadlineAt", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "highestNonce", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "aUsdc", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
] as const;

const ERC20_ABI = [
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

const VOUCHER_TYPES = {
  Voucher: [
    { name: "sessionId", type: "bytes32" },
    { name: "totalAuthorized", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

// ── helpers ───────────────────────────────────────────────────────────────────

const STATUS_NAMES = ["ACTIVE", "SETTLED", "REFUNDED"] as const;
const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

function bigintReplacer(_key: string, value: unknown) {
  return typeof value === "bigint" ? value.toString() : value;
}

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, bigintReplacer, 2) }],
  };
}

function toolError(message: string) {
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }],
  };
}

async function resolveEscrow(sessionId: Hash): Promise<Address> {
  const escrow = await publicClient.readContract({
    address: FACTORY_ADDRESS,
    abi: SESSION_FACTORY_ABI,
    functionName: "sessions",
    args: [sessionId],
  });
  if (escrow === ZERO_ADDR) throw new Error(`Session not found: ${sessionId}`);
  return escrow as Address;
}

// ── tool: open_session ────────────────────────────────────────────────────────

async function openSession(args: {
  service_provider: string;
  deposit_amount: string;
  agent_yield_share: number;
  deadline_at?: number;
}) {
  const recipient = args.service_provider as Address;
  const depositAmount = BigInt(args.deposit_amount);
  const agentYieldShare = BigInt(args.agent_yield_share);
  const deadlineAt = BigInt(
    args.deadline_at ?? Math.floor(Date.now() / 1000) + 3600
  );

  const usdc = await publicClient.readContract({
    address: FACTORY_ADDRESS,
    abi: SESSION_FACTORY_ABI,
    functionName: "usdc",
  }) as Address;

  const approveTx = await walletClient.writeContract({
    account,
    chain,
    address: usdc,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [FACTORY_ADDRESS, depositAmount],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveTx });

  const openTx = await walletClient.writeContract({
    account,
    chain,
    address: FACTORY_ADDRESS,
    abi: SESSION_FACTORY_ABI,
    functionName: "openSession",
    args: [recipient, depositAmount, agentYieldShare, deadlineAt],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: openTx });

  const logs = parseEventLogs({
    abi: SESSION_FACTORY_ABI,
    eventName: "SessionOpened",
    logs: receipt.logs,
  });

  if (logs.length === 0) throw new Error("SessionOpened event not found in receipt");

  const ev = logs[0].args;

  return ok({
    sessionId: ev.sessionId,
    escrow: ev.escrow,
    agent: ev.agent,
    recipient: ev.recipient,
    deposit: ev.deposit,
    agentYieldShare: ev.agentYieldShare,
    deadlineAt: ev.deadlineAt,
    txHash: openTx,
  });
}

// ── tool: sign_voucher ────────────────────────────────────────────────────────

async function signVoucher(args: {
  session_id: string;
  total_authorized: string;
  nonce: number;
}) {
  const sessionId = args.session_id as Hash;
  const totalAuthorized = BigInt(args.total_authorized);
  const nonce = BigInt(args.nonce);

  const escrow = await resolveEscrow(sessionId);

  const sig = await walletClient.signTypedData({
    account,
    domain: {
      name: "SolvoPay",
      version: "1",
      chainId: CHAIN_ID,
      verifyingContract: escrow,
    },
    types: VOUCHER_TYPES,
    primaryType: "Voucher",
    message: { sessionId, totalAuthorized, nonce },
  });

  return ok({ sessionId, escrow, totalAuthorized, nonce, sig });
}

// ── tool: get_session ─────────────────────────────────────────────────────────

async function getSession(args: { session_id: string }) {
  const sessionId = args.session_id as Hash;
  const escrow = await resolveEscrow(sessionId);

  const [status, deposit, agentYieldShare, deadlineAt, agent, recipient, highestNonce, aUsdc] =
    await Promise.all([
      publicClient.readContract({ address: escrow, abi: SESSION_ESCROW_ABI, functionName: "status" }),
      publicClient.readContract({ address: escrow, abi: SESSION_ESCROW_ABI, functionName: "deposit" }),
      publicClient.readContract({ address: escrow, abi: SESSION_ESCROW_ABI, functionName: "agentYieldShare" }),
      publicClient.readContract({ address: escrow, abi: SESSION_ESCROW_ABI, functionName: "deadlineAt" }),
      publicClient.readContract({ address: escrow, abi: SESSION_ESCROW_ABI, functionName: "agent" }),
      publicClient.readContract({ address: escrow, abi: SESSION_ESCROW_ABI, functionName: "recipient" }),
      publicClient.readContract({ address: escrow, abi: SESSION_ESCROW_ABI, functionName: "highestNonce" }),
      publicClient.readContract({ address: escrow, abi: SESSION_ESCROW_ABI, functionName: "aUsdc" }),
    ]);

  const aTokenBalance = await publicClient.readContract({
    address: aUsdc as Address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [escrow],
  }) as bigint;

  const depositBig = deposit as bigint;
  const yieldAccrued = aTokenBalance > depositBig ? aTokenBalance - depositBig : 0n;

  return ok({
    sessionId,
    escrow,
    agent,
    recipient,
    deposit,
    agentYieldShare,
    deadlineAt,
    status: STATUS_NAMES[status as number] ?? "UNKNOWN",
    highestNonce,
    aTokenBalance,
    yieldAccrued,
  });
}

// ── tool: close_session ───────────────────────────────────────────────────────

async function closeSession(args: {
  session_id: string;
  total_authorized?: string;
}) {
  const sessionId = args.session_id as Hash;
  const escrow = await resolveEscrow(sessionId);

  const [status, deposit, highestNonce, deadlineAt] = await Promise.all([
    publicClient.readContract({ address: escrow, abi: SESSION_ESCROW_ABI, functionName: "status" }),
    publicClient.readContract({ address: escrow, abi: SESSION_ESCROW_ABI, functionName: "deposit" }),
    publicClient.readContract({ address: escrow, abi: SESSION_ESCROW_ABI, functionName: "highestNonce" }),
    publicClient.readContract({ address: escrow, abi: SESSION_ESCROW_ABI, functionName: "deadlineAt" }),
  ]);

  if (status !== 0) {
    throw new Error(
      `Session not active (status: ${STATUS_NAMES[status as number] ?? status})`
    );
  }

  const now = BigInt(Math.floor(Date.now() / 1000));
  const refundAvailableAt = (deadlineAt as bigint) + BigInt(7 * 24 * 3600);

  if (now >= refundAvailableAt) {
    const hash = await walletClient.writeContract({
      account,
      chain,
      address: escrow,
      abi: SESSION_ESCROW_ABI,
      functionName: "refund",
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return ok({ txHash: hash, action: "refund" });
  }

  const totalAuthorized = args.total_authorized
    ? BigInt(args.total_authorized)
    : (deposit as bigint);
  const nonce = (highestNonce as bigint) + 1n;

  const sig = await walletClient.signTypedData({
    account,
    domain: {
      name: "SolvoPay",
      version: '1',
      chainId: CHAIN_ID,
      verifyingContract: escrow,
    },
    types: VOUCHER_TYPES,
    primaryType: "Voucher",
    message: { sessionId, totalAuthorized, nonce },
  });

  const hash = await walletClient.writeContract({
    account,
    chain,
    address: escrow,
    abi: SESSION_ESCROW_ABI,
    functionName: "settle",
    args: [{ sessionId, totalAuthorized, nonce }, sig],
  });
  await publicClient.waitForTransactionReceipt({ hash });

  return ok({ txHash: hash, action: "settle", totalAuthorized: totalAuthorized.toString() });
}

// ── MCP server ────────────────────────────────────────────────────────────────

const server = new Server(
  { name: "solvopay", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "open_session",
      description:
        "Open a SolvoPay payment session onchain. Approves USDC and calls the SessionFactory. Returns sessionId, escrow address, and txHash.",
      inputSchema: {
        type: "object",
        properties: {
          service_provider: {
            type: "string",
            description: "Address of the service provider (recipient of payment).",
          },
          deposit_amount: {
            type: "string",
            description: "USDC deposit in base units (6 decimals). E.g. '1000000' = 1 USDC.",
          },
          agent_yield_share: {
            type: "number",
            description: "Percentage of Aave yield that goes to the agent (0–100).",
          },
          deadline_at: {
            type: "number",
            description:
              "Unix timestamp for session deadline. Defaults to 1 hour from now.",
          },
        },
        required: ["service_provider", "deposit_amount", "agent_yield_share"],
      },
    },
    {
      name: "sign_voucher",
      description:
        "Sign an EIP-712 payment voucher authorizing a cumulative spend. Returns the voucher and signature — does not submit onchain.",
      inputSchema: {
        type: "object",
        properties: {
          session_id: {
            type: "string",
            description: "Session ID (bytes32 hex) from open_session.",
          },
          total_authorized: {
            type: "string",
            description:
              "Cumulative USDC amount authorized so far, in base units. Must be >= previous voucher amount.",
          },
          nonce: {
            type: "number",
            description: "Monotonically increasing nonce. Must be > highestNonce on the escrow.",
          },
        },
        required: ["session_id", "total_authorized", "nonce"],
      },
    },
    {
      name: "get_session",
      description:
        "Read current state of a session from chain: deposit, yield accrued, status, agent/recipient addresses, deadline, and highest signed nonce.",
      inputSchema: {
        type: "object",
        properties: {
          session_id: {
            type: "string",
            description: "Session ID (bytes32 hex) from open_session.",
          },
        },
        required: ["session_id"],
      },
    },
    {
      name: "close_session",
      description:
        "Settle or refund a session onchain. If the session is past its deadline + 7-day grace period, calls refund() (agent gets full deposit back). Otherwise signs a final voucher and calls settle() — the wallet must be the recipient for settle to succeed.",
      inputSchema: {
        type: "object",
        properties: {
          session_id: {
            type: "string",
            description: "Session ID (bytes32 hex) from open_session.",
          },
          total_authorized: {
            type: "string",
            description:
              "Final USDC amount to pay the recipient, in base units. Defaults to full deposit if omitted.",
          },
        },
        required: ["session_id"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case "open_session":
        return await openSession(args as Parameters<typeof openSession>[0]);
      case "sign_voucher":
        return await signVoucher(args as Parameters<typeof signVoucher>[0]);
      case "get_session":
        return await getSession(args as Parameters<typeof getSession>[0]);
      case "close_session":
        return await closeSession(args as Parameters<typeof closeSession>[0]);
      default:
        return toolError(`Unknown tool: ${name}`);
    }
  } catch (e) {
    return toolError(e instanceof Error ? e.message : String(e));
  }
});

// ── start ─────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
