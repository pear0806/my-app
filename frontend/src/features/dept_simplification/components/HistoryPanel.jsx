import "react-swipeable-list/dist/styles.css";

import { Receipt, Trash2 } from "lucide-react";
import {
	SwipeableList,
	SwipeableListItem,
	SwipeAction,
	TrailingActions,
} from "react-swipeable-list";

import { formatCents } from "../money";
import ui from "../ui.module.css";
import styles from "./HistoryPanel.module.css";

function ExpenseItem({ expense, nameOf, onDelete }) {
	const isDirect =
		expense.splits.length === 1 && expense.splits[0].amount_cents === expense.total_cents;
	const payer = nameOf(expense.payer_id);

	const trailingActions = (
		<TrailingActions>
			<SwipeAction destructive onClick={() => onDelete(expense.id)}>
				<div className={styles.swipeDelete}>
					<Trash2 size={20} aria-hidden="true" />
					<span>刪除</span>
				</div>
			</SwipeAction>
		</TrailingActions>
	);

	return (
		<div className={styles.row}>
			<SwipeableListItem trailingActions={trailingActions}>
				<article className={styles.item}>
					<div className={styles.itemHeader}>
						<div>
							<p className={styles.description}>{expense.description}</p>
							<p className={styles.detail}>
								{isDirect
									? `${payer} 幫 ${nameOf(expense.splits[0].person_id)} 代墊 ${formatCents(expense.total_cents)}`
									: `總額 ${formatCents(expense.total_cents)}，由 ${payer} 先付`}
							</p>
						</div>
						{/* 滑鼠使用者看不到滑動提示，所以在精準指標裝置上多給一顆按鈕 */}
						<button
							type="button"
							className={`${ui.iconButton} ${styles.deleteButton}`}
							title="刪除這筆"
							aria-label={`刪除「${expense.description}」`}
							onClick={() => onDelete(expense.id)}
						>
							<Trash2 aria-hidden="true" />
						</button>
					</div>

					{!isDirect && (
						<div className={styles.tags}>
							{expense.splits.map((s) => {
								const isPayer = s.person_id === expense.payer_id;
								return (
									<span key={s.id} className={styles.tag} data-role={isPayer ? "payer" : "debtor"}>
										{nameOf(s.person_id)} {isPayer ? "自付" : "欠"} {formatCents(s.amount_cents)}
									</span>
								);
							})}
						</div>
					)}
				</article>
			</SwipeableListItem>
		</div>
	);
}

export default function HistoryPanel({ expenses, persons, onDelete }) {
	const names = new Map(persons.map((p) => [p.id, p.name]));
	const nameOf = (id) => names.get(id) ?? "未知";

	return (
		<section className={ui.panel}>
			<div className={ui.panelHeader}>
				<Receipt aria-hidden="true" />
				<h2 className={ui.panelTitle}>歷史明細</h2>
			</div>

			{expenses.length === 0 ? (
				<p className={ui.emptyText}>目前尚無任何紀錄</p>
			) : (
				<SwipeableList>
					{expenses.map((exp) => (
						<ExpenseItem key={exp.id} expense={exp} nameOf={nameOf} onDelete={onDelete} />
					))}
				</SwipeableList>
			)}
		</section>
	);
}
