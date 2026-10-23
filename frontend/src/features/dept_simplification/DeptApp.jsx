import { RefreshCw, Sparkles } from "lucide-react";

import BackButton from "../../components/BackButton/BackButton";
import { cx } from "../../utils/cx";
import styles from "./DeptApp.module.css";
import BalanceBoard from "./components/BalanceBoard";
import DangerPanel from "./components/DangerPanel";
import ExpensePanel from "./components/ExpensePanel";
import HistoryPanel from "./components/HistoryPanel";
import MemberPanel from "./components/MemberPanel";
import SettlementPanel from "./components/SettlementPanel";
import Toast from "./components/Toast";
import { useDept } from "./useDept";

export default function DeptApp() {
	const {
		overview,
		persons,
		loading,
		busy,
		toast,
		notify,
		dismissToast,
		sortedBalances,
		savedCount,
		settledEveryone,
		actions,
	} = useDept();

	return (
		<div className={styles.page}>
			<div className={styles.container}>
				<BackButton />

				<header className={styles.header}>
					<div>
						<p className={styles.badge}>
							<Sparkles aria-hidden="true" />
							最少轉帳結算
						</p>
						<h1 className={styles.title}>分帳與債務簡化</h1>
						<p className={styles.description}>
							記下一筆群組花費或代墊，系統會用淨額配對算出最少轉帳次數，避免大家互相還來還去。
						</p>
					</div>
					<button type="button" className={styles.refresh} onClick={actions.refresh}>
						<RefreshCw
							className={cx(loading || busy ? styles.spin : "")}
							aria-hidden="true"
						/>
						重新整理
					</button>
				</header>

				<BalanceBoard
					balances={sortedBalances}
					memberCount={persons.length}
					loading={loading}
				/>

				<div className={styles.layout}>
					<div className={styles.column}>
						<MemberPanel
							persons={persons}
							busy={busy}
							onAdd={actions.addPerson}
							onRemove={actions.removePerson}
						/>
						<ExpensePanel
							persons={persons}
							busy={busy}
							onAddExpense={actions.addExpense}
						/>
					</div>

					<div className={styles.column}>
						<SettlementPanel
							overview={overview}
							savedCount={savedCount}
							settledEveryone={settledEveryone}
							onNotify={notify}
						/>
						<HistoryPanel
							expenses={overview.expenses}
							persons={persons}
							onDelete={actions.removeExpense}
						/>
						<DangerPanel busy={busy} onReset={actions.resetAll} />
					</div>
				</div>
			</div>

			<Toast toast={toast} onClose={dismissToast} />
		</div>
	);
}
