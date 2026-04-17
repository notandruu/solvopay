# SolvoPay MCP Server

MCP server that exposes SolvoPay onchain payment sessions to any AI agent. Wraps the `SessionFactory` and `SessionEscrow` contracts over stdio transport.

## Tools

| Tool | Description |
|------|-------------|
| `open_session` | Approves USDC + opens a payment session onchain. Returns `sessionId`, escrow address, and `txHash`. |
| `sign_voucher` | Signs an EIP-712 voucher authorizing a cumulative spend. Offchain only — nothing submitted. |
| `get_session` | Reads live session state from chain: deposit, yield accrued, status, nonce, addresses. |
| `close_session` | Settles or refunds the session. Calls `refund()` if past deadline + 7-day grace; otherwise signs a final voucher and calls `settle()`. |

> **Note on `close_session`:** `settle()` on the escrow requires `msg.sender == recipient`. Use `close_session` when the configured wallet is the service provider, or after the refund window opens.

## Environment variables

| Variable | Description |
|----------|-------------|
| `RPC_URL` | JSON-RPC endpoint for the target chain |
| `PRIVATE_KEY` | Deployer/agent private key (with or without `0x` prefix) |
| `SESSION_FACTORY_ADDRESS` | Deployed `SessionFactory` contract address |
| `CHAIN_ID` | EVM chain ID as an integer |

## Build

```bash
cd mcp
npm install
npm run build
```

The compiled entry point is `dist/index.js`.

## Connect to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows).

### Base Mainnet

```json
{
  "mcpServers": {
    "solvopay": {
      "command": "node",
      "args": ["/absolute/path/to/solvopay/mcp/dist/index.js"],
      "env": {
        "RPC_URL": "https://mainnet.base.org",
        "PRIVATE_KEY": "0xYOUR_PRIVATE_KEY",
        "SESSION_FACTORY_ADDRESS": "0xYOUR_FACTORY_ADDRESS",
        "CHAIN_ID": "8453"
      }
    }
  }
}
```

### Base Sepolia (testnet)

```json
{
  "mcpServers": {
    "solvopay": {
      "command": "node",
      "args": ["/absolute/path/to/solvopay/mcp/dist/index.js"],
      "env": {
        "RPC_URL": "https://sepolia.base.org",
        "PRIVATE_KEY": "0xYOUR_PRIVATE_KEY",
        "SESSION_FACTORY_ADDRESS": "0x5E6bb045A958B7613A79F2E9DC0918519F25290c",
        "CHAIN_ID": "84532"
      }
    }
  }
}
```

Restart Claude Desktop after editing the config.

## Connect to Claude Code

Use `claude mcp add` to register the server. Run once per environment.

### Base Mainnet

```bash
claude mcp add solvopay \
  -e RPC_URL=https://mainnet.base.org \
  -e PRIVATE_KEY=0xYOUR_PRIVATE_KEY \
  -e SESSION_FACTORY_ADDRESS=0xYOUR_FACTORY_ADDRESS \
  -e CHAIN_ID=8453 \
  -- node /absolute/path/to/solvopay/mcp/dist/index.js
```

### Base Sepolia (testnet)

```bash
claude mcp add solvopay \
  -e RPC_URL=https://sepolia.base.org \
  -e PRIVATE_KEY=0xYOUR_PRIVATE_KEY \
  -e SESSION_FACTORY_ADDRESS=0x5E6bb045A958B7613A79F2E9DC0918519F25290c \
  -e CHAIN_ID=84532 \
  -- node /absolute/path/to/solvopay/mcp/dist/index.js
```

To verify it's registered: `claude mcp list`

To remove it: `claude mcp remove solvopay`

## Example agent usage

```
Open a session with service provider 0xABC... for 5 USDC, 50% yield share, 24h deadline.

Sign a voucher for session 0x123... authorizing 2 USDC (2000000 base units), nonce 1.

Get the current state of session 0x123...

Close session 0x123... paying out 3 USDC to the provider.
```

## Security

- Never commit your `PRIVATE_KEY`. Pass it only via environment variables.
- The MCP server has full signing authority over the configured wallet. Use a dedicated agent key with limited funds.
- `open_session` automatically approves only the exact deposit amount — no unlimited approvals.
