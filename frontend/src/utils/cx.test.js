import { expect, it } from "vitest";

import { cx } from "./cx";

it("joins truthy class names and skips the rest", () => {
	expect(cx("a", false, null, undefined, "", "b")).toBe("a b");
	expect(cx()).toBe("");
});
