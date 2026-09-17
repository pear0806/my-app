from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError

from . import models
from . import schemas
from . import settlement
from .database import engine, get_db

models.Base.metadata.create_all(bind=engine)

router = APIRouter()


def _person_ids(db: Session) -> set[int]:
    return {row[0] for row in db.query(models.Person.id).all()}


def _validate_expense_payload(expense: schemas.ExpenseCreate, known_ids: set[int]):
    if expense.payer_id not in known_ids:
        raise HTTPException(status_code=400, detail="付款人不存在")

    split_ids = [s.person_id for s in expense.splits]
    if len(split_ids) != len(set(split_ids)):
        raise HTTPException(status_code=400, detail="同一筆消費不可重複分攤同一人")

    unknown = [pid for pid in split_ids if pid not in known_ids]
    if unknown:
        raise HTTPException(status_code=400, detail="分攤名單含有不存在的成員")

    total_cents = settlement.to_cents(expense.total_amount)
    split_cents = sum(settlement.to_cents(s.amount) for s in expense.splits)
    if abs(total_cents - split_cents) > 1:
        raise HTTPException(
            status_code=400,
            detail="分攤金額加總必須等於總額",
        )


def _build_overview(db: Session) -> schemas.OverviewResponse:
    persons = db.query(models.Person).order_by(models.Person.id).all()
    expenses = (
        db.query(models.Expense)
        .options(joinedload(models.Expense.splits))
        .order_by(models.Expense.id.desc())
        .all()
    )

    names = {p.id: p.name for p in persons}
    balances_cents = settlement.net_balances_cents(persons, expenses)
    transfers = settlement.simplify_transfers(balances_cents)

    original_edges = 0
    for exp in expenses:
        payer = exp.payer_id
        for split in exp.splits:
            if split.person_id != payer and settlement.to_cents(split.amount) > 0:
                original_edges += 1

    return schemas.OverviewResponse(
        persons=persons,
        expenses=expenses,
        balances=[
            schemas.BalanceResponse(
                person_id=pid,
                name=names[pid],
                amount=settlement.from_cents(amount),
            )
            for pid, amount in balances_cents.items()
        ],
        settlements=[
            schemas.SettlementResponse(
                from_id=from_id,
                to_id=to_id,
                from_person=names[from_id],
                to_person=names[to_id],
                amount=settlement.from_cents(cents),
            )
            for from_id, to_id, cents in transfers
        ],
        original_edges=original_edges,
        simplified_count=len(transfers),
    )


@router.get("/health")
def health():
    return {"ok": True}


@router.post("/persons/", response_model=schemas.PersonResponse)
def create_person(person: schemas.PersonBase, db: Session = Depends(get_db)):
    db_person = models.Person(name=person.name)
    db.add(db_person)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="這個名字已經存在")
    db.refresh(db_person)
    return db_person


@router.get("/persons/", response_model=list[schemas.PersonResponse])
def get_persons(db: Session = Depends(get_db)):
    return db.query(models.Person).order_by(models.Person.id).all()


@router.delete("/persons/{person_id}", response_model=schemas.MessageResponse)
def delete_person(person_id: int, db: Session = Depends(get_db)):
    person = db.query(models.Person).filter(
        models.Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="找不到這位成員")

    used_as_payer = (
        db.query(models.Expense.id).filter(
            models.Expense.payer_id == person_id).first()
    )
    used_in_split = (
        db.query(models.ExpenseSplit.id)
        .filter(models.ExpenseSplit.person_id == person_id)
        .first()
    )
    if used_as_payer or used_in_split:
        raise HTTPException(status_code=400, detail="此成員已有帳務，無法刪除")

    db.delete(person)
    db.commit()
    return schemas.MessageResponse(message="已移除成員")


@router.post("/expenses/", response_model=schemas.ExpenseResponse)
def create_expense(expense: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    _validate_expense_payload(expense, _person_ids(db))

    db_expense = models.Expense(
        description=expense.description,
        total_amount=settlement.from_cents(
            settlement.to_cents(expense.total_amount)),
        payer_id=expense.payer_id,
    )
    db.add(db_expense)
    db.flush()

    for split in expense.splits:
        db.add(
            models.ExpenseSplit(
                expense_id=db_expense.id,
                person_id=split.person_id,
                amount=settlement.from_cents(
                    settlement.to_cents(split.amount)),
            )
        )
    db.commit()
    db.refresh(db_expense)
    db_expense = (
        db.query(models.Expense)
        .options(joinedload(models.Expense.splits))
        .filter(models.Expense.id == db_expense.id)
        .one()
    )
    return db_expense


@router.get("/expenses/", response_model=list[schemas.ExpenseResponse])
def get_expenses(db: Session = Depends(get_db)):
    return (
        db.query(models.Expense)
        .options(joinedload(models.Expense.splits))
        .order_by(models.Expense.id.desc())
        .all()
    )


@router.delete("/expenses/{expense_id}", response_model=schemas.MessageResponse)
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = (
        db.query(models.Expense).filter(
            models.Expense.id == expense_id).first()
    )
    if not expense:
        raise HTTPException(status_code=404, detail="找不到這筆消費")
    db.delete(expense)
    db.commit()
    return schemas.MessageResponse(message="已刪除消費紀錄")


@router.get("/settle/", response_model=list[schemas.SettlementResponse])
def calculate_settlement(db: Session = Depends(get_db)):
    return _build_overview(db).settlements


@router.get("/overview/", response_model=schemas.OverviewResponse)
def get_overview(db: Session = Depends(get_db)):
    return _build_overview(db)


@router.delete("/reset/", response_model=schemas.MessageResponse)
def reset_database(db: Session = Depends(get_db)):
    db.query(models.ExpenseSplit).delete()
    db.query(models.Expense).delete()
    db.query(models.Person).delete()
    db.commit()
    return schemas.MessageResponse(message="資料庫已全部清空")
