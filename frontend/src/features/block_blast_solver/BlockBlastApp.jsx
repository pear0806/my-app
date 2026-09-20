import './App.css';
import '../../App.css';

import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useBlockBlast } from './useBlockBlast';

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

export default function App() {
	const navigate = useNavigate();
	const {
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
	} = useBlockBlast();

	return (
		<div className="app-container">
			<button onClick={() => navigate("/")} className="btn-back">
				<ArrowLeft size={20} />
				返回首頁
			</button>
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
