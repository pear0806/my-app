import { describe, expect, it } from "vitest";

import { BOARD_SIZE, buildOverlay, createBoard, setCell } from "./boardUtils";

describe("createBoard / setCell", () => {
	it("creates an 8x8 board of independent rows", () => {
		const board = createBoard(1);
		expect(board).toHaveLength(BOARD_SIZE);
		expect(board.every((row) => row.length === BOARD_SIZE && row.every((v) => v === 1))).toBe(true);
		expect(board[0]).not.toBe(board[1]);
	});

	it("setCell returns a new board and leaves the original untouched", () => {
		const board = createBoard(0);
		const next = setCell(board, 2, 3, 1);
		expect(next[2][3]).toBe(1);
		expect(board[2][3]).toBe(0);
		expect(next[0]).toBe(board[0]); // 沒動到的列直接共用，React 比較時更省
	});
});

describe("buildOverlay", () => {
	const blocks = [
		{ id: 1, matrix: [[1]] },
		{ id: 4, matrix: [[1, 1]] },
	];

	it("is empty without a successful solution", () => {
		const overlay = buildOverlay(null, blocks);
		expect(overlay.flat().every((cell) => cell.length === 0)).toBe(true);
		expect(buildOverlay({ status: "fail" }, blocks).flat().flat()).toEqual([]);
	});

	it("marks each cell with the step numbers that cover it", () => {
		const solution = {
			status: "success",
			steps: [
				{ block_id: 4, position: { row: 0, col: 0 } },
				{ block_id: 1, position: { row: 0, col: 1 } },
			],
		};
		const overlay = buildOverlay(solution, blocks);
		expect(overlay[0][0]).toEqual([1]);
		expect(overlay[0][1]).toEqual([1, 2]);
		expect(overlay[0][2]).toEqual([]);
	});

	it("ignores GAME OVER steps, unknown blocks and cells outside the board", () => {
		const solution = {
			status: "success",
			steps: [
				{ block_id: 1, position: "GAME OVER" },
				{ block_id: 999, position: { row: 0, col: 0 } },
				{ block_id: 4, position: { row: 7, col: 7 } },
			],
		};
		const overlay = buildOverlay(solution, blocks);
		expect(overlay[7][7]).toEqual([3]);
		expect(overlay.flat().filter((cell) => cell.length > 0)).toHaveLength(1);
	});
});
