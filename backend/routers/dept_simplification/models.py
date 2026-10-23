from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .database import Base


def _utcnow():
    return datetime.now(timezone.utc)


class Trip(Base):
    """一個獨立的帳本（例如「日本五日遊」）。成員與帳務都屬於某個旅程。"""

    __tablename__ = "trips"
    id = Column(Integer, primary_key=True)
    name = Column(String(60), nullable=False)
    created_at = Column(DateTime, default=_utcnow, nullable=False)

    persons = relationship(
        "Person", back_populates="trip", cascade="all, delete-orphan"
    )
    expenses = relationship(
        "Expense", back_populates="trip", cascade="all, delete-orphan"
    )


class Person(Base):
    __tablename__ = "persons"
    __table_args__ = (UniqueConstraint("trip_id", "name", name="uq_person_trip_name"),)

    id = Column(Integer, primary_key=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False, index=True)
    name = Column(String, nullable=False)

    trip = relationship("Trip", back_populates="persons")


class Expense(Base):
    __tablename__ = "expenses"
    id = Column(Integer, primary_key=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False, index=True)
    description = Column(String, nullable=False)
    # 金額一律以「分」為單位的整數儲存，避免浮點數誤差
    total_cents = Column(Integer, nullable=False)
    payer_id = Column(Integer, ForeignKey("persons.id"), nullable=False)

    trip = relationship("Trip", back_populates="expenses")
    splits = relationship(
        "ExpenseSplit",
        back_populates="expense",
        cascade="all, delete-orphan",
    )


class ExpenseSplit(Base):
    __tablename__ = "expense_splits"
    id = Column(Integer, primary_key=True)
    expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=False, index=True)
    person_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    amount_cents = Column(Integer, nullable=False)

    expense = relationship("Expense", back_populates="splits")
