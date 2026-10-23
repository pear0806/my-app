"""啟動時把資料庫升級到最新結構。

舊版（沒有旅程、金額是 Float）的資料會被搬進一個「預設旅程」，
金額從元轉成整數分。升級前會先備份資料庫檔案。
"""

import shutil
from datetime import datetime

from sqlalchemy import inspect, text

from . import models
from .database import DATABASE_URL, SessionLocal, engine

DEFAULT_TRIP_NAME = "預設旅程"

_LEGACY_INDEXES = (
    "ix_persons_id",
    "ix_persons_name",
    "ix_expenses_id",
    "ix_expense_splits_id",
)


def _is_legacy_schema() -> bool:
    inspector = inspect(engine)
    if "persons" not in inspector.get_table_names():
        return False
    columns = {c["name"] for c in inspector.get_columns("persons")}
    return "trip_id" not in columns


def _backup_database_file():
    prefix = "sqlite:///"
    if not DATABASE_URL.startswith(prefix) or DATABASE_URL.endswith(":memory:"):
        return None
    path = DATABASE_URL[len(prefix):]
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = f"{path}.bak-{stamp}"
    shutil.copyfile(path, backup)
    return backup


def _migrate_legacy():
    _backup_database_file()

    with engine.begin() as conn:
        for name in _LEGACY_INDEXES:
            conn.execute(text(f"DROP INDEX IF EXISTS {name}"))
        for table in ("expense_splits", "expenses", "persons"):
            conn.execute(text(f"ALTER TABLE {table} RENAME TO legacy_{table}"))

        models.Base.metadata.create_all(conn)

        has_data = conn.execute(text("SELECT COUNT(*) FROM legacy_persons")).scalar()
        if has_data:
            trip_id = conn.execute(
                text("INSERT INTO trips (name, created_at) VALUES (:n, CURRENT_TIMESTAMP)"),
                {"n": DEFAULT_TRIP_NAME},
            ).lastrowid
            conn.execute(
                text("INSERT INTO persons (id, trip_id, name) "
                     "SELECT id, :t, name FROM legacy_persons"),
                {"t": trip_id},
            )
            conn.execute(
                text("INSERT INTO expenses (id, trip_id, description, total_cents, payer_id) "
                     "SELECT id, :t, description, CAST(ROUND(total_amount * 100) AS INTEGER), payer_id "
                     "FROM legacy_expenses"),
                {"t": trip_id},
            )
            conn.execute(
                text("INSERT INTO expense_splits (id, expense_id, person_id, amount_cents) "
                     "SELECT id, expense_id, person_id, CAST(ROUND(amount * 100) AS INTEGER) "
                     "FROM legacy_expense_splits")
            )

        for table in ("expense_splits", "expenses", "persons"):
            conn.execute(text(f"DROP TABLE legacy_{table}"))


def init_db():
    if _is_legacy_schema():
        _migrate_legacy()
    models.Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        if db.query(models.Trip.id).first() is None:
            db.add(models.Trip(name=DEFAULT_TRIP_NAME))
            db.commit()
