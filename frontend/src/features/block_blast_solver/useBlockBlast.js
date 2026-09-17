import { useState, useEffect, useCallback, useMemo } from "react";
import { getBlocks, solveBlockBlast } from "./api";

const emptyBoard = Array(8)
	.fill()
	.map(() => Array(8).fill(0));

export function useBlockBlast() {
	const [board, setBoard] = useState(emptyBoard);
	const [availableBlocks, setAvailableBlocks] = useState([]);

	const [selectedBlocks, setSelectedBlocks] = useState([1, 1, 1]);
	const [activeSlot, setActiveSlot] = useState(null);
	const [solution, setSolution] = useState(null);
	const [loading, setLoading] = useState(false);

	const [isDragging, setIsDragging] = useState(false);
	const [dragAction, setDragAction] = useState(null);

	// 取得方塊清單 (加入 isMounted 防護機制)
	useEffect(() => {
		let isMounted = true;
		const fetchBlocks = async () => {
			try {
				const data = await getBlocks();
				if (isMounted) setAvailableBlocks(data);
			} catch (err) {
				console.error("獲取方塊失敗", err);
			}
		};
		fetchBlocks();
		return () => {
			isMounted = false;
		};
	}, []);

	// 監聽全域滑鼠放開，停止拖曳畫筆
	useEffect(() => {
		const handleGlobalMouseUp = () => {
			setIsDragging(false);
			setDragAction(null);
		};
		window.addEventListener("mouseup", handleGlobalMouseUp);
		return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
	}, []);

	const updateCell = useCallback((r, c, newValue) => {
		setBoard((prev) => {
			const newBoard = prev.map((row) => [...row]);
			newBoard[r][c] = newValue;
			return newBoard;
		});
		setSolution(null);
	}, []);

	const handleMouseDown = useCallback(
		(r, c) => {
			const targetValue = board[r][c] === 0 ? 1 : 0;
			setIsDragging(true);
			setDragAction(targetValue);
			updateCell(r, c, targetValue);
		},
		[board, updateCell],
	);

	const handleMouseEnter = useCallback(
		(r, c) => {
			if (isDragging && dragAction !== null) {
				if (board[r][c] !== dragAction) {
					updateCell(r, c, dragAction);
				}
			}
		},
		[board, isDragging, dragAction, updateCell],
	);

	const handlePickBlock = useCallback(
		(blockId) => {
			if (activeSlot === null) return;
			const newSelected = [...selectedBlocks];
			newSelected[activeSlot] = blockId;
			setSelectedBlocks(newSelected);
			setActiveSlot(activeSlot < 2 ? activeSlot + 1 : null);
		},
		[activeSlot, selectedBlocks],
	);

	const handleSolve = async () => {
		setLoading(true);
		setActiveSlot(null);
		try {
			const data = await solveBlockBlast({
				board: board,
				block_ids: selectedBlocks,
			});
			setSolution(data);
		} catch (err) {
			const errorMsg =
				err.response?.data?.detail || err.message || "伺服器發生錯誤";
			alert(`計算失敗，請檢查網路。錯誤: ${errorMsg}`);
		} finally {
			setLoading(false);
		}
	};

	const clearBoard = useCallback(() => {
		setBoard(
			Array(8)
				.fill()
				.map(() => Array(8).fill(0)),
		);
		setSolution(null);
	}, []);

	// 將複雜的「解答覆蓋層計算」包裝進 useMemo，避免畫面無謂的重複計算
	const overlay = useMemo(() => {
		const tempOverlay = Array(8)
			.fill()
			.map(() => Array(8).fill([]));
		if (!solution || solution.status !== "success" || !solution.steps)
			return tempOverlay;

		solution.steps.forEach((step, stepIndex) => {
			if (step.position === "GAME OVER") return;
			const block = availableBlocks.find((b) => b.id === step.block_id);
			if (!block) return;

			const { row, col } = step.position;
			block.matrix.forEach((rArr, i) => {
				rArr.forEach((val, j) => {
					if (val === 1) {
						const boardRow = row + i;
						const boardCol = col + j;
						if (boardRow < 8 && boardCol < 8) {
							tempOverlay[boardRow][boardCol] = [
								...tempOverlay[boardRow][boardCol],
								stepIndex + 1,
							];
						}
					}
				});
			});
		});
		return tempOverlay;
	}, [solution, availableBlocks]);

	return {
		board,
		availableBlocks,
		selectedBlocks,
		activeSlot,
		solution,
		loading,
		overlay,
		setActiveSlot,
		handleMouseDown,
		handleMouseEnter,
		handlePickBlock,
		handleSolve,
		clearBoard,
	};
}
