# SolvoPay — On-Chain Payment Sessions for AI Agents
AI agents can't use credit cards. SolvoPay gives them a payment rail that works at machine speed.

> Lock funds. Stream vouchers. Settle on-chain. Earn yield while you wait.

Live: [solvopay.xyz](https://solvopay.xyz)

---

## What is this

AI agents need to pay for things — API calls, tool invocations, compute, data fetches. Charging a card per action doesn't work. Transaction fees dwarf payment value at any meaningful scale. Subscriptions don't map to per-task workloads.

SolvoPay implements a payment session protocol for autonomous agents using on-chain escrow and off-chain signed vouchers. The agent deposits USDC once at session start. Every action it takes generates a signed voucher off-chain — no gas, no latency, no block confirmation. At session end, the final voucher settles on-chain and unspent funds return to the agent automatically.

The locked deposit earns yield via Aave V3 on Base during the session. Idle capital never sits still.

This is the escrow primitive that makes machine payments work at scale.

---

## How it works

### Session lifecycle

```
1. Agent opens a session
   └── Deposits USDC into SessionEscrow contract
   └── USDC immediately deposits into Aave V3 → aUSDC accrues

2. Agent performs actions
   └── Each action: agent signs a voucher off-chain
   └── Voucher = { sessionId, totalAuthorized, nonce, agentSig }
   └── Service provider receives voucher, verifies signature, delivers service
   └── No gas. No latency. No chain interaction.

3. Session ends
   └── Service provider submits final voucher on-chain
   └── Contract verifies: sig valid, totalAuthorized ≤ deposit, nonce is latest
   └── Recipient receives: authorized amount + their yield share
   └── Agent receives: unspent deposit + their yield share
   └── aUSDC redeemed via Aave, USDC distributed
```

### The voucher primitive

A voucher is a cryptographically signed message that says "I authorize X total so far." It's submitted with each unit of service consumed. The contract enforces a simple invariant: the service provider can never extract more than the agent's last signed voucher authorized, because that voucher is verified on-chain at settlement.

This is a state channel. The session is the channel. The escrow is the lockbox. The voucher is the signed note.

### Yield during sessions

Agents often open long-running sessions — minutes to hours of continuous work. The deposited USDC earns Aave V3 yield the entire time. Yield splits between agent and service provider at settlement, configurable per session. No idle capital.

---

## Architecture

```
agent-pay/
  contracts/                Solidity (Hardhat, Base mainnet fork tests)
    SessionFactory          Deploys sessions, handles USDC transfer + Aave deposit
    SessionEscrow           Core: voucher verification, yield accrual, settlement logic
    VoucherLib              EIP-712 typed signature scheme for vouchers

  backend/                  Python FastAPI
    session_manager         Session state, voucher ingestion, settlement triggers
    alchemy_webhooks        Real-time event ingestion (SessionOpened, Settled, Refunded)
    onchain_poller          60s fallback — scans recent blocks, syncs DB state
    postgres + sqlalchemy   Session + voucher event storage

  frontend/                 Next.js 14 App Router
    wagmi v2 + viem         Onchain reads/writes, live yield polling per block
    RainbowKit              Wallet connection
    Tailwind CSS            UI

  sdk/                      TypeScript
    solvoPayClient          Open sessions, sign vouchers, close sessions
    VoucherSigner           EIP-712 signing utility for agent wallets
```

---

## Tech stack

| Layer | Stack |
|---|---|
| Chain | Base (mainnet + Sepolia) |
| Contracts | Solidity 0.8.20, OpenZeppelin v5, Hardhat |
| Yield | Aave V3 (`IPool.supply` / `IPool.withdraw`, liquidity index math) |
| Signatures | EIP-712 typed data, ECDSA recovery |
| Backend | Python, FastAPI, SQLAlchemy (async), asyncpg, web3.py |
| Frontend | Next.js 14, TypeScript, wagmi v2, viem, RainbowKit, Tailwind CSS |
| Infra | Alchemy (RPC + webhooks), Vercel (frontend), Postgres |

---

## Contracts (Base mainnet)

| Contract | Address |
|---|---|
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Aave V3 Pool | `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5` |
| aUSDC | `0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB` |

---

## SDK usage

```typescript
import { SolvoPayClient } from '@solvopay/sdk'

const client = new SolvoPayClient({
  rpcUrl: process.env.BASE_RPC_URL,
  agentPrivateKey: process.env.AGENT_PRIVATE_KEY,
})

// open a session with 10 USDC deposit, 80/20 yield split
const session = await client.openSession({
  serviceProvider: '0xServiceProviderAddress',
  depositAmount: parseUnits('10', 6),
  agentYieldShare: 80,
})

// sign a voucher authorizing $0.002 total so far
const voucher = await client.signVoucher({
  sessionId: session.id,
  totalAuthorized: parseUnits('0.002', 6),
})

// send voucher to service provider off-chain
await fetch('https://api.yourservice.com/voucher', {
  method: 'POST',
  body: JSON.stringify(voucher),
})

// close session — service provider submits final voucher on-chain
await client.closeSession(session.id)
```

---

## Distributed systems design

The payment session maps directly onto the intent/settlement separation problem in payments infrastructure:

- **intent**: the voucher. off-chain, signed, stateful, cheap.
- **settlement**: the on-chain transaction. final, expensive, happens once.

Every intermediate voucher is an updated statement of intent. Only the last one costs gas. This is how you get exactly-once payment semantics on top of a rail that doesn't promise it natively.

The backend is not a single point of failure:

- agent can self-refund 7 days after session deadline without backend
- service provider can self-settle 7 days after final voucher timestamp without backend
- aave reserve pause: `withdraw()` failures caught, session stays `ACTIVE`, retry on next poll

---

## Local development

### Contracts

```bash
cd contracts
cp .env.example .env  # add ALCHEMY_BASE_MAINNET_RPC
npm install
npx hardhat test      # forks Base mainnet
```

### Backend

```bash
cd backend
cp .env.example .env  # add DATABASE_URL, ALCHEMY_API_KEY, BACKEND_EOA_PRIVATE_KEY
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
cp .env.example .env.local  # add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID, NEXT_PUBLIC_ALCHEMY_API_KEY
npm install
npm run dev
```

---

## Related

- [BlockVault](https://blockvault-io.vercel.app) — programmable yield-bearing escrow on Base, the escrow primitive this builds on
