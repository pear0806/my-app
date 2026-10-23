"""舊版資料庫（Float 金額、沒有旅程）要能無損升級。"""

import sqlite3

import pytest

from routers.dept_simplification import database, migrations, models


@pytest.fixture()
def legacy_db(tmp_path, monkeypatch):
    path = tmp_path / "legacy.db"
    conn = sqlite3.connect(path)
    conn.executescript(
        """
        CREATE TABLE persons (id INTEGER PRIMARY KEY, name VARCHAR NOT NULL);
        CREATE UNIQUE INDEX ix_persons_name ON persons (name);
        CREATE INDEX ix_persons_id ON persons (id);
        CREATE TABLE expenses (id INTEGER PRIMARY KEY, description VARCHAR NOT NULL,
            total_amount FLOAT NOT NULL, payer_id INTEGER NOT NULL REFERENCES persons(id));
        CREATE TABLE expense_splits (id INTEGER PRIMARY KEY, expense_id INTEGER NOT NULL REFERENCES expenses(id),
            person_id INTEGER NOT NULL REFERENCES persons(id), amount FLOAT NOT NULL);
        INSERT INTO persons VALUES (1,'小明'),(2,'小華');
        INSERT INTO expenses VALUES (1,'拉麵',640.2,1);
        INSERT INTO expense_splits VALUES (1,1,1,320.1),(2,1,2,320.1);
        INSERT INTO expenses VALUES (2,'浮點陷阱',12.35,2);
        INSERT INTO expense_splits VALUES (3,2,1,12.35);
        """
    )
    conn.commit()
    conn.close()

    from sqlalchemy import create_engine

    engine = create_engine(f"sqlite:///{path}", connect_args={"check_same_thread": False})
    monkeypatch.setattr(migrations, "engine", engine)
    monkeypatch.setattr(migrations, "DATABASE_URL", f"sqlite:///{path}")
    monkeypatch.setattr(database, "engine", engine)
    from sqlalchemy.orm import sessionmaker

    monkeypatch.setattr(migrations, "SessionLocal", sessionmaker(bind=engine))
    return path, engine


def test_legacy_data_is_moved_into_default_trip_with_exact_cents(legacy_db):
    path, engine = legacy_db
    migrations.init_db()

    from sqlalchemy.orm import Session

    with Session(engine) as db:
        trips = db.query(models.Trip).all()
        assert [t.name for t in trips] == ["預設旅程"]
        assert {p.name for p in db.query(models.Person)} == {"小明", "小華"}
        assert all(p.trip_id == trips[0].id for p in db.query(models.Person))
        cents = {e.description: e.total_cents for e in db.query(models.Expense)}
        assert cents == {"拉麵": 64020, "浮點陷阱": 1235}
        assert sorted(s.amount_cents for s in db.query(models.ExpenseSplit)) == [1235, 32010, 32010]

    # 升級前有備份
    assert list(path.parent.glob("legacy.db.bak-*"))


def test_migration_is_idempotent(legacy_db):
    migrations.init_db()
    migrations.init_db()

    from sqlalchemy.orm import Session

    with Session(legacy_db[1]) as db:
        assert db.query(models.Trip).count() == 1
        assert db.query(models.Expense).count() == 2
