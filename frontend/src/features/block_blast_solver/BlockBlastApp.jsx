import { Camera } from "lucide-react";

import BackButton from "../../components/BackButton/BackButton";
import Toast from "../../components/Toast/Toast";
import styles from "./BlockBlastApp.module.css";
import { useBlockBlast } from "./useBlockBlast";

const MiniBlock = ({ matrix }) => (
	<div className={styles.miniBlock}>
		{matrix.map((row, r) => (
			<div key={r} className={styles.miniRow}>
				{row.map((val, c) => (
					<div key={c} className={styles.miniCell} data-filled={val ? "true" : "false"} />
				))}
			</div>
		))}
	</div>
);

export default function BlockBlastApp() {
	const {
		board,
		availableBlocks,
		selectedBlocks,
		activeSlot,
		solution,
		loading,
		overlay,
		setActiveSlot,
		toast,
		dismissToast,
		handleBoardPointerDown,
		handleBoardPointerMove,
		handlePickBlock,
		handleSolve,
		clearBoard,
		fillBoard,
		handleImageUpload,
	} = useBlockBlast();

	return (
		<div className={styles.page}>
			<div className={styles.backRow}>
				<BackButton />
			</div>
			<h1 className={styles.title}>Block Blast 助手</h1>
			<p className={styles.hint}>
				點擊或<b>按住拖曳</b>
				網格來快速設定藍色方塊。點擊下方三個框框選擇你要放入的圖形。
			</p>

			<div
				className={styles.board}
				onPointerDown={handleBoardPointerDown}
				onPointerMove={handleBoardPointerMove}
			>
				{board.map((row, r) =>
					row.map((cell, c) => {
						const overlaySteps = overlay[r][c];
						const step = overlaySteps[0];
						const stepText = overlaySteps.join(",");
						return (
							<div
								key={`${r}-${c}`}
								className={styles.cell}
								data-row={r}
								data-col={c}
								data-filled={cell === 1 ? "true" : undefined}
								data-step={step}
							>
								{stepText}
							</div>
						);
					}),
				)}
			</div>

			<div className={styles.slots}>
				{[0, 1, 2].map((slotIndex) => {
					const blockId = selectedBlocks[slotIndex];
					const blockData = availableBlocks.find((b) => b.id === blockId);
					return (
						<div
							key={slotIndex}
							className={styles.slot}
							data-active={activeSlot === slotIndex ? "true" : undefined}
							onClick={() => setActiveSlot(activeSlot === slotIndex ? null : slotIndex)}
						>
							{blockData ? <MiniBlock matrix={blockData.matrix} /> : "點擊選擇"}
						</div>
					);
				})}
			</div>

			{activeSlot !== null && (
				<div className={styles.picker}>
					{availableBlocks.map((block) => (
						<div
							key={block.id}
							className={styles.pickerItem}
							onClick={() => handlePickBlock(block.id)}
						>
							<MiniBlock matrix={block.matrix} />
						</div>
					))}
				</div>
			)}

			<div className={styles.actions}>
				<button className={styles.button} onClick={handleSolve} disabled={loading}>
					{loading ? "計算中..." : "計算最佳解"}
				</button>
				<button className={styles.button} data-variant="fill" onClick={fillBoard}>
					填滿盤面
				</button>
				<label className={styles.button} data-variant="camera">
					<Camera size={20} />
					截圖辨識
					<input type="file" accept="image/*" onChange={handleImageUpload} hidden />
				</label>
				<button className={styles.button} data-variant="clear" onClick={clearBoard}>
					清空盤面
				</button>
			</div>

			{solution && (
				<div className={styles.result}>
					{solution.status === "success" ? (
						<div>
							<h3 className={styles.resultTitle}>解答完成！</h3>
							<p>
								請參考上方盤面的數字順序 <b>1 → 2 → 3</b> 放入方塊。
							</p>
						</div>
					) : (
						<p className={styles.error}>{solution.message}</p>
					)}
				</div>
			)}

			<Toast toast={toast} onClose={dismissToast} />
		</div>
	);
}
