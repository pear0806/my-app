import { AlertTriangle } from "lucide-react";

import { cx } from "../../../utils/cx";
import ui from "../ui.module.css";
import styles from "./DangerPanel.module.css";

export default function DangerPanel({ busy, onReset }) {
	const handleClick = () => {
		if (window.confirm("確定要刪除所有人員與帳務資料嗎？此動作無法復原。")) onReset();
	};

	return (
		<section className={styles.panel}>
			<div className={styles.header}>
				<AlertTriangle aria-hidden="true" />
				<h2 className={ui.panelTitle}>重置這一輪</h2>
			</div>
			<p className={styles.description}>
				結清後若要開始新一輪，會刪除全部成員與帳務，無法復原。
			</p>
			<button
				type="button"
				className={cx(ui.button, ui.buttonRose)}
				disabled={busy}
				onClick={handleClick}
			>
				清空所有資料
			</button>
		</section>
	);
}
