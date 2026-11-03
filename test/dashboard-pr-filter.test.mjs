import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const probe = fileURLToPath(new URL("../test-support/dashboard-pr-filter.ts", import.meta.url));

test("bare PR numbers narrow the dashboard as each digit is typed", () => {
	const output = execFileSync(process.execPath, ["--experimental-transform-types", probe], { encoding: "utf8", timeout: 20_000 });
	assert.match(output, /pr-filter-progressive-ok/);
});
