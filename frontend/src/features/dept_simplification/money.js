export function toCents(value) {
	const n = Number.parseFloat(value);
	if (!Number.isFinite(n)) return 0;
	return Math.round(n * 100);
}

export function fromCents(cents) {
	return cents / 100;
}

/** 把 totalCents 平分給 count 個人，餘數從前面的人開始多 1 分。 */
export function evenSplitCents(totalCents, count) {
	if (count <= 0) return [];
	const base = Math.floor(totalCents / count);
	const remainder = totalCents % count;
	return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

const twdFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "TWD",
	minimumFractionDigits: 2,
});

/** 把「分」格式化成 NT$1,234.50。 */
export function formatCents(cents) {
	const n = Number(cents);
	return twdFormatter.format(Number.isFinite(n) ? fromCents(n) : 0);
}

export function initials(name) {
	const trimmed = (name ?? "").trim();
	if (!trimmed) return "?";
	const parts = trimmed.split(/\s+/);
	if (parts.length === 1) return Array.from(parts[0]).slice(0, 2).join("");
	return `${Array.from(parts[0])[0] ?? ""}${Array.from(parts[1])[0] ?? ""}`;
}
