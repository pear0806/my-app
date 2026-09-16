import { useCallback, useEffect, useMemo, useState } from "react";
import {
	ArrowRight,
	Check,
	Copy,
	Plus,
	Trash2,
	Users,
	Wallet,
	RefreshCw,
	Sparkles,
	AlertTriangle,
	Receipt,
} from "lucide-react";
import {
	createExpense,
	createPerson,
	deleteExpense,
	deletePerson,
	fetchOverview,
	resetAll,
} from "./api";
import {
	evenSplitCents,
	formatMoney,
	fromCents,
	initials,
	toCents,
} from "./money";

import "./App.css";

function Toast({ toast, onClose }) {
	if (!toast) return null;
	const isError = toast.type === "error";
	return (
		<div className="toast">
			<div className="toast-content">
				<div
					className={`toast-indicator ${isError ? "is-error" : "is-success"}`}
				/>
				<p className="toast-message">{toast.message}</p>
				<button type="button" onClick={onClose} className="toast-close">
					關閉
				</button>
			</div>
		</div>
	);
}

function Avatar({ name }) {
	return <span className="avatar">{initials(name)}</span>;
}

function emptyOverview() {
	return {
		persons: [],
		expenses: [],
		balances: [],
		settlements: [],
		original_edges: 0,
		simplified_count: 0,
	};
}

