from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from . import models, schemas, settlement
from .database import get_db

router = APIRouter()


# ---------------------------------------------------------------- helpers

def _get_trip(db: Session, trip_id: int) -> models.Trip:
    trip = db.get(models.Trip, trip_id)
    if trip is None:
        raise HTTPException(status_code=404, detail="找不到這個旅程")
    return trip


def _validate_expense(expense: schemas.ExpenseCreate, known_ids: set[int]):
    if expense.payer_id not in known_ids:
        raise HTTPException(status_code=400, detail="付款人不存在")

    split_ids = [s.person_id for s in expense.splits]
    if len(split_ids) != len(set(split_ids)):
        raise HTTPException(status_code=400, detail="同一筆消費不可重複分攤同一人")
    if any(pid not in known_ids for pid in split_ids):
        raise HTTPException(status_code=400, detail="分攤名單含有不存在的成員")

    if sum(s.amount_cents for s in expense.splits) != expense.total_cents:
        raise HTTPException(status_code=400, detail="分攤金額加總必須等於總額")


def _build_overview(db: Session, trip: models.Trip) -> schemas.OverviewResponse:
    persons = (
        db.query(models.Person)
        .filter(models.Person.trip_id == trip.id)
        .order_by(models.Person.id)
        .all()
    )
    expenses = (
        db.query(models.Expense)
        .options(joinedload(models.Expense.splits))
        .filter(models.Expense.trip_id == trip.id)
        .order_by(models.Expense.id.desc())
        .all()
    )

    names = {p.id: p.name for p in persons}
    balances = settlement.net_balances_cents(persons, expenses)
    transfers = settlement.simplify_transfers(balances)

    # 「原本約幾筆往來」= 每筆消費中，非付款人且金額大於 0 的分攤數
    original_edges = sum(
        1
        for exp in expenses
        for split in exp.splits
        if split.person_id != exp.payer_id and split.amount_cents > 0
    )

    return schemas.OverviewResponse(
        trip=trip,
        persons=persons,
        expenses=expenses,
        balances=[
            schemas.BalanceResponse(person_id=pid, name=names[pid], amount_cents=cents)
            for pid, cents in balances.items()
        ],
        settlements=[
            schemas.SettlementResponse(
                from_id=from_id,
                to_id=to_id,
                from_person=names[from_id],
                to_person=names[to_id],
                amount_cents=cents,
            )
            for from_id, to_id, cents in transfers
        ],
        original_edges=original_edges,
        simplified_count=len(transfers),
    )


# ------------------------------------------------------------------ trips

@router.get("/health")
def health():
    return {"ok": True}


@router.get("/trips/", response_model=list[schemas.TripResponse])
def list_trips(db: Session = Depends(get_db)):
    return db.query(models.Trip).order_by(models.Trip.id).all()


@router.post("/trips/", response_model=schemas.TripResponse, status_code=201)
def create_trip(payload: schemas.TripCreate, db: Session = Depends(get_db)):
    trip = models.Trip(name=payload.name)
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


@router.delete("/trips/{trip_id}", response_model=schemas.MessageResponse)
def delete_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = _get_trip(db, trip_id)
    _clear_trip(db, trip)
    db.delete(trip)
    db.commit()
    return schemas.MessageResponse(message="已刪除旅程")


def _clear_trip(db: Session, trip: models.Trip):
    """依外鍵順序清空旅程內的帳務與成員。"""
    expense_ids = db.query(models.Expense.id).filter(models.Expense.trip_id == trip.id)
    db.query(models.ExpenseSplit).filter(
        models.ExpenseSplit.expense_id.in_(expense_ids)
    ).delete(synchronize_session=False)
    db.query(models.Expense).filter(models.Expense.trip_id == trip.id).delete(
        synchronize_session=False
    )
    db.query(models.Person).filter(models.Person.trip_id == trip.id).delete(
        synchronize_session=False
    )


# ------------------------------------------------- trip contents (overview)
# 所有「會改動資料」的端點都直接回傳最新的 overview，前端不用再多打一次 GET。

@router.get("/trips/{trip_id}/overview/", response_model=schemas.OverviewResponse)
def get_overview(trip_id: int, db: Session = Depends(get_db)):
    return _build_overview(db, _get_trip(db, trip_id))


@router.post("/trips/{trip_id}/persons/", response_model=schemas.OverviewResponse)
def create_person(
    trip_id: int, person: schemas.PersonBase, db: Session = Depends(get_db)
):
    trip = _get_trip(db, trip_id)
    db.add(models.Person(trip_id=trip.id, name=person.name))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="這個名字已經存在")
    return _build_overview(db, trip)


@router.delete(
    "/trips/{trip_id}/persons/{person_id}", response_model=schemas.OverviewResponse
)
def delete_person(trip_id: int, person_id: int, db: Session = Depends(get_db)):
    trip = _get_trip(db, trip_id)
    person = (
        db.query(models.Person)
        .filter(models.Person.id == person_id, models.Person.trip_id == trip.id)
        .first()
    )
    if person is None:
        raise HTTPException(status_code=404, detail="找不到這位成員")

    used = (
        db.query(models.Expense.id).filter(models.Expense.payer_id == person_id).first()
        or db.query(models.ExpenseSplit.id)
        .filter(models.ExpenseSplit.person_id == person_id)
        .first()
    )
    if used:
        raise HTTPException(status_code=400, detail="此成員已有帳務，無法刪除")

    db.delete(person)
    db.commit()
    return _build_overview(db, trip)


@router.post("/trips/{trip_id}/expenses/", response_model=schemas.OverviewResponse)
def create_expense(
    trip_id: int, expense: schemas.ExpenseCreate, db: Session = Depends(get_db)
):
    trip = _get_trip(db, trip_id)
    known_ids = {
        row[0]
        for row in db.query(models.Person.id).filter(models.Person.trip_id == trip.id)
    }
    _validate_expense(expense, known_ids)

    db.add(
        models.Expense(
            trip_id=trip.id,
            description=expense.description,
            total_cents=expense.total_cents,
            payer_id=expense.payer_id,
            splits=[
                models.ExpenseSplit(person_id=s.person_id, amount_cents=s.amount_cents)
                for s in expense.splits
            ],
        )
    )
    db.commit()
    return _build_overview(db, trip)


@router.delete(
    "/trips/{trip_id}/expenses/{expense_id}", response_model=schemas.OverviewResponse
)
def delete_expense(trip_id: int, expense_id: int, db: Session = Depends(get_db)):
    trip = _get_trip(db, trip_id)
    expense = (
        db.query(models.Expense)
        .filter(models.Expense.id == expense_id, models.Expense.trip_id == trip.id)
        .first()
    )
    if expense is None:
        raise HTTPException(status_code=404, detail="找不到這筆消費")
    db.delete(expense)
    db.commit()
    return _build_overview(db, trip)


@router.delete("/trips/{trip_id}/data/", response_model=schemas.OverviewResponse)
def reset_trip(trip_id: int, db: Session = Depends(get_db)):
    """清空這個旅程的成員與帳務（旅程本身保留）。"""
    trip = _get_trip(db, trip_id)
    _clear_trip(db, trip)
    db.commit()
    return _build_overview(db, trip)
