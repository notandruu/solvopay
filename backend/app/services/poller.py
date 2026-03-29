from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select
from app.db import SessionLocal
from app.models import Session, SessionStatus
from app.services.onchain import get_web3, get_factory_events_from_blocks

POLL_BLOCK_LOOKBACK = 20

scheduler = AsyncIOScheduler()


async def poll_chain():
    w3 = get_web3()
    try:
        latest = await w3.eth.block_number
    except Exception:
        return

    from_block = max(0, latest - POLL_BLOCK_LOOKBACK)

    try:
        events = await get_factory_events_from_blocks(from_block, latest)
    except Exception:
        return

    if not events:
        return

    async with SessionLocal() as db:
        for ev in events:
            session_id = "0x" + ev["sessionId"].hex()
            existing = await db.get(Session, session_id)
            if existing:
                continue

            session = Session(
                id=session_id,
                escrow_address=ev["escrow"],
                agent=ev["agent"],
                recipient=ev["recipient"],
                deposit=str(ev["deposit"]),
                agent_yield_share=int(ev["agentYieldShare"]),
                status=SessionStatus.ACTIVE,
                deadline_at=str(ev["deadlineAt"]),
            )
            db.add(session)

        await db.commit()


def start_poller():
    scheduler.add_job(poll_chain, "interval", seconds=60, id="chain_poller")
    scheduler.start()


def stop_poller():
    scheduler.shutdown(wait=False)
