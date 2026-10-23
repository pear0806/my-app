import { describe, expect, it } from "vitest";

import { extractMessage } from "./apiClient";

const fail = (data, message = "Request failed with status code 400") => ({
	message,
	response: { data },
});

describe("extractMessage", () => {
	it("uses a string detail from FastAPI", () => {
		expect(extractMessage(fail({ detail: "這個名字已經存在" }))).toBe("這個名字已經存在");
	});

	it("joins 422 validation errors instead of returning an object", () => {
		const detail = [{ msg: "名字不可為空白" }, { msg: "Field required" }];
		expect(extractMessage(fail({ detail }))).toBe("名字不可為空白、Field required");
	});

	it("falls back to the error message, then a default", () => {
		expect(extractMessage({ message: "Network Error" })).toBe("Network Error");
		expect(extractMessage({})).toBe("請求失敗");
	});
});
