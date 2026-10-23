import { evenSplitCents, fromCents, toCents } from "./money";

/**
 * 把表單輸入組成後端需要的 payload。
 * 驗證失敗時 throw Error，訊息會直接顯示在 Toast 上。
 */

function toTwdCents(amount, rate) {
	if (rate == null) throw new Error("尚未取得匯率，請稍後再試");
	const totalCents = toCents(Number.parseFloat(amount) * rate);
	if (totalCents <= 0) throw new Error("金額必須大於 0");
	return totalCents;
}

function withForeignNote(description, amount, currency) {
	return currency === "TWD"
		? description
		: `${description} (原外幣: ${amount} ${currency})`;
}

export function buildGroupExpense({
	description,
	amount,
	currency,
	rate,
	payerId,
	participantIds,
}) {
	if (!amount || !payerId || participantIds.length === 0) {
		throw new Error("請填寫金額，並至少選擇一位分攤人");
	}
	const totalCents = toTwdCents(amount, rate);
	const parts = evenSplitCents(totalCents, participantIds.length);

	return {
		description: withForeignNote(description.trim() || "群組花費", amount, currency),
		total_amount: fromCents(totalCents),
		payer_id: Number(payerId),
		splits: participantIds.map((personId, index) => ({
			person_id: personId,
			amount: fromCents(parts[index]),
		})),
	};
}

export function buildDirectExpense({
	description,
	amount,
	currency,
	rate,
	payerId,
	debtorId,
}) {
	if (!amount || !payerId || !debtorId) throw new Error("請選擇雙方並填寫金額");
	if (payerId === debtorId) throw new Error("出錢人與被代墊人不能相同");
	const totalCents = toTwdCents(amount, rate);

	return {
		description: withForeignNote(description.trim() || "指定代墊", amount, currency),
		total_amount: fromCents(totalCents),
		payer_id: Number(payerId),
		splits: [{ person_id: Number(debtorId), amount: fromCents(totalCents) }],
	};
}
