import cv2
import numpy as np
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routers.block_blast_solver.router import router

app = FastAPI()
app.include_router(router, prefix="/api/blast")
client = TestClient(app)


def empty_board():
    return [[0] * 8 for _ in range(8)]


def test_blocks_lists_all_shapes():
    blocks = client.get("/api/blast/blocks").json()
    assert len(blocks) == 29
    assert blocks[0] == {"id": 1, "name": "單格", "matrix": [[1]]}


def test_solve_clears_a_line():
    board = empty_board()
    board[0] = [1, 1, 1, 1, 1, 1, 1, 0]  # 差最後一格就能消一列
    res = client.post("/api/blast/solve", json={"board": board, "block_ids": [1]}).json()
    assert res["status"] == "success"
    assert res["steps"] == [{"block_id": 1, "position": {"row": 0, "col": 7}}]


def test_solve_validates_input():
    assert client.post("/api/blast/solve", json={"board": [[0]], "block_ids": [1]}).status_code == 400
    assert client.post("/api/blast/solve", json={"board": empty_board(), "block_ids": []}).status_code == 400
    assert client.post("/api/blast/solve", json={"board": empty_board(), "block_ids": [999]}).status_code == 404


def test_recognize_returns_400_not_500_when_board_not_found():
    blank = np.zeros((300, 300, 3), dtype=np.uint8)
    ok, png = cv2.imencode(".png", blank)
    res = client.post("/api/blast/recognize", files={"file": ("x.png", png.tobytes(), "image/png")})
    assert res.status_code == 400


def test_recognize_rejects_non_image():
    res = client.post("/api/blast/recognize", files={"file": ("x.txt", b"hello", "text/plain")})
    assert res.status_code == 400
