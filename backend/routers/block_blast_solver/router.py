import itertools
from typing import List

import cv2
import numpy as np
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from .shapes import SHAPES, SHAPES_BY_ID

router = APIRouter()

BOARD_SIZE = 8

# ----------------- 資料模型 (Pydantic) -----------------


class SolveRequest(BaseModel):
    board: List[List[int]]  # 8x8 二維陣列
    block_ids: List[int]    # 3個方塊的 ID


# ----------------- 核心演算法 -----------------


def get_block_matrix(block_id: int) -> List[List[int]]:
    shape = SHAPES_BY_ID.get(block_id)
    if shape is None:
        raise HTTPException(status_code=404, detail=f"找不到方塊 ID {block_id}")
    return shape["matrix"]


def can_place(board, block, r, c):
    """檢查方塊是否能放在指定位置"""
    bh, bw = len(block), len(block[0])
    if r + bh > BOARD_SIZE or c + bw > BOARD_SIZE:
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
    return SHAPES


@router.post("/recognize")
def recognize_screenshot(file: UploadFile = File(...)):
    # 用一般 def：OpenCV 運算很吃 CPU，交給 threadpool 才不會卡住整個伺服器
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="請上傳圖片檔案")

    try:
        # 1. 讀取上傳的圖片轉為 OpenCV 格式
        contents = file.file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("圖片解析失敗")

        # 2. 影像前處理：灰階、模糊、邊緣偵測
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 50, 150)

        # 3. 尋找輪廓，找出最大的正方形 (假設是 8x8 遊戲盤面)
        contours, _ = cv2.findContours(
            edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        board_contour = None
        max_area = 0

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > 10000:  # 過濾掉太小的雜訊
                peri = cv2.arcLength(cnt, True)
                approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)
                if len(approx) == 4 and area > max_area:
                    board_contour = approx
                    max_area = area

        if board_contour is None:
            raise HTTPException(
                status_code=400, detail="找不到遊戲盤面，請確保截圖完整包含 8x8 網格")

        # 4. 視角轉換 (將找到的四邊形拉平為正方形)
        board_contour = board_contour.reshape((4, 2))
        rect = np.zeros((4, 2), dtype="float32")
        s = board_contour.sum(axis=1)
        rect[0] = board_contour[np.argmin(s)]  # 左上
        rect[2] = board_contour[np.argmax(s)]  # 右下
        diff = np.diff(board_contour, axis=1)
        rect[1] = board_contour[np.argmin(diff)]  # 右上
        rect[3] = board_contour[np.argmax(diff)]  # 左下

        # 建立一個 800x800 的標準正方形視圖 (每格剛好 100x100)
        dst = np.array([[0, 0], [800, 0], [800, 800],
                       [0, 800]], dtype="float32")
        M = cv2.getPerspectiveTransform(rect, dst)
        warped = cv2.warpPerspective(img, M, (800, 800))

        # 5. 分析 8x8 網格的顏色狀態
        board_matrix = [[0 for _ in range(8)] for _ in range(8)]
        step = 100
        for r in range(8):
            for c in range(8):
                # 擷取單一格子的中心區域 (避開邊框線)
                cell_roi = warped[r*step +
                                  20: (r+1)*step - 20, c*step + 20: (c+1)*step - 20]

                # 轉為 HSV 色彩空間來判斷是否為藍色 (填滿) 或深灰色 (空)
                hsv = cv2.cvtColor(cell_roi, cv2.COLOR_BGR2HSV)
                # 💡 這裡的 HSV 閾值可能需要根據你的遊戲截圖微調
                # 假設遊戲方塊是亮藍色：
                lower_blue = np.array([90, 50, 50])
                upper_blue = np.array([130, 255, 255])
                mask = cv2.inRange(hsv, lower_blue, upper_blue)

                # 如果該格子內藍色像素的比例大於 20%，判定為填滿 (1)
                blue_ratio = cv2.countNonZero(
                    mask) / (cell_roi.shape[0] * cell_roi.shape[1])
                if blue_ratio > 0.2:
                    board_matrix[r][c] = 1

        return {"status": "success", "board": board_matrix}

    except HTTPException:
        # 自己丟出的 4xx 要原樣回傳，不能被下面包成 500
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
