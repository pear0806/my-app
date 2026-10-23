import { ArrowRight, Check, Copy, ImageDown } from "lucide-react";
import { useRef, useState } from "react";

import { formatMoney } from "../money";
import styles from "./SettlementPanel.module.css";
import ui from "../ui.module.css";

function subtitle({ expenseCount, settledEveryone, overview }) {
	if (expenseCount === 0) return "還沒有帳務。記一筆之後會自動算出轉帳。";
	if (settledEveryone) return "大家帳都平了，不用轉帳。";
	return `原本約 ${overview.original_edges} 筆往來，現在只要 ${overview.simplified_count} 筆。`;
}

export default function SettlementPanel({ overview, savedCount, settledEveryone, onNotify }) {
	const [copied, setCopied] = useState(false);
	const receiptRef = useRef(null);
	const { settlements } = overview;

	const copyText = async () => {
		const text = settlements
			.map((s) => `${s.from_person} → ${s.to_person} ${formatMoney(s.amount)}`)
			.join("\n");
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1600);
		} catch {
			onNotify("複製失敗，請檢查瀏覽器權限", "error");
		}
	};

	const exportImage = async () => {
		const element = receiptRef.current;
		if (!element) return;
		onNotify("📸 正在繪製請款圖卡...");
		try {
			// 只有按下匯出時才載入 html2canvas，避免拖慢首次載入
			const { default: html2canvas } = await import("html2canvas");
			const canvas = await html2canvas(element, {
				backgroundColor: getComputedStyle(element).backgroundColor,
				scale: 3,
			});
			const link = document.createElement("a");
			link.download = `分帳結算_${new Date().toISOString().slice(0, 10)}.png`;
			link.href = canvas.toDataURL("image/png");
			link.click();
		} catch (err) {
			onNotify(`圖卡生成失敗：${err.message ?? err}`, "error");
		}
	};

	return (
		<section className={styles.panel}>
			<div className={styles.header}>
				<div>
					<h2 className={ui.panelTitle}>結算方案</h2>
					<p className={styles.subtitle}>
						{subtitle({ expenseCount: overview.expenses.length, settledEveryone, overview })}
					</p>
				</div>
				{settlements.length > 0 && (
					<div className={styles.actions}>
						<button type="button" className={styles.actionButton} onClick={copyText}>
							{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
							{copied ? "已複製" : "文字"}
						</button>
						<button type="button" className={styles.actionButton} onClick={exportImage}>
							<ImageDown aria-hidden="true" />
							圖卡
						</button>
					</div>
				)}
			</div>

			{savedCount > 0 && (
				<p className={styles.saved}>少轉 {savedCount} 次，大家對一次就能結清。</p>
			)}

			{settlements.length === 0 ? (
				<p className={styles.empty}>目前沒有需要轉帳的債務。</p>
			) : (
				<div ref={receiptRef} className={styles.receipt}>
					<h3 className={styles.receiptTitle}>💰 群組結算清單</h3>
					<ul className={styles.list}>
						{settlements.map((s, idx) => (
							<li key={`${s.from_id}-${s.to_id}-${idx}`} className={styles.item}>
								<div className={styles.route}>
									<span className={styles.person}>{s.from_person}</span>
									<ArrowRight className={styles.arrow} aria-label="轉給" />
									<span className={styles.person}>{s.to_person}</span>
								</div>
								<span className={styles.amount}>{formatMoney(s.amount)}</span>
							</li>
						))}
					</ul>
					<p className={styles.watermark}>由 DeptApp 智慧結算生成</p>
				</div>
			)}
		</section>
	);
}
