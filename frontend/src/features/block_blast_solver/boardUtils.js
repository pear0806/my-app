export const BOARD_SIZE = 8;

/** 建立 8x8 盤面，每格都是 value。 */
export const createBoard = (value = 0) =>
	Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(value));

/** 回傳「第 r 列第 c 欄改成 value」的新盤面（不會改動原本的）。 */
export const setCell = (board, r, c, value) =>
	board.map((row, i) => (i === r ? row.map((v, j) => (j === c ? value : v)) : row));

/**
 * 把解答攤平成「每一格要放第幾步」的二維陣列，例如 [[], [1], [1, 2], ...]。
 * 同一格被多個步驟經過時（消除後再放）會依序累積。
 */
export function buildOverlay(solution, blocks) {
	const overlay = Array.from({ length: BOARD_SIZE }, () =>
		Array.from({ length: BOARD_SIZE }, () => []),
	);
	if (!solution || solution.status !== "success" || !solution.steps) return overlay;

	solution.steps.forEach((step, stepIndex) => {
		if (step.position === "GAME OVER") return;
		const block = blocks.find((b) => b.id === step.block_id);
		if (!block) return;

		const { row, col } = step.position;
		block.matrix.forEach((cells, i) => {
			cells.forEach((filled, j) => {
				const r = row + i;
				const c = col + j;
				if (filled === 1 && r < BOARD_SIZE && c < BOARD_SIZE) {
					overlay[r][c] = [...overlay[r][c], stepIndex + 1];
				}
			});
		});
	});
	return overlay;
}
