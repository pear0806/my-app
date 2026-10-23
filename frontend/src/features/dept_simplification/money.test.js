import { describe, expect, it } from "vitest";

import { evenSplitCents, formatCents, fromCents, initials, toCents } from "./money";

describe("toCents / fromCents", () => {
	it("converts using integer cents, not float math", () => {
		expect(toCents("12.35")).toBe(1235); // 12.35 * 100 = 1235.0000000000002
		expect(toCents(0.1 + 0.2)).toBe(30);
		expect(fromCents(1235)).toBe(12.35);
	});

	it("treats junk input as 0", () => {
		expect(toCents("")).toBe(0);
		expect(toCents("abc")).toBe(0);
		expect(toCents(undefined)).toBe(0);
	});
});

describe("evenSplitCents", () => {
	it("gives the leftover cents to the first people", () => {
		expect(evenSplitCents(1000, 3)).toEqual([334, 333, 333]);
		expect(evenSplitCents(100, 3)).toEqual([34, 33, 33]);
	});

	it("always adds back up to the total", () => {
		for (const total of [1, 99, 1000, 123457]) {
			for (const count of [1, 2, 3, 7, 11]) {
				const parts = evenSplitCents(total, count);
				expect(parts).toHaveLength(count);
				expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
			}
		}
	});

	it("returns an empty list for nobody", () => {
		expect(evenSplitCents(1000, 0)).toEqual([]);
	});
});

describe("formatCents", () => {
	it("formats as NT$ with two decimals", () => {
		expect(formatCents(123450)).toBe("NT$1,234.50");
		expect(formatCents(0)).toBe("NT$0.00");
		expect(formatCents(undefined)).toBe("NT$0.00");
	});
});

describe("initials", () => {
	it("uses up to two characters", () => {
		expect(initials("小明")).toBe("小明");
		expect(initials("阿美美")).toBe("阿美");
		expect(initials("Amy Lin")).toBe("AL");
		expect(initials("  ")).toBe("?");
	});
});
