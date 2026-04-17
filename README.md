# SolvoPay — On-Chain Payment Sessions for AI Agents

AI agents can't use credit cards. SolvoPay gives them a payment rail that works at machine speed.

> Lock funds. Stream vouchers. Settle on-chain. Earn yield while you wait.

---

## What is this

AI agents need to pay for things — API calls, tool invocations, compute, data fetches. Charging a card per action doesn't work at scale. Transaction fees dwarf payment value. Subscriptions don't map to per-task workloads.

SolvoPay implements a payment session protocol for autonomous agents using on-chain escrow and off-chain signed vouchers. The agent deposits USDC once at session start. Every action generates a signed voucher off-chain — no gas, no latency, no block confirmation. At session end, the final voucher settles on-chain and unspent funds return to the agent automatically.

The locked deposit earns yield via Aave V3 on Base during the session. Idle capital never sits still.

---

## How it works

```
1. Agent opens a session
   └── Deposits USDC into SessionEscrow via SessionFactory
   └── USDC immediately deposited into Aave V3 → aUSDC starts accruing

2. Agent performs actions
   └── Each action: agent signs a voucher off-chain (no gas)
   └── Voucher = { sessionId, totalAuthorized, nonce, agentSig }
   └── Service provider verifies signature, delivers service

3. Session ends
   └── Service provider submits final voucher on-chain
   └── Contract verifies: sig valid, totalAuthorized ≤ deposit, nonce is latest
   └── Recipient receives: authorized amount + their yield share
   └── Agent receives: unspent deposit + their yield share
   └── aUSDC redeemed via Aave, USDC distributed
```

---

## Architecture

```
solvopay/
  contracts/        Solidity 0.8.24, Hardhat
    SessionFactory  Deploys escrows, handles USDC transfer + Aave deposit
    SessionEscrow   EIP-712 voucher verification, yield accrual, settlement
    VoucherLib      Typed struct + TYPEHASH for EIP-712

  backend/          Python FastAPI
    sessions        Session state + voucher ingestion + settlement triggers
    webhooks        Alchemy ADDRESS_ACTIVITY webhook handler
    poller          60s block poller fallback (syncs DB from chain)
    Dockerfile      Railway-ready

  frontend/         Next.js 16, wagmi v2, RainbowKit, Tailwind
    /               Landing page
    /dashboard      Open sessions, live yield display per escrow

  sdk/              TypeScript, viem v2
    SolvoPayClient  Open sessions, sign vouchers, close sessions
    VoucherSigner   EIP-712 signing — chain-agnostic

  mcp/              MCP server (stdio transport)
    open_session    Open payment session onchain
    sign_voucher    Sign EIP-712 voucher offchain
    get_session     Read live session state from chain
    close_session   Settle or refund session onchain
```

---

## Contracts

### Base Sepolia (testnet)

| Contract | Address |
|---|---|
| SessionFactory | `0x5E6bb045A958B7613A79F2E9DC0918519F25290c` |
| USDC | `0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f` |
| Aave V3 Pool | `0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27` |
| aUSDC | `0x10F1A9D11CDf50041f3f8cB7191CBE2f31750ACC` |

### Base Mainnet

| Contract | Address |
|---|---|
| SessionFactory | _not yet deployed — enable Base Mainnet in Alchemy dashboard first_ |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Aave V3 Pool | `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5` |
| aUSDC | `0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB` |

---

## SDK usage

```typescript
import { SolvoPayClient } from '@solvopay/sdk'
import { parseUnits } from 'viem'

const client = new SolvoPayClient({
  rpcUrl: process.env.RPC_URL!,
  agentPrivateKey: process.env.AGENT_PRIVATE_KEY! as `0x${string}`,
  factoryAddress: process.env.SESSION_FACTORY_ADDRESS! as `0x${string}`,
  chainId: 84532, // Base Sepolia; omit for Base mainnet
})

// Open a session — approve + deposit in one call
const session = await client.openSession({
  serviceProvider: '0xServiceProviderAddress',
  depositAmount: parseUnits('10', 6), // 10 USDC
  agentYieldShare: 80,               // agent keeps 80% of yield
})
// → { sessionId, escrow, agent, recipient, deposit, txHash }

// Sign a voucher authorizing $0.05 total so far
const voucher = await client.signVoucher(
  {
    sessionId: session.sessionId,
    totalAuthorized: parseUnits('0.05', 6),
    nonce: 1n,
  },
  session.escrow
)
// → { sessionId, totalAuthorized, nonce, sig }

// Send voucher to service provider off-chain
await fetch('https://api.service.com/voucher', {
  method: 'POST',
  body: JSON.stringify(voucher),
})

// Settle session via backend
await client.closeSession(session.sessionId)
```

---

