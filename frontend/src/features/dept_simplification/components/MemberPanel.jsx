import { Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";

import ui from "../ui.module.css";
import { cx } from "../../../utils/cx";
import Avatar from "./Avatar";
import styles from "./MemberPanel.module.css";

export default function MemberPanel({ persons, busy, onAdd, onRemove }) {
	const [name, setName] = useState("");
	const trimmed = name.trim();

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!trimmed) return;
		if (await onAdd(trimmed)) setName("");
	};

	return (
		<section className={ui.panel}>
			<div className={ui.panelHeader}>
				<Users aria-hidden="true" />
				<h2 className={ui.panelTitle}>成員</h2>
			</div>

			<form onSubmit={handleSubmit} className={styles.addForm}>
				<input
					type="text"
					className={ui.input}
					placeholder="輸入名字"
					aria-label="成員名字"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
				<button type="submit" className={cx(ui.button, ui.buttonDark)} disabled={busy || !trimmed}>
					<Plus aria-hidden="true" />
					新增
				</button>
			</form>

			<ul className={styles.list}>
				{persons.map((p) => (
					<li key={p.id} className={styles.member}>
						<Avatar name={p.name} />
						<span>{p.name}</span>
						<button
							type="button"
							className={ui.iconButton}
							title="刪除成員"
							aria-label={`刪除成員 ${p.name}`}
							disabled={busy}
							onClick={() => onRemove(p)}
						>
							<Trash2 aria-hidden="true" />
						</button>
					</li>
				))}
			</ul>
		</section>
	);
}
