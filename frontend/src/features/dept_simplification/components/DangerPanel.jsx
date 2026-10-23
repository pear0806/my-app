import { AlertTriangle } from "lucide-react";

import { cx } from "../../../utils/cx";
import ui from "../ui.module.css";
import styles from "./DangerPanel.module.css";

export default function DangerPanel({ tripName, busy, onReset, onDeleteTrip }) {
	const confirmThen = (message, action) => () => {
		if (window.confirm(message)) action();
	};

	return (
		<section className={styles.panel}>
			<div className={styles.header}>
				<AlertTriangle aria-hidden="true" />
				<h2 className={ui.panelTitle}>危險區域</h2>
			</div>
			<p className={styles.description}>以下操作只影響「{tripName}」，無法復原。</p>
			<div className={styles.actions}>
				<button
					type="button"
					className={cx(ui.button, ui.buttonRose)}
					disabled={busy}
					onClick={confirmThen("確定要清空這個旅程的所有成員與帳務嗎？旅程本身會保留。", onReset)}
				>
					清空成員與帳務
				</button>
				<button
					type="button"
					className={cx(ui.button, ui.buttonRose)}
					disabled={busy}
					onClick={confirmThen(`確定要刪除整個旅程「${tripName}」嗎？`, onDeleteTrip)}
				>
					刪除這個旅程
				</button>
			</div>
		</section>
	);
}
