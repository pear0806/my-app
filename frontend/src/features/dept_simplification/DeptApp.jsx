import '../../App.css';
import './App.css';

import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Check,
    Copy,
    Plus,
    Receipt,
    RefreshCw,
    Sparkles,
    Trash2,
    Users,
    Wallet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import {
    formatMoney,
    initials,
} from './money';
import { useDept } from './useDept';

function Toast({ toast, onClose }) {
	if (!toast) return null;
	const isError = toast.type === "error";
	return (
		<div
			className={`toast-container ${isError ? "toast-error" : "toast-success"}`}
		>
			<div className="toast-content">
				<div className="toast-indicator" />
				<p className="toast-message">{toast.message}</p>
				<button
					type="button"
					onClick={onClose}
					className="toast-close-btn"
				>
					關閉
				</button>
			</div>
		</div>
	);
}

function Avatar({ name }) {
	return <span className="avatar">{initials(name)}</span>;
}

export default function App() {
	const navigate = useNavigate();
	const {
		overview,
		loading,
		busy,
		toast,
		setToast,
		tab,
		setTab,
		newPersonName,
		setNewPersonName,
		desc,
		setDesc,
		amount,
		setAmount,
		payerId,
		setPayerId,
		selectedParticipants,
		setSelectedParticipants,
		directDesc,
		setDirectDesc,
		directAmount,
		setDirectAmount,
		directPayerId,
		setDirectPayerId,
		directDebtorId,
		setDirectDebtorId,
		copied,
		persons,
		sortedBalances,
		savedCount,
		settledEveryone,
		handleAddPerson,
		toggleParticipant,
		handleAddGroupExpense,
		handleAddDirectDebt,
		copySettlements,
		run,
		deletePerson,
		deleteExpense,
		resetAll,
		load,
	} = useDept();

	return (
		<div className="app-container">
			<header className="app-header">
				<button onClick={() => navigate(`/`)} className="btn-back">
					<ArrowLeft size={20}></ArrowLeft>
				</button>
				<div className="header-titles">
					<p className="badge">
						<Sparkles />
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
					<RefreshCw className={loading || busy ? "icon-spin" : ""} />
					重新整理
				</button>
			</header>

			<section className="balances-section">
				{loading && persons.length === 0 ? (
					<div className="message-box">載入中…</div>
				) : persons.length === 0 ? (
					<div className="message-box border-dashed">
						先加入成員，餘額看板就會出現在這裡。
					</div>
				) : (
					sortedBalances.map((b) => {
						const owed = b.amount > 0.005;
						const owes = b.amount < -0.005;
						return (
							<article key={b.person_id} className="balance-card">
								<div className="balance-card-content">
									<Avatar name={b.name} />
									<div className="balance-info">
										<p className="person-name">{b.name}</p>
										<p
											className={`balance-amount ${owed ? "text-positive" : owes ? "text-negative" : "text-neutral"}`}
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

			<div className="main-layout-grid">
				<div className="left-column">
					<section className="panel-card">
						<div className="panel-header">
							<Users />
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
								className="input-field"
							/>
							<button
								type="submit"
								disabled={busy || !newPersonName.trim()}
								className="btn-primary"
							>
								<Plus /> 新增
							</button>
						</form>
						<ul className="participant-list">
							{persons.map((p) => (
								<li key={p.id} className="participant-item">
									<Avatar name={p.name} />
									<span>{p.name}</span>
									<button
										type="button"
										title="刪除成員"
										onClick={() =>
											run(
												() => deletePerson(p.id),
												`已移除 ${p.name}`,
											)
										}
										className="btn-icon-danger"
									>
										<Trash2 />
									</button>
								</li>
							))}
						</ul>
					</section>

					<section className="panel-card">
						<div className="panel-header">
							<Wallet />
							<h2>記一筆</h2>
						</div>
						<div className="tab-container">
							<button
								type="button"
								onClick={() => setTab("split")}
								className={`tab-btn ${tab === "split" ? "active" : ""}`}
							>
								群組平分
							</button>
							<button
								type="button"
								onClick={() => setTab("direct")}
								className={`tab-btn ${tab === "direct" ? "active" : ""}`}
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
									className="input-field"
								/>
								<input
									type="number"
									min="0"
									step="0.01"
									placeholder="總金額"
									value={amount}
									onChange={(e) => setAmount(e.target.value)}
									className="input-field"
								/>

								<label className="form-label">
									誰先付錢
									<select
										value={payerId}
										onChange={(e) =>
											setPayerId(e.target.value)
										}
										className="select-field"
									>
										{persons.map((p) => (
											<option key={p.id} value={p.id}>
												{p.name}
											</option>
										))}
									</select>
								</label>

								<div className="split-participants-section">
									<div className="split-header">
										<span>誰要分攤（自動平分到分）</span>
										<button
											type="button"
											onClick={() =>
												setSelectedParticipants(
													persons.map((p) => p.id),
												)
											}
											className="btn-link"
										>
											全選
										</button>
									</div>
									<div className="split-buttons">
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
													className={`participant-toggle-btn ${on ? "selected" : ""}`}
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
									className="btn-submit-green"
								>
									記錄群組花費
								</button>
							</form>
						) : (
							<form
								onSubmit={handleAddDirectDebt}
								className="expense-form"
							>
								<input
									type="text"
									placeholder="用途，例如代買飲料"
									value={directDesc}
									onChange={(e) =>
										setDirectDesc(e.target.value)
									}
									className="input-field"
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
									className="input-field"
								/>

								<label className="form-label">
									誰出錢
									<select
										value={directPayerId}
										onChange={(e) =>
											setDirectPayerId(e.target.value)
										}
										className="select-field"
									>
										<option value="">請選擇</option>
										{persons.map((p) => (
											<option key={p.id} value={p.id}>
												{p.name}
											</option>
										))}
									</select>
								</label>

								<label className="form-label">
									幫誰出
									<select
										value={directDebtorId}
										onChange={(e) =>
											setDirectDebtorId(e.target.value)
										}
										className="select-field"
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
									className="btn-submit-orange"
								>
									記錄指定代墊
								</button>
							</form>
						)}
					</section>
				</div>

				<div className="right-column">
					<section className="panel-card settlement-panel">
						<div className="settlement-header">
							<div>
								<h2>結算方案</h2>
								<p className="settlement-subtitle">
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
									className="btn-copy"
								>
									{copied ? <Check /> : <Copy />}
									{copied ? "已複製" : "複製"}
								</button>
							)}
						</div>

						{savedCount > 0 && (
							<p className="saved-count-alert">
								少轉 {savedCount} 次，大家對一次就能結清。
							</p>
						)}

						{overview.settlements.length === 0 ? (
							<p className="no-settlement-msg">
								目前沒有需要轉帳的債務。
							</p>
						) : (
							<ul className="settlement-list">
								{overview.settlements.map((s, idx) => (
									<li
										key={`${s.from_id}-${s.to_id}-${idx}`}
										className="settlement-item"
									>
										<div className="settlement-route">
											<span className="person-name">
												{s.from_person}
											</span>
											<ArrowRight className="icon-arrow" />
											<span className="person-name">
												{s.to_person}
											</span>
										</div>
										<span className="settlement-amount">
											{formatMoney(s.amount)}
										</span>
									</li>
								))}
							</ul>
						)}
					</section>

					<section className="panel-card">
						<div className="panel-header">
							<Receipt />
							<h2>歷史明細</h2>
						</div>
						{overview.expenses.length === 0 ? (
							<p className="empty-msg">目前尚無任何紀錄</p>
						) : (
							<ul className="history-list">
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
											className="history-item"
										>
											<div className="history-item-header">
												<div>
													<p className="history-desc">
														{exp.description}
													</p>
													{isDirectDebt ? (
														<p className="history-sub-desc">
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
														<p className="history-sub-desc">
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
													className="btn-icon-danger"
													title="刪除這筆"
												>
													<Trash2 />
												</button>
											</div>
											{!isDirectDebt && (
												<div className="history-splits">
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
																className={`split-tag ${isPayer ? "tag-payer" : "tag-debtor"}`}
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

					<section className="panel-card danger-panel">
						<div className="danger-header">
							<AlertTriangle />
							<h2>重置這一輪</h2>
						</div>
						<p className="danger-desc">
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
							className="btn-danger-full"
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
