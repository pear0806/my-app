import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import { triggerHaptic } from '../../utils/haptics';
import {
    getBlocks,
    recognizeScreenshot,
    solveBlockBlast,
} from './api';

const emptyBoard = Array(8)
	.fill()
	.map(() => Array(8).fill(0));

const emptyCustomBlock = () =>
	Array(5)
		.fill()
		.map(() => Array(5).fill(0));

export function useBlockBlast() {
	const [board, setBoard] = useState(emptyBoard);
	const [availableBlocks, setAvailableBlocks] = useState([]);

	const [selectedBlocks, setSelectedBlocks] = useState([1, 1, 1]);
	const [activeSlot, setActiveSlot] = useState(null);
	const [solution, setSolution] = useState(null);
	const [loading, setLoading] = useState(false);

	const [isDragging, setIsDragging] = useState(false);
	const [dragAction, setDragAction] = useState(null);

	const [isCustomizing, setIsCustomizing] = useState(false);
	const [customBlock, setCustomBlock] = useState(emptyCustomBlock());

	const toggleCustomCell = useCallback((r, c) => {
		setCustomBlock((prev) => {
			const newBlock = prev.map((row) => [...row]);
			newBlock[r][c] = newBlock[r][c] === 0 ? 1 : 0;
			return newBlock;
		});
	}, []);

	const saveCustomBlock = useCallback(() => {
		let minR = 5,
			maxR = -1,
			minC = 5,
			maxC = -1;
		customBlock.forEach((row, r) => {
			row.forEach((val, c) => {
				if (val === 1) {
					if (r < minR) minR = r;
					if (r > maxR) maxR = r;
					if (c < minC) minC = c;
					if (c > maxC) maxC = c;
				}
			});
		});

		if (minR > maxR) {
			alert("請至少畫一格方塊喔！");
			triggerHaptic.warning(); // 💡 加上警告震動
			return;
		}

		const trimmedMatrix = [];
		for (let r = minR; r <= maxR; r++) {
			const row = [];
			for (let c = minC; c <= maxC; c++) {
				row.push(customBlock[r][c]);
			}
			trimmedMatrix.push(row);
		}

		const newBlock = {
			id: `custom_${Date.now()}`,
			matrix: trimmedMatrix,
		};

		setAvailableBlocks((prev) => [newBlock, ...prev]);
		setIsCustomizing(false);
		setCustomBlock(emptyCustomBlock());
		triggerHaptic.medium(); // 💡 加上儲存成功的震動
	}, [customBlock]);
	// 💡 自訂方塊邏輯結束

	const handleImageUpload = async (event) => {
		const file = event.target.files[0];
		if (!file) return;

		setLoading(true);
		try {
			const data = await recognizeScreenshot(file);
			if (data && data.board) {
				setBoard(data.board);
				triggerHaptic.success();
				alert("✅ 截圖辨識成功！盤面已自動更新。");
			}
		} catch (err) {
			const errorMsg =
				err.response?.data?.detail || err.message || "辨識失敗";
			alert(
				`辨識失敗: ${errorMsg}\n請確保截圖清晰且包含完整的 8x8 遊戲網格。`,
			);
		} finally {
			setLoading(false);
			// 清空 input 讓下次可以重複上傳同一張圖
			event.target.value = null;
		}
	};

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
		triggerHaptic.light();
		setSolution(null);
	}, []);

	const fillBoard = useCallback(() => {
		setBoard(
			Array(8)
				.fill()
				.map(() => Array(8).fill(1)),
		);
		setSolution(null);
		triggerHaptic.light();
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
		fillBoard,
		handleImageUpload,
		isCustomizing,
		customBlock,
		setIsCustomizing,
		toggleCustomCell,
		saveCustomBlock,
	};
}
