import os
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool

# 資料庫預設放在 backend/ 底下，不再依賴「從哪個資料夾啟動 uvicorn」。
BACKEND_DIR = Path(__file__).resolve().parents[2]
DATABASE_URL = os.getenv(
    "DEPT_DATABASE_URL", f"sqlite:///{BACKEND_DIR / 'dept_simplification.db'}"
)

_IN_MEMORY = DATABASE_URL in ("sqlite://", "sqlite:///:memory:")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    # 記憶體資料庫（測試用）必須共用同一條連線，否則每條連線都是空的資料庫
    **({"poolclass": StaticPool} if _IN_MEMORY else {}),
)


@event.listens_for(engine, "connect")
def _enable_foreign_keys(dbapi_connection, _record):
    # SQLite 預設不檢查外鍵，這裡打開才會真的擋下違規資料
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
