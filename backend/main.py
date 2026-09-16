from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.block_blast_solver.router import router as blast_router
from routers.dept_simplification.router import router as dept_router

app = FastAPI(title="My Multi-Tool API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(blast_router, prefix="/api/blast", tags=["Block Blast"])
app.include_router(dept_router, prefix="/api/dept",
                   tags=["Dept Simplification"])


@app.get("/")
def read_root():
    return {"message": "Welcome to Multi-Tool API Hub"}