export default function App() {
	const [overview, setOverview] = useState(emptyOverview);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [toast, setToast] = useState(null);
	const [tab, setTab] = useState("split");

	const [newPersonName, setNewPersonName] = useState("");
	const [desc, setDesc] = useState("");
	const [amount, setAmount] = useState("");
	const [payerId, setPayerId] = useState("");
	const [selectedParticipants, setSelectedParticipants] = useState([]);

	const [directDesc, setDirectDesc] = useState("");
	const [directAmount, setDirectAmount] = useState("");
	const [directPayerId, setDirectPayerId] = useState("");
	const [directDebtorId, setDirectDebtorId] = useState("");

	const [copied, setCopied] = useState(false);

	const persons = overview.persons;
	const notify = useCallback((message, type = "ok") => {
		setToast({ message, type });
	}, []);

	useEffect(() => {
		if (!toast) return undefined;
		const id = window.setTimeout(() => setToast(null), 3200);
		return () => window.clearTimeout(id);
	}, [toast]);

	const load = useCallback(async () => {
		const data = await fetchOverview();
		setOverview(data);
		setPayerId((current) => current || String(data.persons[0]?.id ?? ""));
		setDirectPayerId(
			(current) => current || String(data.persons[0]?.id ?? ""),
		);
		setSelectedParticipants((current) => {
			if (current.length > 0) {
				return current.filter((id) =>
					data.persons.some((p) => p.id === id),
				);
			}
			return data.persons.map((p) => p.id);
		});
	}, []);

	useEffect(() => {
		load()
			.catch((err) => notify(err.message || "無法連線後端", "error"))
			.finally(() => setLoading(false));
	}, [load, notify]);

	const run = async (fn, successMessage) => {
		setBusy(true);
		try {
			await fn();
			await load();
			if (successMessage) notify(successMessage);
		} catch (err) {
			notify(err.message || "操作失敗", "error");
		} finally {
			setBusy(false);
		}
	};

	const handleAddPerson = (e) => {
		e.preventDefault();
		const name = newPersonName.trim();
		if (!name) return;
		run(async () => {
			await createPerson(name);
			setNewPersonName("");
		}, `已加入 ${name}`);
	};

	const toggleParticipant = (id) => {
		setSelectedParticipants((current) =>
			current.includes(id)
				? current.filter((p) => p !== id)
				: [...current, id],
		);
	};

	const handleAddGroupExpense = (e) => {
		e.preventDefault();
		if (
			!desc.trim() ||
			!amount ||
			!payerId ||
			selectedParticipants.length === 0
		) {
			notify("請填寫用途、金額，並至少選擇一位分攤人", "error");
			return;
		}
		const totalCents = toCents(amount);
		if (totalCents <= 0) {
			notify("金額必須大於 0", "error");
			return;
		}
		const parts = evenSplitCents(totalCents, selectedParticipants.length);
		const splits = selectedParticipants.map((pid, index) => ({
			person_id: pid,
			amount: fromCents(parts[index]),
		}));
		run(async () => {
			await createExpense({
				description: desc.trim(),
				total_amount: fromCents(totalCents),
				payer_id: Number(payerId),
				splits,
			});
			setDesc("");
			setAmount("");
		}, "已記錄群組花費");
	};

	const handleAddDirectDebt = (e) => {
		e.preventDefault();
		if (!directAmount || !directPayerId || !directDebtorId) {
			notify("請選擇雙方並填寫金額", "error");
			return;
		}
		if (directPayerId === directDebtorId) {
			notify("出錢人與被代墊人不能相同", "error");
			return;
		}
		const totalCents = toCents(directAmount);
		if (totalCents <= 0) {
			notify("金額必須大於 0", "error");
			return;
		}
		run(async () => {
			await createExpense({
				description: directDesc.trim() || "指定代墊",
				total_amount: fromCents(totalCents),
				payer_id: Number(directPayerId),
				splits: [
					{
						person_id: Number(directDebtorId),
						amount: fromCents(totalCents),
					},
				],
			});
			setDirectDesc("");
			setDirectAmount("");
			setDirectDebtorId("");
		}, "已記錄代墊");
	};

	const copySettlements = async () => {
		if (overview.settlements.length === 0) return;
		const text = overview.settlements
			.map(
				(s) =>
					`${s.from_person} → ${s.to_person} ${formatMoney(s.amount)}`,
			)
			.join("\n");
		await navigator.clipboard.writeText(text);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1600);
	};

	const savedCount = Math.max(
		overview.original_edges - overview.simplified_count,
		0,
	);
	const settledEveryone =
		persons.length > 0 &&
		overview.settlements.length === 0 &&
		overview.expenses.length > 0;

	const sortedBalances = useMemo(
		() =>
			[...overview.balances].sort(
				(a, b) => Math.abs(b.amount) - Math.abs(a.amount),
			),
		[overview.balances],
	);

	return (
		<div className="app-container">
			<header className="page-header">
				<div className="header-intro">
					<p className="feature-badge">
						<Sparkles className="badge-icon" />
						最少轉帳結算
					</p>
					<h1 className="page-title">分帳與債務簡化</h1>
					<p className="page-description">
						記下一筆群組花費或代墊，系統會用淨額配對算出最少轉帳次數，避免大家互相還來還去。
					</p>
				</div>
				<button
					type="button"
					onClick={() => run(load)}
					className="btn-refresh"
				>
					<RefreshCw
						className={`refresh-icon ${loading || busy ? "is-spinning" : ""}`}
					/>
					重新整理
				</button>
			</header>

			<section className="dashboard-grid">
				{loading && persons.length === 0 ? (
					<div className="dashboard-card is-loading">載入中…</div>
				) : persons.length === 0 ? (
					<div className="dashboard-card is-empty">
						先加入成員，餘額看板就會出現在這裡。
					</div>
				) : (
					sortedBalances.map((b) => {
						const owed = b.amount > 0.005;
						const owes = b.amount < -0.005;
						const statusClass = owed
							? "is-owed"
							: owes
								? "is-debt"
								: "is-settled";
						return (
							<article
								key={b.person_id}
								className="person-balance-card"
							>
								<div className="balance-wrapper">
									<Avatar name={b.name} />
									<div className="balance-details">
										<p className="person-name">{b.name}</p>
										<p
											className={`balance-amount ${statusClass}`}
										>
											{owed
												? `應收 ${formatMoney(b.amount)}`
												: owes
													? `應付 ${formatMoney(-b.amount)}`
													: "已結清"}
										</p>
									</div>
								</div>
							</article>
						);
					})
				)}
			</section>

			<div className="content-layout">
				<div className="layout-column">
					<section className="module-card">
						<div className="module-header">
							<Users className="module-icon" />
							<h2>成員</h2>
						</div>
						<form
							onSubmit={handleAddPerson}
							className="add-person-form"
						>
							<input
								type="text"
								placeholder="輸入名字"
								value={newPersonName}
								onChange={(e) =>
									setNewPersonName(e.target.value)
								}
								className="form-input"
							/>
							<button
								type="submit"
								disabled={busy || !newPersonName.trim()}
								className="btn-primary"
							>
								<Plus className="btn-icon" />
								新增
							</button>
						</form>
						<ul className="member-list">
							{persons.map((p) => (
								<li key={p.id} className="member-item">
									<Avatar name={p.name} />
									<span className="member-name">
										{p.name}
									</span>
									<button
										type="button"
										title="刪除成員"
										onClick={() =>
											run(
												() => deletePerson(p.id),
												`已移除 ${p.name}`,
											)
										}
										className="btn-delete"
									>
										<Trash2 />
									</button>
								</li>
							))}
						</ul>
					</section>

					<section className="module-card">
						<div className="module-header">
							<Wallet className="module-icon" />
							<h2>記一筆</h2>
						</div>
						<div className="transaction-tabs">
							<button
								type="button"
								onClick={() => setTab("split")}
								className={`tab-item ${tab === "split" ? "is-active" : ""}`}
							>
								群組平分
							</button>
							<button
								type="button"
								onClick={() => setTab("direct")}
								className={`tab-item ${tab === "direct" ? "is-active" : ""}`}
							>
								一對一代墊
							</button>
						</div>

						{tab === "split" ? (
							<form
								onSubmit={handleAddGroupExpense}
								className="expense-form"
							>
								<input
									type="text"
									placeholder="用途，例如晚餐"
									value={desc}
									onChange={(e) => setDesc(e.target.value)}
									className="form-input"
								/>
								<input
									type="number"
									min="0"
									step="0.01"
									placeholder="總金額"
									value={amount}
									onChange={(e) => setAmount(e.target.value)}
									className="form-input"
								/>
								<label className="form-field">
									<span className="field-label">
										誰先付錢
									</span>
									<select
										value={payerId}
										onChange={(e) =>
											setPayerId(e.target.value)
										}
										className="form-input"
									>
										{persons.map((p) => (
											<option key={p.id} value={p.id}>
												{p.name}
											</option>
										))}
									</select>
								</label>
								<div className="form-field">
									<div className="field-header">
										<span className="field-label">
											誰要分攤（自動平分到分）
										</span>
										<button
											type="button"
											onClick={() =>
												setSelectedParticipants(
													persons.map((p) => p.id),
												)
											}
											className="btn-text"
										>
											全選
										</button>
									</div>
									<div className="participant-selector">
										{persons.map((p) => {
											const on =
												selectedParticipants.includes(
													p.id,
												);
											return (
												<button
													type="button"
													key={p.id}
													onClick={() =>
														toggleParticipant(p.id)
													}
													className={`selector-chip ${on ? "is-selected" : ""}`}
												>
													{p.name}
												</button>
											);
										})}
									</div>
								</div>
								<button
									type="submit"
									disabled={busy || persons.length === 0}
									className="btn-submit"
								>
									記錄群組花費
								</button>
							</form>
						) : (
							<form
								onSubmit={handleAddDirectDebt}
								className="expense-form is-direct-mode"
							>
								<input
									type="text"
									placeholder="用途，例如代買飲料"
									value={directDesc}
									onChange={(e) =>
										setDirectDesc(e.target.value)
									}
									className="form-input"
								/>
								<input
									type="number"
									min="0"
									step="0.01"
									placeholder="代墊金額"
									value={directAmount}
									onChange={(e) =>
										setDirectAmount(e.target.value)
									}
									className="form-input"
								/>
								<label className="form-field">
									<span className="field-label">誰出錢</span>
									<select
										value={directPayerId}
										onChange={(e) =>
											setDirectPayerId(e.target.value)
										}
										className="form-input"
									>
										<option value="">請選擇</option>
										{persons.map((p) => (
											<option key={p.id} value={p.id}>
												{p.name}
											</option>
										))}
									</select>
								</label>
								<label className="form-field">
									<span className="field-label">幫誰出</span>
									<select
										value={directDebtorId}
										onChange={(e) =>
											setDirectDebtorId(e.target.value)
										}
										className="form-input"
									>
										<option value="">請選擇</option>
										{persons.map((p) => (
											<option key={p.id} value={p.id}>
												{p.name}
											</option>
										))}
									</select>
								</label>
								<button
									type="submit"
									disabled={busy || persons.length < 2}
									className="btn-submit"
								>
									記錄指定代墊
								</button>
							</form>
						)}
					</section>
				</div>

				<div className="layout-column">
					<section className="module-card is-dark">
						<div className="dark-header">
							<div className="dark-titles">
								<h2>結算方案</h2>
								<p className="dark-subtitle">
									{overview.expenses.length === 0
										? "還沒有帳務。記一筆之後會自動算出轉帳。"
										: settledEveryone
											? "大家帳都平了，不用轉帳。"
											: `原本約 ${overview.original_edges} 筆往來，現在只要 ${overview.simplified_count} 筆。`}
								</p>
							</div>
							{overview.settlements.length > 0 && (
								<button
									type="button"
									onClick={copySettlements}
									className="btn-action-ghost"
								>
									{copied ? (
										<Check className="action-icon" />
									) : (
										<Copy className="action-icon" />
									)}
									{copied ? "已複製" : "複製"}
								</button>
							)}
						</div>
						{savedCount > 0 && (
							<p className="summary-alert">
								少轉 {savedCount} 次，大家對一次就能結清。
							</p>
						)}
						{overview.settlements.length === 0 ? (
							<p className="empty-message">
								目前沒有需要轉帳的債務。
							</p>
						) : (
							<ul className="settlement-route-list">
								{overview.settlements.map((s, idx) => (
									<li
										key={`${s.from_id}-${s.to_id}-${idx}`}
										className="route-item"
									>
										<div className="route-path">
											<span className="route-person">
												{s.from_person}
											</span>
											<ArrowRight className="route-arrow" />
											<span className="route-person">
												{s.to_person}
											</span>
										</div>
										<span className="route-amount">
											{formatMoney(s.amount)}
										</span>
									</li>
								))}
							</ul>
						)}
					</section>

					<section className="module-card">
						<div className="module-header">
							<Receipt className="module-icon" />
							<h2>歷史明細</h2>
						</div>
						{overview.expenses.length === 0 ? (
							<p className="empty-message">目前尚無任何紀錄</p>
						) : (
							<ul className="history-timeline">
								{overview.expenses.map((exp) => {
									const isDirectDebt =
										exp.splits.length === 1 &&
										Math.abs(
											exp.splits[0].amount -
												exp.total_amount,
										) < 0.005;
									const payer =
										persons.find(
											(p) => p.id === exp.payer_id,
										)?.name ?? "未知";
									return (
										<li
											key={exp.id}
											className="history-entry"
										>
											<div className="entry-header">
												<div className="entry-info">
													<p className="entry-title">
														{exp.description}
													</p>
													{isDirectDebt ? (
														<p className="entry-subtitle">
															{payer} 幫{" "}
															{persons.find(
																(p) =>
																	p.id ===
																	exp
																		.splits[0]
																		.person_id,
															)?.name ??
																"未知"}{" "}
															代墊{" "}
															{formatMoney(
																exp.total_amount,
															)}
														</p>
													) : (
														<p className="entry-subtitle">
															總額{" "}
															{formatMoney(
																exp.total_amount,
															)}
															，由 {payer} 先付
														</p>
													)}
												</div>
												<button
													type="button"
													onClick={() =>
														run(
															() =>
																deleteExpense(
																	exp.id,
																),
															"已刪除這筆記錄",
														)
													}
													className="btn-delete"
													title="刪除這筆"
												>
													<Trash2 />
												</button>
											</div>
											{!isDirectDebt && (
												<div className="entry-splits">
													{exp.splits.map((s) => {
														const isPayer =
															s.person_id ===
															exp.payer_id;
														const name =
															persons.find(
																(p) =>
																	p.id ===
																	s.person_id,
															)?.name ?? "未知";
														return (
															<span
																key={s.id}
																className={`split-tag ${isPayer ? "is-payer" : "is-debtor"}`}
															>
																{name}{" "}
																{isPayer
																	? "自付"
																	: "欠"}{" "}
																{formatMoney(
																	s.amount,
																)}
															</span>
														);
													})}
												</div>
											)}
										</li>
									);
								})}
							</ul>
						)}
					</section>

					<section className="module-card is-danger">
						<div className="danger-header">
							<AlertTriangle className="module-icon" />
							<h2>重置這一輪</h2>
						</div>
						<p className="danger-description">
							結清後若要開始新一輪，會刪除全部成員與帳務，無法復原。
						</p>
						<button
							type="button"
							disabled={busy}
							onClick={() => {
								const ok = window.confirm(
									"確定要刪除所有人員與帳務資料嗎？此動作無法復原。",
								);
								if (!ok) return;
								run(async () => {
									await resetAll();
									setPayerId("");
									setDirectPayerId("");
									setDirectDebtorId("");
									setSelectedParticipants([]);
								}, "資料已全部重置");
							}}
							className="btn-danger"
						>
							清空所有資料
						</button>
					</section>
				</div>
			</div>

			<Toast toast={toast} onClose={() => setToast(null)} />
		</div>
	);
}