## MCP server

Expose SolvoPay tools to any MCP-compatible AI agent (Claude Desktop, Claude Code, etc.).

```bash
cd mcp
npm install && npm run build
```

### Connect to Claude Code

```bash
# Base Sepolia
claude mcp add solvopay \
  -e RPC_URL=https://sepolia.base.org \
  -e PRIVATE_KEY=0xYOUR_KEY \
  -e SESSION_FACTORY_ADDRESS=0x5E6bb045A958B7613A79F2E9DC0918519F25290c \
  -e CHAIN_ID=84532 \
  -- node /path/to/solvopay/mcp/dist/index.js

# Base mainnet
claude mcp add solvopay \
  -e RPC_URL=https://mainnet.base.org \
  -e PRIVATE_KEY=0xYOUR_KEY \
  -e SESSION_FACTORY_ADDRESS=0xYOUR_MAINNET_FACTORY \
  -e CHAIN_ID=8453 \
  -- node /path/to/solvopay/mcp/dist/index.js
```

### Connect to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "solvopay": {
      "command": "node",
      "args": ["/path/to/solvopay/mcp/dist/index.js"],
      "env": {
        "RPC_URL": "https://sepolia.base.org",
        "PRIVATE_KEY": "0xYOUR_KEY",
        "SESSION_FACTORY_ADDRESS": "0x5E6bb045A958B7613A79F2E9DC0918519F25290c",
        "CHAIN_ID": "84532"
      }
    }
  }
}
```

Tools exposed: `open_session`, `sign_voucher`, `get_session`, `close_session`

---

## Local development

### Contracts

```bash
cd contracts
cp .env.example .env        # fill in Alchemy API key + deployer key
npm install
npx hardhat test            # 15 tests, self-contained mocks, no fork needed
npx hardhat run scripts/deploy.ts --network base-sepolia   # deploy to testnet
npx hardhat run scripts/deploy.ts --network base           # deploy to mainnet
```

> **Mainnet deploy:** You must enable "Base Mainnet" under Networks in your Alchemy app dashboard before deploying.

### Backend

```bash
cd backend
cp .env.example .env        # fill in DATABASE_URL, Alchemy RPC, private key, factory address
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

**Railway deploy:**
1. Create a new Railway project, link to the `backend/` directory
2. Add a Postgres plugin — Railway injects `DATABASE_URL` automatically
3. Set the remaining env vars in Railway's Variables tab
4. Deploy — `railway.toml` handles the build + migration + start

### Frontend

```bash
cd frontend
cp .env.local.example .env.local    # fill in WalletConnect project ID + factory address
npm install
npm run dev
```

**Vercel deploy:**
1. Import the repo, set root directory to `frontend/`
2. Add env vars from `.env.local.example` in the Vercel dashboard
3. Deploy

### MCP server

```bash
cd mcp
npm install && npm run build
# then connect via claude mcp add (see above)
```

---

## Alchemy setup

1. Create an app at [dashboard.alchemy.com](https://dashboard.alchemy.com)
2. Under **Networks**, enable **Base Mainnet** (for production) and **Base Sepolia** (for testnet)
3. Copy the API key into each package's `.env`
4. For the backend webhook: create an **ADDRESS_ACTIVITY** webhook, add escrow addresses as they're deployed, copy the signing key into `ALCHEMY_WEBHOOK_SIGNING_KEY`

---

## Deployment checklist

- [ ] Enable Base Mainnet in Alchemy app
- [ ] Deploy `SessionFactory` to Base mainnet: `npx hardhat run scripts/deploy.ts --network base`
- [ ] Set `NEXT_PUBLIC_FACTORY_ADDRESS` in Vercel with mainnet address
- [ ] Set `NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` in Vercel
- [ ] Set `SESSION_FACTORY_ADDRESS` in Railway backend
- [ ] Register Alchemy `ADDRESS_ACTIVITY` webhook for the factory address
- [ ] Set `ALCHEMY_WEBHOOK_SIGNING_KEY` in Railway
- [ ] Get WalletConnect project ID and set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

---

## Tech stack

| Layer | Stack |
|---|---|
| Chain | Base (mainnet + Sepolia) |
| Contracts | Solidity 0.8.24, OpenZeppelin v5, Hardhat 2.x |
| Yield | Aave V3 (`IPool.supply` / `IPool.withdraw`) |
| Signatures | EIP-712 typed data, ECDSA recovery |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2 async, asyncpg, web3.py 7, APScheduler |
| Frontend | Next.js 16, TypeScript, wagmi v2, viem, RainbowKit, Tailwind CSS |
| MCP | `@modelcontextprotocol/sdk`, stdio transport |
| Infra | Alchemy (RPC + webhooks), Railway (backend), Vercel (frontend) |
