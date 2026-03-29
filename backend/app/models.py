import enum
from datetime import datetime, timezone
from sqlalchemy import String, Numeric, Enum, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base


class SessionStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    SETTLED = "SETTLED"
    REFUNDED = "REFUNDED"


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(66), primary_key=True)
    escrow_address: Mapped[str] = mapped_column(String(42), nullable=False)
    agent: Mapped[str] = mapped_column(String(42), nullable=False)
    recipient: Mapped[str] = mapped_column(String(42), nullable=False)
    deposit: Mapped[str] = mapped_column(Numeric(30, 0), nullable=False)
    agent_yield_share: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus), default=SessionStatus.ACTIVE, nullable=False
    )
    deadline_at: Mapped[int] = mapped_column(Numeric(20, 0), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    vouchers: Mapped[list["VoucherEvent"]] = relationship(
        "VoucherEvent", back_populates="session", order_by="VoucherEvent.nonce"
    )


class VoucherEvent(Base):
    __tablename__ = "voucher_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(
        String(66), ForeignKey("sessions.id"), nullable=False
    )
    total_authorized: Mapped[str] = mapped_column(Numeric(30, 0), nullable=False)
    nonce: Mapped[int] = mapped_column(Numeric(20, 0), nullable=False)
    sig: Mapped[str] = mapped_column(String(132), nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    session: Mapped["Session"] = relationship("Session", back_populates="vouchers")
