import { useState, useEffect } from "react";
import "./App.css";

const API_URL = "http://localhost:8000";

const MiniBlock = ({ matrix }) => (
	<div
		className="mini-block"
		style={{ gridTemplateColumns: `repeat(${matrix[0].length}, 18px)` }}
	>
		{matrix.map((row, r) =>
			row.map((val, c) => (
				<div
					key={`${r}-${c}`}
					className={`mini-cell ${val ? "filled" : "empty"}`}
				/>
			)),
		)}
	</div>
);

function App() {
	const emptyBoard = Array(8)
		.fill()
		.map(() => Array(8).fill(0));
	const [board, setBoard] = useState(emptyBoard);
	const [availableBlocks, setAvailableBlocks] = useState([]);

	const [selectedBlocks, setSelectedBlocks] = useState([1, 1, 1]);
	const [activeSlot, setActiveSlot] = useState(null);
	const [solution, setSolution] = useState(null);
	const [loading, setLoading] = useState(false);

	const [isDragging, setIsDragging] = useState(false);
	const [dragAction, setDragAction] = useState(null);

	useEffect(() => {
		fetch(`${API_URL}/api/blast/blocks`)
			.then((res) => res.json())
			.then((data) => setAvailableBlocks(data))
			.catch((err) => console.error("獲取方塊失敗", err));
	}, []);

	useEffect(() => {
		const handleGlobalMouseUp = () => {
			setIsDragging(false);
			setDragAction(null);
		};
		window.addEventListener("mouseup", handleGlobalMouseUp);
		return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
	}, []);

	const updateCell = (r, c, newValue) => {
		setBoard((prev) => {
			const newBoard = prev.map((row) => [...row]);
			newBoard[r][c] = newValue;
			return newBoard;
		});
		setSolution(null);
	};

	const handleMouseDown = (r, c) => {
		const targetValue = board[r][c] === 0 ? 1 : 0;
		setIsDragging(true);
		setDragAction(targetValue);
		updateCell(r, c, targetValue);
	};

	const handleMouseEnter = (r, c) => {
		if (isDragging && dragAction !== null) {
			if (board[r][c] !== dragAction) {
				updateCell(r, c, dragAction);
			}
		}
	};

	const handlePickBlock = (blockId) => {
		if (activeSlot === null) return;
		const newSelected = [...selectedBlocks];
		newSelected[activeSlot] = blockId;
		setSelectedBlocks(newSelected);
		setActiveSlot(activeSlot < 2 ? activeSlot + 1 : null);
	};

	const handleSolve = async () => {
		setLoading(true);
		setActiveSlot(null);
		try {
			const response = await fetch(`${API_URL}/api/blast/solve`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					board: board,
					block_ids: selectedBlocks,
				}),
			});
			if (!response.ok) throw new Error("伺服器發生錯誤");
			const data = await response.json();
			setSolution(data);
		} catch (err) {
			alert(`計算失敗，請檢查後端是否啟動。錯誤:${err}`);
		} finally {
			setLoading(false);
		}
	};

	const clearBoard = () => {
		setBoard(emptyBoard);
		setSolution(null);
	};

	const getSolutionOverlay = () => {
		const overlay = Array(8)
			.fill()
			.map(() => Array(8).fill([]));
		if (!solution || solution.status !== "success" || !solution.steps)
			return overlay;

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
							overlay[boardRow][boardCol] = [
								...overlay[boardRow][boardCol],
								stepIndex + 1,
							];
						}
					}
				});
			});
		});
		return overlay;
	};

	const overlay = getSolutionOverlay();

	return (
		<div className="app-container">
			<h2>Block Blast 助手</h2>
			<p style={{ color: "#aaa", marginBottom: "20px" }}>
				點擊或<b>按住拖曳</b>
				網格來快速設定藍色方塊。點擊下方三個框框選擇你要放入的圖形。
			</p>

			<div className="board" onMouseLeave={() => {}}>
				{board.map((row, r) =>
					row.map((cell, c) => {
						const overlaySteps = overlay[r][c];
						const stepClass =
							overlaySteps.length > 0
								? `step-${overlaySteps[0]}`
								: "";
						const stepText = overlaySteps.join(",");
						return (
							<div
								key={`${r}-${c}`}
								className={`cell ${cell === 1 ? "filled" : ""} ${stepClass}`}
								onMouseDown={() => handleMouseDown(r, c)}
								onMouseEnter={() => handleMouseEnter(r, c)}
							>
								{stepText}
							</div>
						);
					}),
				)}
			</div>

			<div className="slots-container">
				{[0, 1, 2].map((slotIndex) => {
					const blockId = selectedBlocks[slotIndex];
					const blockData = availableBlocks.find(
						(b) => b.id === blockId,
					);
					return (
						<div
							key={slotIndex}
							className={`block-slot ${activeSlot === slotIndex ? "active" : ""}`}
							onClick={() =>
								setActiveSlot(
									activeSlot === slotIndex ? null : slotIndex,
								)
							}
						>
							{blockData ? (
								<MiniBlock matrix={blockData.matrix} />
							) : (
								"點擊選擇"
							)}
						</div>
					);
				})}
			</div>

			{activeSlot !== null && (
				<div className="picker-panel">
					{availableBlocks.map((block) => (
						<div
							key={block.id}
							className="picker-item"
							onClick={() => handlePickBlock(block.id)}
						>
							<MiniBlock matrix={block.matrix} />
						</div>
					))}
				</div>
			)}

			<div className="btn-group">
				<button
					className="solve-btn"
					onClick={handleSolve}
					disabled={loading}
				>
					{loading ? "計算中..." : "計算最佳解"}
				</button>
				<button className="solve-btn clear" onClick={clearBoard}>
					清空盤面
				</button>
			</div>

			{solution && (
				<div className="result">
					{solution.status === "success" ? (
						<div>
							<h3 style={{ margin: "0 0 10px 0" }}>解答完成！</h3>
							<p>
								請參考上方盤面的數字順序 <b>1 → 2 → 3</b>{" "}
								放入方塊。
							</p>
						</div>
					) : (
						<p style={{ color: "#ff4444", margin: 0 }}>
							{solution.message}
						</p>
					)}
				</div>
			)}
		</div>
	);
}

export default App;
