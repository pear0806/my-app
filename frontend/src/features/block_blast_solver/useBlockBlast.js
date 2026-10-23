import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useToast } from "../../hooks/useToast";
import { triggerHaptic } from "../../utils/haptics";
import { getBlocks, recognizeScreenshot, solveBlockBlast } from "./api";
import { buildOverlay, createBoard, setCell } from "./boardUtils";

const SLOT_COUNT = 3;

/** 從螢幕座標找出底下是哪一格（觸控拖曳時事件目標不會跟著手指走，所以要自己找）。 */
function cellFromPoint(x, y) {
	const element = document.elementFromPoint(x, y)?.closest("[data-row]");
	if (!element) return null;
	return { row: Number(element.dataset.row), col: Number(element.dataset.col) };
}

export function useBlockBlast() {
	const { toast, notify, dismiss: dismissToast } = useToast();

	const [board, setBoard] = useState(() => createBoard(0));
	const [availableBlocks, setAvailableBlocks] = useState([]);
	const [selectedBlocks, setSelectedBlocks] = useState(() => Array(SLOT_COUNT).fill(1));
	const [activeSlot, setActiveSlot] = useState(null);
	const [solution, setSolution] = useState(null);
	const [loading, setLoading] = useState(false);

	// 目前拖曳要塗成 0 還是 1；null 代表沒有在拖曳。只在事件處理器讀寫，所以用 ref。
	const paintValue = useRef(null);

	useEffect(() => {
		let active = true;
		const load = async () => {
			try {
				const data = await getBlocks();
				if (active) setAvailableBlocks(data);
			} catch (err) {
				if (active) notify(err.message || "無法取得方塊清單", "error");
			}
		};
		load();
		return () => {
			active = false;
		};
	}, [notify]);

	// 手指或滑鼠在視窗任何地方放開，都要結束拖曳
	useEffect(() => {
		const stop = () => {
			paintValue.current = null;
		};
		window.addEventListener("pointerup", stop);
		window.addEventListener("pointercancel", stop);
		return () => {
			window.removeEventListener("pointerup", stop);
			window.removeEventListener("pointercancel", stop);
		};
	}, []);

	const paintCell = useCallback((row, col, value) => {
		setBoard((prev) => (prev[row][col] === value ? prev : setCell(prev, row, col, value)));
		setSolution(null);
	}, []);

	const handleBoardPointerDown = (event) => {
		const cell = cellFromPoint(event.clientX, event.clientY);
		if (!cell) return;
		paintValue.current = board[cell.row][cell.col] === 0 ? 1 : 0;
		paintCell(cell.row, cell.col, paintValue.current);
	};

	const handleBoardPointerMove = (event) => {
		if (paintValue.current === null) return;
		const cell = cellFromPoint(event.clientX, event.clientY);
		if (cell) paintCell(cell.row, cell.col, paintValue.current);
	};

	const handlePickBlock = (blockId) => {
		if (activeSlot === null) return;
		setSelectedBlocks((prev) => prev.map((id, i) => (i === activeSlot ? blockId : id)));
		setActiveSlot(activeSlot < SLOT_COUNT - 1 ? activeSlot + 1 : null);
	};

	const handleSolve = async () => {
		setLoading(true);
		setActiveSlot(null);
		try {
			setSolution(await solveBlockBlast({ board, block_ids: selectedBlocks }));
		} catch (err) {
			notify(`計算失敗：${err.message}`, "error");
		} finally {
			setLoading(false);
		}
	};

	const handleImageUpload = async (event) => {
		const input = event.target;
		const file = input.files[0];
		if (!file) return;

		setLoading(true);
		try {
			const data = await recognizeScreenshot(file);
			if (data?.board) {
				setBoard(data.board);
				setSolution(null);
				triggerHaptic.success();
				notify("截圖辨識成功，盤面已自動更新");
			}
		} catch (err) {
			notify(`辨識失敗：${err.message}。請確認截圖清晰且包含完整的 8x8 網格。`, "error");
		} finally {
			setLoading(false);
			input.value = ""; // 讓下次可以重複上傳同一張圖
		}
	};

	const resetBoard = (value) => {
		setBoard(createBoard(value));
		setSolution(null);
		triggerHaptic.light();
	};

	const overlay = useMemo(
		() => buildOverlay(solution, availableBlocks),
		[solution, availableBlocks],
	);

	return {
		board,
		availableBlocks,
		selectedBlocks,
		activeSlot,
		solution,
		loading,
		overlay,
		toast,
		dismissToast,
		setActiveSlot,
		handleBoardPointerDown,
		handleBoardPointerMove,
		handlePickBlock,
		handleSolve,
		handleImageUpload,
		clearBoard: () => resetBoard(0),
		fillBoard: () => resetBoard(1),
	};
}
