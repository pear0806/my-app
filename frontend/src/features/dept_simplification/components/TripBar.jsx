import { Plus, Plane } from "lucide-react";
import { useState } from "react";

import { cx } from "../../../utils/cx";
import ui from "../ui.module.css";
import styles from "./TripBar.module.css";

export default function TripBar({ trips, activeTripId, busy, onSelect, onCreate }) {
	const [creating, setCreating] = useState(false);
	const [name, setName] = useState("");
	const trimmed = name.trim();
	// 還沒有任何旅程時一定要先建立一個，所以直接展開輸入框
	const showForm = creating || trips.length === 0;

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!trimmed) return;
		if (await onCreate(trimmed)) {
			setName("");
			setCreating(false);
		}
	};

	return (
		<div className={styles.bar}>
			<Plane className={styles.icon} aria-hidden="true" />

			{trips.length > 0 && (
				<label className={styles.selectLabel}>
					<span className={styles.srOnly}>目前旅程</span>
					<select
						className={cx(ui.select, styles.select)}
						value={activeTripId ?? ""}
						disabled={busy}
						onChange={(e) => onSelect(Number(e.target.value))}
					>
						{trips.map((t) => (
							<option key={t.id} value={t.id}>
								{t.name}
							</option>
						))}
					</select>
				</label>
			)}

			{showForm ? (
				<form className={styles.form} onSubmit={handleSubmit}>
					<input
						type="text"
						className={ui.input}
						placeholder={trips.length === 0 ? "建立第一個旅程，例如：日本五日遊" : "新旅程名稱"}
						aria-label="新旅程名稱"
						maxLength={60}
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
					<button
						type="submit"
						className={cx(ui.button, ui.buttonGreen)}
						disabled={busy || !trimmed}
					>
						建立
					</button>
					{trips.length > 0 && (
						<button type="button" className={ui.linkButton} onClick={() => setCreating(false)}>
							取消
						</button>
					)}
				</form>
			) : (
				<button
					type="button"
					className={cx(ui.button, ui.buttonDark)}
					disabled={busy}
					onClick={() => setCreating(true)}
				>
					<Plus aria-hidden="true" />
					新旅程
				</button>
			)}
		</div>
	);
}
