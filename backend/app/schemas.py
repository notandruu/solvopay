from datetime import datetime
from pydantic import BaseModel
from app.models import SessionStatus


class SessionCreate(BaseModel):
    session_id: str
    escrow_address: str
    agent: str
    recipient: str
    deposit: str
    agent_yield_share: int
    deadline_at: str


class VoucherSubmit(BaseModel):
    session_id: str
    total_authorized: str
    nonce: int
    sig: str


class VoucherResponse(BaseModel):
    id: int
    session_id: str
    total_authorized: str
    nonce: int
    sig: str
    submitted_at: datetime

    class Config:
        from_attributes = True


class SessionResponse(BaseModel):
    id: str
    escrow_address: str
    agent: str
    recipient: str
    deposit: str
    agent_yield_share: int
    status: SessionStatus
    deadline_at: str
    created_at: datetime
    vouchers: list[VoucherResponse] = []

    class Config:
        from_attributes = True
