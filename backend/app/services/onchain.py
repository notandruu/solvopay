from web3 import AsyncWeb3
from web3.middleware import ExtraDataToPOAMiddleware
from app.config import settings

SESSION_FACTORY_ABI = [
    {
        "type": "function",
        "name": "openSession",
        "inputs": [
            {"name": "recipient", "type": "address"},
            {"name": "depositAmount", "type": "uint256"},
            {"name": "agentYieldShare", "type": "uint256"},
            {"name": "deadlineAt", "type": "uint256"},
        ],
        "outputs": [
            {"name": "sessionId", "type": "bytes32"},
            {"name": "escrow", "type": "address"},
        ],
        "stateMutability": "nonpayable",
    },
    {
        "type": "event",
        "name": "SessionOpened",
        "inputs": [
            {"name": "sessionId", "type": "bytes32", "indexed": True},
            {"name": "escrow", "type": "address", "indexed": True},
            {"name": "agent", "type": "address", "indexed": True},
            {"name": "recipient", "type": "address", "indexed": False},
            {"name": "deposit", "type": "uint256", "indexed": False},
            {"name": "agentYieldShare", "type": "uint256", "indexed": False},
            {"name": "deadlineAt", "type": "uint256", "indexed": False},
        ],
    },
]

SESSION_ESCROW_ABI = [
    {
        "type": "function",
        "name": "settle",
        "inputs": [
            {
                "name": "voucher",
                "type": "tuple",
                "components": [
                    {"name": "sessionId", "type": "bytes32"},
                    {"name": "totalAuthorized", "type": "uint256"},
                    {"name": "nonce", "type": "uint256"},
                ],
            },
            {"name": "sig", "type": "bytes"},
        ],
        "outputs": [],
        "stateMutability": "nonpayable",
    },
    {
        "type": "function",
        "name": "status",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint8"}],
        "stateMutability": "view",
    },
    {
        "type": "event",
        "name": "Settled",
        "inputs": [
            {"name": "recipientAmount", "type": "uint256", "indexed": False},
            {"name": "agentAmount", "type": "uint256", "indexed": False},
            {"name": "totalYield", "type": "uint256", "indexed": False},
        ],
    },
    {
        "type": "event",
        "name": "Refunded",
        "inputs": [{"name": "agentAmount", "type": "uint256", "indexed": False}],
    },
]


def get_web3() -> AsyncWeb3:
    w3 = AsyncWeb3(AsyncWeb3.AsyncHTTPProvider(settings.alchemy_base_mainnet_rpc))
    return w3


async def submit_settle(
    escrow_address: str,
    session_id: str,
    total_authorized: int,
    nonce: int,
    sig: str,
) -> str:
    w3 = get_web3()
    account = w3.eth.account.from_key(settings.backend_eoa_private_key)
    contract = w3.eth.contract(
        address=AsyncWeb3.to_checksum_address(escrow_address),
        abi=SESSION_ESCROW_ABI,
    )

    session_id_bytes = bytes.fromhex(session_id.removeprefix("0x"))
    sig_bytes = bytes.fromhex(sig.removeprefix("0x"))

    voucher = (session_id_bytes, total_authorized, nonce)

    nonce_val = await w3.eth.get_transaction_count(account.address)
    tx = await contract.functions.settle(voucher, sig_bytes).build_transaction(
        {
            "from": account.address,
            "nonce": nonce_val,
        }
    )
    signed = account.sign_transaction(tx)
    tx_hash = await w3.eth.send_raw_transaction(signed.raw_transaction)
    return tx_hash.hex()


async def get_factory_events_from_blocks(
    from_block: int, to_block: int
) -> list[dict]:
    w3 = get_web3()
    contract = w3.eth.contract(
        address=AsyncWeb3.to_checksum_address(settings.session_factory_address),
        abi=SESSION_FACTORY_ABI,
    )
    events = await contract.events.SessionOpened().get_logs(
        fromBlock=from_block, toBlock=to_block
    )
    return [dict(e["args"]) for e in events]
