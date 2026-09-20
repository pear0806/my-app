from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import sqlite3
import json
import itertools

router = APIRouter()

# ----------------- 資料庫初始化 (SQLite) -----------------

DB_FILE = "blocks.db"


def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # 開發階段專用：每次重啟都強制清空舊表，這樣就不用手動刪除 blocks.db 了！
    cursor.execute('DROP TABLE IF EXISTS shapes')

    cursor.execute('''
        CREATE TABLE shapes (
            id INTEGER PRIMARY KEY,
            name TEXT,
            matrix TEXT
        )
    ''')

    default_shapes = [
        (1, "單格", "[[1]]"),
        (2, "2x2 方塊", "[[1,1],[1,1]]"),
        (3, "3x3 方塊", "[[1,1,1],[1,1,1],[1,1,1]]"),
        (4, "橫條 (1x2)", "[[1,1]]"),
        (5, "直條 (2x1)", "[[1],[1]]"),
        (6, "橫條 (1x3)", "[[1,1,1]]"),
        (7, "直條 (3x1)", "[[1],[1],[1]]"),
        (8, "橫條 (1x4)", "[[1,1,1,1]]"),
        (9, "直條 (4x1)", "[[1],[1],[1],[1]]"),
        (10, "橫條 (1x5)", "[[1,1,1,1,1]]"),
        (11, "直條 (5x1)", "[[1],[1],[1],[1],[1]]"),
        (12, "T型 (上)", "[[0,1,0],[1,1,1]]"),
        (13, "T型 (下)", "[[1,1,1],[0,1,0]]"),
        (14, "T型 (右)", "[[1,0],[1,1],[1,0]]"),
        (15, "T型 (左)", "[[0,1],[1,1],[0,1]]"),
        (16, "Z型(左)", "[[1, 1, 0], [0, 1, 1]]"),
        (17, "Z型(右)", "[[0, 1, 1], [1, 1, 0]]"),
        (18, "勾型(右上)", "[[0, 0, 1], [1, 1, 1]]"),
        (19, "勾型(右下)", "[[1, 1, 1], [0, 0, 1]]"),
        (20, "勾型(左上)", "[[1, 0, 0], [1, 1, 1]]"),
        (21, "勾型(左下)", "[[1, 1, 1], [1, 0, 0]]"),
        (22, "小L(右上)", "[[1, 1],[0, 1]]"),
        (23, "小L(右下)", "[[0, 1],[1, 1]]"),
        (24, "小L(左上)", "[[1, 1],[1, 0]]"),
        (25, "小L(左下)", "[[1, 0],[1, 1]]"),
        (26, "大L(右上)", "[[1, 1, 1],[0, 0, 1],[0, 0, 1]]"),
        (27, "大L(右下)", "[[0, 0, 1],[0, 0, 1],[1, 1, 1]]"),
        (28, "大L(左上)", "[[1, 1, 1],[1, 0, 0],[1, 0, 0]]"),
        (29, "大L(左下)", "[[1, 0, 0],[1, 0, 0],[1, 1, 1]]"),
    ]

    cursor.executemany(
        "INSERT INTO shapes (id, name, matrix) VALUES (?, ?, ?)", default_shapes)
    conn.commit()
    conn.close()


init_db()

# ----------------- 資料模型 (Pydantic) -----------------


class SolveRequest(BaseModel):
    board: List[List[int]]  # 8x8 二維陣列
    block_ids: List[int]    # 3個方塊的 ID

# ----------------- 核心演算法 -----------------


def get_block_matrix(block_id: int) -> List[List[int]]:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT matrix FROM shapes WHERE id = ?", (block_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail=f"找不到方塊 ID {block_id}")
    return json.loads(row[0])


def can_place(board, block, r, c):
    """檢查方塊是否能放在指定位置"""
    bh, bw = len(block), len(block[0])
    if r + bh > 8 or c + bw > 8:
        return False
    for i in range(bh):
        for j in range(bw):
            if block[i][j] == 1 and board[r+i][c+j] == 1:
                return False
    return True


def place_block(board, block, r, c):
    """放置方塊並回傳新棋盤"""
    new_board = [row[:] for row in board]
    for i in range(len(block)):
        for j in range(len(block[0])):
            if block[i][j] == 1:
                new_board[r+i][c+j] = 1
    return new_board


def clear_lines(board):
    """消除行列並計算分數"""
    rows_to_clear = [i for i in range(8) if all(
        board[i][j] == 1 for j in range(8))]
    cols_to_clear = [j for j in range(8) if all(
        board[i][j] == 1 for i in range(8))]

    new_board = [row[:] for row in board]
    for i in rows_to_clear:
        for j in range(8):
            new_board[i][j] = 0
    for j in cols_to_clear:
        for i in range(8):
            new_board[i][j] = 0

    return new_board, len(rows_to_clear) + len(cols_to_clear)


def evaluate_board(board, lines_cleared):
    """
    啟發式評估函數 (Heuristic)
    分數越高越好。策略：消除線越多越好，剩餘方塊越少越好
    """
    blocks_remaining = sum(sum(row) for row in board)
    return (lines_cleared * 1000) - blocks_remaining

# ----------------- API 路由 -----------------


@router.get("/blocks")
def get_all_blocks():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, matrix FROM shapes")
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r[0], "name": r[1], "matrix": json.loads(r[2])} for r in rows]


@router.post("/solve")
def solve_board(req: SolveRequest):
    if len(req.board) != 8 or any(len(row) != 8 for row in req.board):
        raise HTTPException(status_code=400, detail="棋盤必須是 8x8")
    if len(req.block_ids) == 0 or len(req.block_ids) > 3:
        raise HTTPException(status_code=400, detail="需提供 1 到 3 個方塊")

    # 取得方塊矩陣
    blocks = [(bid, get_block_matrix(bid)) for bid in req.block_ids]

    best_score = -float('inf')
    best_path = []

    # 嘗試所有方塊放置順序的排列組合
    for perm in itertools.permutations(blocks):
        def search(current_board, block_idx, current_path, current_lines):
            nonlocal best_score, best_path

            if block_idx == len(perm):
                score = evaluate_board(current_board, current_lines)
                if score > best_score:
                    best_score = score
                    best_path = list(current_path)
                return

            bid, b_matrix = perm[block_idx]
            placed_any = False

            for r in range(8):
                for c in range(8):
                    if can_place(current_board, b_matrix, r, c):
                        placed_any = True
                        next_board = place_block(current_board, b_matrix, r, c)
                        next_board, cleared = clear_lines(next_board)

                        path_step = {
                            "block_id": bid,
                            "position": {"row": r, "col": c}
                        }
                        search(next_board, block_idx + 1, current_path +
                               [path_step], current_lines + cleared)

            if not placed_any:
                score = -99999
                if score > best_score:
                    best_score = score
                    best_path = list(current_path) + \
                        [{"block_id": bid, "position": "GAME OVER"}]

        search(req.board, 0, [], 0)

    if not best_path:
        return {"status": "fail", "message": "無論如何都會卡死"}

    return {
        "status": "success",
        "best_score": best_score,
        "steps": best_path
    }
