import { Wallet } from "lucide-react";
import { useState } from "react";

import { cx } from "../../../utils/cx";
import { buildDirectExpense, buildGroupExpense } from "../buildExpense";
import ui from "../ui.module.css";
import { BASE_CURRENCY, useExchangeRate } from "../useExchangeRate";
import styles from "./ExpensePanel.module.css";

const CURRENCIES = [
	{ code: "TWD", label: "台幣 TWD" },
	{ code: "JPY", label: "日圓 JPY" },
	{ code: "THB", label: "泰銖 THB" },
	{ code: "MYR", label: "馬幣 MYR" },
	{ code: "USD", label: "美金 USD" },
];

/** 若目前選的人已不存在（例如被刪除），退回第一位成員。 */
const resolveId = (persons, id) =>
	persons.some((p) => String(p.id) === id) ? id : String(persons[0]?.id ?? "");

function PersonSelect({ label, value, persons, onChange, withPlaceholder }) {
	return (
		<label className={ui.fieldLabel}>
			{label}
			<select className={ui.select} value={value} onChange={(e) => onChange(e.target.value)}>
				{withPlaceholder && <option value="">請選擇</option>}
				{persons.map((p) => (
					<option key={p.id} value={p.id}>
						{p.name}
					</option>
				))}
			</select>
		</label>
	);
}

function AmountField({ fx, value, onChange, placeholder }) {
	const showHint = fx.currency !== BASE_CURRENCY && Number(value) > 0;
	return (
		<div>
			<div className={styles.amountRow}>
				<select
					className={cx(ui.select, styles.currencySelect)}
					aria-label="幣別"
					value={fx.currency}
					onChange={(e) => fx.setCurrency(e.target.value)}
				>
					{CURRENCIES.map((c) => (
						<option key={c.code} value={c.code}>
							{c.label}
						</option>
					))}
				</select>
				<input
					type="number"
					inputMode="decimal"
					min="0"
					step="0.01"
					className={ui.input}
					placeholder={placeholder}
					value={value}
					onChange={(e) => onChange(e.target.value)}
				/>
			</div>
			{showHint && (
				<p className={styles.rateHint} data-status={fx.status}>
					{fx.status === "loading" && "即時匯率轉換中…"}
					{fx.status === "error" && (
						<>
							匯率取得失敗{" "}
							<button type="button" className={ui.linkButton} onClick={fx.retry}>
								重試
							</button>
						</>
					)}
					{fx.status === "ready" &&
						`≈ NT$ ${Math.round(Number(value) * fx.rate)}（1 ${fx.currency} = ${fx.rate.toFixed(4)} TWD）`}
				</p>
			)}
		</div>
	);
}

function GroupForm({ persons, busy, fx, onSubmit }) {
	const [desc, setDesc] = useState("");
	const [amount, setAmount] = useState("");
	const [payerId, setPayerId] = useState("");
	// 記「被排除」的人而不是「被選中」的人：新增成員時會自動加入分攤
	const [excludedIds, setExcludedIds] = useState([]);

	const payer = resolveId(persons, payerId);
	const participantIds = persons.filter((p) => !excludedIds.includes(p.id)).map((p) => p.id);

	const toggle = (id) =>
		setExcludedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

	const handleSubmit = async (e) => {
		e.preventDefault();
		const ok = await onSubmit({
			description: desc,
			amount,
			currency: fx.currency,
			rate: fx.rate,
			payerId: payer,
			participantIds,
		});
		if (ok) {
			setDesc("");
			setAmount("");
		}
	};

	return (
		<form onSubmit={handleSubmit} className={ui.form}>
			<input
				type="text"
				className={ui.input}
				placeholder="用途，例如晚餐"
				aria-label="用途"
				value={desc}
				onChange={(e) => setDesc(e.target.value)}
			/>
			<AmountField fx={fx} value={amount} onChange={setAmount} placeholder="總金額" />
			<PersonSelect label="誰先付錢" value={payer} persons={persons} onChange={setPayerId} />

			<div>
				<div className={styles.splitHeader}>
					<span>誰要分攤（自動平分到分）</span>
					<button type="button" className={ui.linkButton} onClick={() => setExcludedIds([])}>
						全選
					</button>
				</div>
				<div className={styles.chips}>
					{persons.map((p) => (
						<button
							type="button"
							key={p.id}
							className={styles.chip}
							aria-pressed={participantIds.includes(p.id)}
							onClick={() => toggle(p.id)}
						>
							{p.name}
						</button>
					))}
				</div>
			</div>

			<button
				type="submit"
				className={cx(ui.button, ui.buttonGreen, ui.buttonBlock)}
				disabled={busy || persons.length === 0 || fx.status === "loading"}
			>
				記錄群組花費
			</button>
		</form>
	);
}

