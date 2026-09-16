const API_URL =
	import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/dept";

async function request(path, options = {}) {
	const res = await fetch(`${API_URL}${path}`, {
		headers: {
			"Content-Type": "application/json",
			...(options.headers ?? {}),
		},
		...options,
	});

	let data = null;
	const text = await res.text();
	if (text) {
		try {
			data = JSON.parse(text);
		} catch {
			data = { detail: text };
		}
	}

	if (!res.ok) {
		const detail = data?.detail;
		const message = Array.isArray(detail)
			? detail.map((item) => item.msg).join("、")
			: detail || "請求失敗";
		throw new Error(message);
	}
	return data;
}

export function fetchOverview() {
	return request("/overview/");
}

export function createPerson(name) {
	return request("/persons/", {
		method: "POST",
		body: JSON.stringify({ name }),
	});
}

export function deletePerson(id) {
	return request(`/persons/${id}`, { method: "DELETE" });
}

export function createExpense(payload) {
	return request("/expenses/", {
		method: "POST",
		body: JSON.stringify(payload),
	});
}

export function deleteExpense(id) {
	return request(`/expenses/${id}`, { method: "DELETE" });
}

export function resetAll() {
	return request("/reset/", { method: "DELETE" });
}
