import { useCallback, useEffect, useState } from "react";

export const BASE_CURRENCY = "TWD";

/**
 * 取得「1 單位外幣 = ? 台幣」。
 * rates 內：數字 = 已取得、false = 取得失敗、undefined = 尚未請求。
 * status / rate 都是從 rates 推導出來的，不需要在 effect 裡同步 setState。
 */
export function useExchangeRate(currency) {
	const [rates, setRates] = useState({});
	const known = currency === BASE_CURRENCY ? 1 : rates[currency];

	useEffect(() => {
		if (known !== undefined) return undefined;

		const controller = new AbortController();
		const remember = (value) => setRates((current) => ({ ...current, [currency]: value }));

		fetch(`https://open.er-api.com/v6/latest/${currency}`, {
			signal: controller.signal,
		})
			.then((res) => res.json())
			.then((data) => {
				const rate = data?.rates?.[BASE_CURRENCY];
				remember(Number.isFinite(rate) && rate > 0 ? rate : false);
			})
			.catch((err) => {
				if (err.name !== "AbortError") remember(false);
			});

		return () => controller.abort();
	}, [currency, known]);

	const retry = useCallback(() => {
		setRates((current) => {
			const next = { ...current };
			delete next[currency];
			return next;
		});
	}, [currency]);

	return {
		rate: typeof known === "number" ? known : null,
		status: known === undefined ? "loading" : known === false ? "error" : "ready",
		retry,
	};
}
