export function toCents(value) {
	const n = Number.parseFloat(value);
	if (!Number.isFinite(n)) return 0;
	return Math.round(n * 100);
}

export function fromCents(cents) {
	return cents / 100;
}

export function evenSplitCents(totalCents, count) {
	if (count <= 0) return [];
	const base = Math.floor(totalCents / count);
	const remainder = totalCents % count;
	return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function formatMoney(amount) {
	const n = Number(amount);
	if (!Number.isFinite(n)) return "$0.00";
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2,
	}).format(n);
}

export function initials(name) {
	const trimmed = (name ?? "").trim();
	if (!trimmed) return "?";
	const parts = trimmed.split(/\s+/);
	if (parts.length === 1) return Array.from(parts[0]).slice(0, 2).join("");
	return `${Array.from(parts[0])[0] ?? ""}${Array.from(parts[1])[0] ?? ""}`;
}
