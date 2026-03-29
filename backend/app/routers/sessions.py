from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.models import Session, VoucherEvent, SessionStatus
from app.schemas import SessionCreate, SessionResponse, VoucherSubmit, VoucherResponse
from app.services.onchain import submit_settle

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse, status_code=201)
async def create_session(body: SessionCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.get(Session, body.session_id)
    if existing:
        raise HTTPException(status_code=409, detail="session exists")

    session = Session(
        id=body.session_id,
        escrow_address=body.escrow_address,
        agent=body.agent,
        recipient=body.recipient,
        deposit=body.deposit,
        agent_yield_share=body.agent_yield_share,
        status=SessionStatus.ACTIVE,
        deadline_at=body.deadline_at,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    session = await db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="session not found")
    return session


@router.post("/{session_id}/vouchers", response_model=VoucherResponse, status_code=201)
async def submit_voucher(
    session_id: str, body: VoucherSubmit, db: AsyncSession = Depends(get_db)
):
    session = await db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="session not found")
    if session.status != SessionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="session not active")

    voucher = VoucherEvent(
        session_id=session_id,
        total_authorized=body.total_authorized,
        nonce=body.nonce,
        sig=body.sig,
    )
    db.add(voucher)
    await db.commit()
    await db.refresh(voucher)
    return voucher


@router.post("/{session_id}/settle")
async def settle_session(session_id: str, db: AsyncSession = Depends(get_db)):
    session = await db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="session not found")
    if session.status != SessionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="session not active")

    result = await db.execute(
        select(VoucherEvent)
        .where(VoucherEvent.session_id == session_id)
        .order_by(VoucherEvent.nonce.desc())
        .limit(1)
    )
    latest_voucher = result.scalar_one_or_none()
    if not latest_voucher:
        raise HTTPException(status_code=400, detail="no vouchers submitted")

    tx_hash = await submit_settle(
        escrow_address=session.escrow_address,
        session_id=session_id,
        total_authorized=int(latest_voucher.total_authorized),
        nonce=int(latest_voucher.nonce),
        sig=latest_voucher.sig,
    )

    session.status = SessionStatus.SETTLED
    await db.commit()

    return {"tx_hash": tx_hash}
