import os

# 必須在 import 任何 routers.* 之前設定：測試一律使用記憶體資料庫
os.environ["DEPT_DATABASE_URL"] = "sqlite://"

import pytest  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from routers.dept_simplification import models  # noqa: E402
from routers.dept_simplification.database import engine  # noqa: E402
from routers.dept_simplification.migrations import init_db  # noqa: E402
from routers.dept_simplification.router import router as dept_router  # noqa: E402


@pytest.fixture()
def client():
    models.Base.metadata.drop_all(bind=engine)
    init_db()
    app = FastAPI()
    app.include_router(dept_router, prefix="/api/dept")
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def trip_id(client):
    return client.get("/api/dept/trips/").json()[0]["id"]
