import { describe, expect, it } from "vitest";

import { buildDirectExpense, buildGroupExpense } from "./buildExpense";

const group = (overrides = {}) => ({
	description: "晚餐",
	amount: "1000",
	currency: "TWD",
	rate: 1,
	payerId: "1",
	participantIds: [1, 2, 3],
	...overrides,
});

describe("buildGroupExpense", () => {
	it("splits evenly in cents and keeps the total exact", () => {
		const payload = buildGroupExpense(group());
		expect(payload.total_cents).toBe(100000);
		expect(payload.payer_id).toBe(1);
		expect(payload.splits.map((s) => s.amount_cents)).toEqual([33334, 33333, 33333]);
		expect(payload.splits.reduce((sum, s) => sum + s.amount_cents, 0)).toBe(payload.total_cents);
	});

	it("converts foreign currency and records the original amount", () => {
		const payload = buildGroupExpense(group({ amount: "3000", currency: "JPY", rate: 0.2134 }));
		expect(payload.total_cents).toBe(64020);
		expect(payload.description).toBe("晚餐 (原外幣: 3000 JPY)");
	});

	it("falls back to a default description", () => {
		expect(buildGroupExpense(group({ description: "  " })).description).toBe("群組花費");
	});

	it("rejects invalid input with a readable message", () => {
		expect(() => buildGroupExpense(group({ amount: "" }))).toThrow("請填寫金額");
		expect(() => buildGroupExpense(group({ participantIds: [] }))).toThrow("至少選擇一位");
		expect(() => buildGroupExpense(group({ amount: "0" }))).toThrow("大於 0");
		expect(() => buildGroupExpense(group({ rate: null, currency: "JPY" }))).toThrow("匯率");
	});

	it("rejects an amount too small to give everyone at least one cent", () => {
		expect(() => buildGroupExpense(group({ amount: "0.02" }))).toThrow("金額太小");
	});
});

describe("buildDirectExpense", () => {
	const direct = (overrides = {}) => ({
		description: "",
		amount: "120",
		currency: "TWD",
		rate: 1,
		payerId: "1",
		debtorId: "2",
		...overrides,
	});

	it("builds a single full-amount split for the debtor", () => {
		expect(buildDirectExpense(direct())).toEqual({
			description: "指定代墊",
			total_cents: 12000,
			payer_id: 1,
			splits: [{ person_id: 2, amount_cents: 12000 }],
		});
	});

	it("rejects missing or identical people", () => {
		expect(() => buildDirectExpense(direct({ debtorId: "" }))).toThrow("請選擇雙方");
		expect(() => buildDirectExpense(direct({ debtorId: "1" }))).toThrow("不能相同");
	});
});
