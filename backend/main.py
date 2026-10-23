import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.block_blast_solver.router import router as blast_router
from routers.dept_simplification.migrations import init_db
from routers.dept_simplification.router import router as dept_router

# 允許的前端來源，逗號分隔。預設涵蓋 Vite 開發伺服器與 Capacitor（Android / iOS）。
# 部署時請用環境變數覆蓋，例如：CORS_ORIGINS=https://my-app.example.com
DEFAULT_ORIGINS = (
    "http://localhost:5173,http://127.0.0.1:5173,"
    "http://localhost,capacitor://localhost"
)
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", DEFAULT_ORIGINS).split(",")
    if origin.strip()
]


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(title="My Multi-Tool API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    # 這個 API 不使用 cookie，不需要 credentials；
    # 而且 credentials 搭配 "*" 本來就是不合法的組合
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(blast_router, prefix="/api/blast", tags=["Block Blast"])
app.include_router(dept_router, prefix="/api/dept", tags=["Dept Simplification"])


@app.get("/")
def read_root():
    return {"message": "Welcome to Multi-Tool API Hub"}
