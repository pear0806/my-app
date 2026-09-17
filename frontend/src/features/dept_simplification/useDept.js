import { useState, useCallback, useEffect, useMemo } from "react";
import {
	fetchOverview,
	createPerson,
	deletePerson,
	createExpense,
	deleteExpense,
	resetAll,
} from "./api";
import { evenSplitCents, fromCents, toCents } from "./money";

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

export function useDept() {
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

	const persons = overview.persons || [];

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
		if (!data || !data.persons) return;

		setOverview(data);
		setPayerId(
			(current) => current || String(data?.persons?.[0]?.id ?? ""),
		);
		setDirectPayerId(
			(current) => current || String(data?.persons?.[0]?.id ?? ""),
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
		let isMounted = true;
		const initLoad = async () => {
			try {
				await load();
			} catch (err) {
				if (isMounted) {
					notify(err.message || "無法連線後端", "error");
				}
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		};
		initLoad();
		return () => {
			isMounted = false;
		};
	}, [load, notify]);

	const run = async (fn, successMessage) => {
		setBusy(true);
		try {
			await fn();
			await load();
			if (successMessage) notify(successMessage);
		} catch (err) {
			// 處理 Axios 拋出的錯誤格式
			const errorMsg =
				err.response?.data?.detail || err.message || "操作失敗";
			notify(errorMsg, "error");
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
		if (totalCents <= 0) return notify("金額必須大於 0", "error");

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
		if (!directAmount || !directPayerId || !directDebtorId)
			return notify("請選擇雙方並填寫金額", "error");
		if (directPayerId === directDebtorId)
			return notify("出錢人與被代墊人不能相同", "error");

		const totalCents = toCents(directAmount);
		if (totalCents <= 0) return notify("金額必須大於 0", "error");

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
			.map((s) => `${s.from_person} → ${s.to_person} ${s.amount}`)
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

	// 將畫面需要的所有變數與函數「打包」送出去
	return {
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
	};
}
