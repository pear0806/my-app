import { useCallback, useEffect, useMemo, useState } from "react";

import { useToast } from "../../hooks/useToast";
import { triggerHaptic } from "../../utils/haptics";
import {
	createExpense,
	createPerson,
	createTrip,
	deleteExpense,
	deletePerson,
	deleteTrip,
	fetchOverview,
	fetchTrips,
	resetTrip,
} from "./api";

const ACTIVE_TRIP_KEY = "dept.activeTripId";

const emptyOverview = () => ({
	trip: null,
	persons: [],
	expenses: [],
	balances: [],
	settlements: [],
	original_edges: 0,
	simplified_count: 0,
});

// localStorage 在隱私模式等情況可能丟錯，包起來避免整個頁面壞掉
function readStoredTripId() {
	try {
		const value = Number(window.localStorage.getItem(ACTIVE_TRIP_KEY));
		return Number.isInteger(value) && value > 0 ? value : null;
	} catch {
		return null;
	}
}

function storeTripId(id) {
	try {
		if (id == null) window.localStorage.removeItem(ACTIVE_TRIP_KEY);
		else window.localStorage.setItem(ACTIVE_TRIP_KEY, String(id));
	} catch {
		// 無法儲存就算了，下次開啟會退回第一個旅程
	}
}

/** 負責「資料與動作」；表單狀態由各表單元件自己管理。 */
export function useDept() {
	const { toast, notify, dismiss: dismissToast } = useToast();

	const [trips, setTrips] = useState([]);
	const [tripsReady, setTripsReady] = useState(false);
	const [activeTripId, setActiveTripId] = useState(readStoredTripId);
	const [overview, setOverview] = useState(emptyOverview);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);

	// 1. 啟動時載入旅程清單，並決定目前要看哪一個
	useEffect(() => {
		let active = true;
		const init = async () => {
			try {
				const list = await fetchTrips();
				if (!active) return;
				setTrips(list);
				setActiveTripId((current) =>
					list.some((t) => t.id === current) ? current : (list[0]?.id ?? null),
				);
			} catch (err) {
				if (active) notify(err.message || "無法連線後端", "error");
			} finally {
				if (active) setTripsReady(true);
			}
		};
		init();
		return () => {
			active = false;
		};
	}, [notify]);

	// 2. 旅程確定或切換後載入該旅程的內容（active 旗標避免舊請求覆蓋新結果）
	useEffect(() => {
		if (!tripsReady) return undefined;
		let active = true;
		const sync = async () => {
			if (activeTripId == null) {
				setOverview(emptyOverview());
				setLoading(false);
				return;
			}
			setLoading(true);
			try {
				const data = await fetchOverview(activeTripId);
				if (active) setOverview(data);
			} catch (err) {
				if (active) notify(err.message || "無法連線後端", "error");
			} finally {
				if (active) setLoading(false);
			}
		};
		sync();
		return () => {
			active = false;
		};
	}, [tripsReady, activeTripId, notify]);

	const selectTrip = useCallback((id) => {
		setOverview(emptyOverview()); // 避免切換瞬間還看到上一個旅程的資料
		setActiveTripId(id);
		storeTripId(id);
	}, []);

	/**
	 * 執行一個會改動資料的動作。task 的回傳值交給 apply 處理；回傳是否成功。
	 * 後端會直接回傳最新的 overview，所以一個動作只需要一次請求。
	 */
	const run = useCallback(
		async (task, { success, apply = setOverview } = {}) => {
			setBusy(true);
			try {
				apply(await task());
				if (success) notify(success);
				return true;
			} catch (err) {
				triggerHaptic.warning();
				notify(err.message || "操作失敗", "error");
				return false;
			} finally {
				setBusy(false);
			}
		},
		[notify],
	);

	const actions = useMemo(() => {
		const tripId = activeTripId;

		/** 樂觀更新：先讓畫面上的東西消失，失敗再還原。 */
		const removeOptimistically = async (previous, optimistic, task, success) => {
			setOverview(optimistic);
			const ok = await run(task, { success });
			if (!ok) setOverview(previous);
			return ok;
		};

		return {
			refresh: () => run(() => fetchOverview(tripId)),

			addPerson: (name) => run(() => createPerson(tripId, name), { success: `已加入 ${name}` }),

			removePerson: (person) =>
				removeOptimistically(
					overview,
					{
						...overview,
						persons: overview.persons.filter((p) => p.id !== person.id),
						balances: overview.balances.filter((b) => b.person_id !== person.id),
					},
					() => deletePerson(tripId, person.id),
					`已移除 ${person.name}`,
				),

			/** buildPayload 在 run 內執行，所以驗證錯誤會自動變成錯誤 Toast。 */
			addExpense: async (buildPayload, success) => {
				const ok = await run(() => createExpense(tripId, buildPayload()), { success });
				if (ok) triggerHaptic.medium();
				return ok;
			},

			removeExpense: (expenseId) => {
				triggerHaptic.heavy();
				return removeOptimistically(
					overview,
					{ ...overview, expenses: overview.expenses.filter((e) => e.id !== expenseId) },
					() => deleteExpense(tripId, expenseId),
					"已刪除這筆記錄",
				);
			},

			resetTrip: () => {
				triggerHaptic.heavy();
				return run(() => resetTrip(tripId), { success: "已清空這個旅程的資料" });
			},

			addTrip: (name) =>
				run(() => createTrip(name), {
					success: `已建立旅程 ${name}`,
					apply: (created) => {
						setTrips((current) => [...current, created]);
						selectTrip(created.id);
					},
				}),

			removeTrip: () =>
				run(() => deleteTrip(tripId), {
					success: "已刪除旅程",
					apply: () => {
						const remaining = trips.filter((t) => t.id !== tripId);
						setTrips(remaining);
						selectTrip(remaining[0]?.id ?? null);
					},
				}),
		};
	}, [activeTripId, overview, trips, run, selectTrip]);

	const sortedBalances = useMemo(
		() =>
			[...overview.balances].sort((a, b) => Math.abs(b.amount_cents) - Math.abs(a.amount_cents)),
		[overview.balances],
	);

	return {
		trips,
		activeTrip: trips.find((t) => t.id === activeTripId) ?? null,
		selectTrip,
		overview,
		persons: overview.persons,
		loading: loading || !tripsReady,
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
