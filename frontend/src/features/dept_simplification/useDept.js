import { useCallback, useEffect, useMemo, useState } from "react";

import { triggerHaptic } from "../../utils/haptics";
import {
	createExpense,
	createPerson,
	deleteExpense,
	deletePerson,
	fetchOverview,
	resetAll,
} from "./api";

const TOAST_DURATION_MS = 3200;

const emptyOverview = () => ({
	persons: [],
	expenses: [],
	balances: [],
	settlements: [],
	original_edges: 0,
	simplified_count: 0,
});

/** 負責「資料與動作」；表單狀態由各表單元件自己管理。 */
export function useDept() {
	const [overview, setOverview] = useState(emptyOverview);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [toast, setToast] = useState(null);

	const notify = useCallback((message, type = "ok") => setToast({ message, type }), []);
	const dismissToast = useCallback(() => setToast(null), []);

	useEffect(() => {
		if (!toast) return undefined;
		const id = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
		return () => window.clearTimeout(id);
	}, [toast]);

	const load = useCallback(async () => {
		const data = await fetchOverview();
		if (data?.persons) setOverview(data);
	}, []);

	useEffect(() => {
		let active = true;
		const init = async () => {
			try {
				await load();
			} catch (err) {
				if (active) notify(err.message || "無法連線後端", "error");
			} finally {
				if (active) setLoading(false);
			}
		};
		init();
		return () => {
			active = false;
		};
	}, [load, notify]);

	/** 執行一個會改動資料的動作，成功後重新載入。回傳是否成功。 */
	const run = useCallback(
		async (task, successMessage) => {
			setBusy(true);
			try {
				await task();
				await load();
				if (successMessage) notify(successMessage);
				return true;
			} catch (err) {
				triggerHaptic.warning();
				notify(err.message || "操作失敗", "error");
				return false;
			} finally {
				setBusy(false);
			}
		},
		[load, notify],
	);

	const actions = useMemo(
		() => ({
			refresh: () => run(load),
			addPerson: (name) => run(() => createPerson(name), `已加入 ${name}`),
			removePerson: (person) =>
				run(() => deletePerson(person.id), `已移除 ${person.name}`),
			/** buildPayload 在 run 內執行，所以驗證錯誤會自動變成錯誤 Toast。 */
			addExpense: async (buildPayload, successMessage) => {
				const ok = await run(() => createExpense(buildPayload()), successMessage);
				if (ok) triggerHaptic.medium();
				return ok;
			},
			removeExpense: (expenseId) => {
				triggerHaptic.heavy();
				return run(() => deleteExpense(expenseId), "已刪除這筆記錄");
			},
			resetAll: () => {
				triggerHaptic.heavy();
				return run(resetAll, "資料已全部重置");
			},
		}),
		[run, load],
	);

	const sortedBalances = useMemo(
		() => [...overview.balances].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)),
		[overview.balances],
	);

	return {
		overview,
		persons: overview.persons,
		loading,
		busy,
		toast,
		notify,
		dismissToast,
		sortedBalances,
		savedCount: Math.max(overview.original_edges - overview.simplified_count, 0),
		settledEveryone:
			overview.persons.length > 0 &&
			overview.settlements.length === 0 &&
			overview.expenses.length > 0,
		actions,
	};
}
