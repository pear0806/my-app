import { formatMoney } from "../money";
import Avatar from "./Avatar";
import styles from "./BalanceBoard.module.css";

const BALANCE_EPSILON = 0.005;

function describeBalance(amount) {
	if (amount > BALANCE_EPSILON) return { tone: "positive", text: `應收 ${formatMoney(amount)}` };
	if (amount < -BALANCE_EPSILON) return { tone: "negative", text: `應付 ${formatMoney(-amount)}` };
	return { tone: "neutral", text: "已結清" };
}

export default function BalanceBoard({ balances, memberCount, loading }) {
	if (loading && memberCount === 0) {
		return <div className={styles.notice}>載入中…</div>;
	}
	if (memberCount === 0) {
		return (
			<div className={styles.notice} data-dashed>
				先加入成員，餘額看板就會出現在這裡。
			</div>
		);
	}
	return (
		<ul className={styles.board}>
			{balances.map((b) => {
				const { tone, text } = describeBalance(b.amount);
				return (
					<li key={b.person_id} className={styles.card}>
						<Avatar name={b.name} />
						<div className={styles.info}>
							<p className={styles.name}>{b.name}</p>
							<p className={styles.amount} data-tone={tone}>
								{text}
							</p>
						</div>
					</li>
				);
			})}
		</ul>
	);
}