function DirectForm({ persons, busy, fx, onSubmit }) {
	const [desc, setDesc] = useState("");
	const [amount, setAmount] = useState("");
	const [payerId, setPayerId] = useState("");
	const [debtorId, setDebtorId] = useState("");

	const payer = resolveId(persons, payerId);
	const debtor = persons.some((p) => String(p.id) === debtorId) ? debtorId : "";

	const handleSubmit = async (e) => {
		e.preventDefault();
		const ok = await onSubmit({
			description: desc,
			amount,
			currency: fx.currency,
			rate: fx.rate,
			payerId: payer,
			debtorId: debtor,
		});
		if (ok) {
			setDesc("");
			setAmount("");
			setDebtorId("");
		}
	};

	return (
		<form onSubmit={handleSubmit} className={ui.form}>
			<input
				type="text"
				className={ui.input}
				placeholder="用途，例如代買飲料"
				aria-label="用途"
				value={desc}
				onChange={(e) => setDesc(e.target.value)}
			/>
			<AmountField fx={fx} value={amount} onChange={setAmount} placeholder="代墊金額" />
			<PersonSelect label="誰出錢" value={payer} persons={persons} onChange={setPayerId} />
			<PersonSelect
				label="幫誰出"
				value={debtor}
				persons={persons}
				onChange={setDebtorId}
				withPlaceholder
			/>
			<button
				type="submit"
				className={cx(ui.button, ui.buttonAmber, ui.buttonBlock)}
				disabled={busy || persons.length < 2 || fx.status === "loading"}
			>
				記錄指定代墊
			</button>
		</form>
	);
}

export default function ExpensePanel({ persons, busy, onAddExpense }) {
	const [tab, setTab] = useState("split");
	const [currency, setCurrency] = useState(BASE_CURRENCY);
	const { rate, status, retry } = useExchangeRate(currency);
	const fx = { currency, setCurrency, rate, status, retry };

	return (
		<section className={ui.panel}>
			<div className={ui.panelHeader}>
				<Wallet aria-hidden="true" />
				<h2 className={ui.panelTitle}>記一筆</h2>
			</div>

			<div className={styles.tabs} role="tablist">
				{[
					{ id: "split", label: "群組平分" },
					{ id: "direct", label: "一對一代墊" },
				].map((t) => (
					<button
						key={t.id}
						type="button"
						role="tab"
						className={styles.tab}
						aria-selected={tab === t.id}
						onClick={() => setTab(t.id)}
					>
						{t.label}
					</button>
				))}
			</div>

			{tab === "split" ? (
				<GroupForm
					persons={persons}
					busy={busy}
					fx={fx}
					onSubmit={(values) => onAddExpense(() => buildGroupExpense(values), "已記錄群組花費")}
				/>
			) : (
				<DirectForm
					persons={persons}
					busy={busy}
					fx={fx}
					onSubmit={(values) => onAddExpense(() => buildDirectExpense(values), "已記錄代墊")}
				/>
			)}
		</section>
	);
}
