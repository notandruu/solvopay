import hmac
import hashlib
from eth_hash.auto import keccak
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.db import get_db
from app.models import Session, SessionStatus

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def verify_alchemy_signature(body: bytes, signature: str) -> bool:
    expected = hmac.new(
        settings.alchemy_webhook_signing_key.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/alchemy")
async def alchemy_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.body()
    sig = request.headers.get("X-Alchemy-Signature", "")

    if not verify_alchemy_signature(body, sig):
        raise HTTPException(status_code=401, detail="invalid signature")

    payload = await request.json()
    event_type = payload.get("type")

    if event_type != "ADDRESS_ACTIVITY":
        return {"ok": True}

    activity = payload.get("event", {}).get("activity", [])

    for item in activity:
        log = item.get("log", {})
        topics = log.get("topics", [])
        if not topics:
            continue

        data = log.get("data", "")

        if _is_settled_event(topics, data):
            escrow = item.get("toAddress", "").lower()
            session = await _get_session_by_escrow(db, escrow)
            if session and session.status == SessionStatus.ACTIVE:
                session.status = SessionStatus.SETTLED
                await db.commit()

        elif _is_refunded_event(topics, data):
            escrow = item.get("toAddress", "").lower()
            session = await _get_session_by_escrow(db, escrow)
            if session and session.status == SessionStatus.ACTIVE:
                session.status = SessionStatus.REFUNDED
                await db.commit()

    return {"ok": True}


SETTLED_SIG = "0x" + keccak(b"Settled(uint256,uint256,uint256)").hex()
REFUNDED_SIG = "0x" + keccak(b"Refunded(uint256)").hex()


def _is_settled_event(topics: list, data: str) -> bool:
    return bool(topics) and topics[0].lower() == SETTLED_SIG.lower()


def _is_refunded_event(topics: list, data: str) -> bool:
    return bool(topics) and topics[0].lower() == REFUNDED_SIG.lower()


async def _get_session_by_escrow(db: AsyncSession, escrow: str):
    from sqlalchemy import select
    result = await db.execute(
        select(Session).where(Session.escrow_address.ilike(escrow))
    )
    return result.scalar_one_or_none()
