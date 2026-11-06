// Exercise live filter editing through the real dashboard editor without a runner.
import assert from "node:assert/strict";
import { DashboardComponent } from "../src/ui/dashboard.ts";

function row(id: string, number: number | null, name: string) {
	return {
		meta: { id, name, cwd: "/repo", repoCwd: "/repo", createdAt: 1 },
		state: { semanticState: "idle", processState: "exited", summary: "Waiting", pendingQuestions: [] },
		alive: false, hostAlive: false, hostActive: false, hostReady: false,
		codeRefs: number === null ? null : { pr: { kind: "pr", number }, allRefs: [{ kind: "pr", number }] },
	};
}
const rows = [row("pr227", 227, "Review"), row("pr234", 234, "Review"), row("other", null, "Other")];
const tui = { terminal: { rows: 24, cols: 80, columns: 80, write: () => {} }, requestRender: () => {} };
const theme = { fg: (_c: string, text: string) => text, bold: (text: string) => text, bg: (_c: string, text: string) => text };
const board = new DashboardComponent(tui as never, theme as never, { matches: () => false } as never, () => {}, {
	service: { rows: () => rows } as never, root: "/", defaultCwd: "/", availableModels: [], currentModel: null, currentThinkingLevel: "off",
});
// SAFETY: test-only observation of the dashboard's currently visible rows/query.
const probe = board as unknown as { rows: Array<{ meta: { id: string } }>; filterQuery: string };
const ids = () => probe.rows.map((r) => r.meta.id);
try {
	board.handleInput("/");
	assert.deepEqual(ids(), ["pr227", "pr234", "other"]);
	board.handleInput("2");
	assert.deepEqual(ids(), ["pr227", "pr234"]);
	board.handleInput("2");
	assert.deepEqual(ids(), ["pr227"]);
	board.handleInput("7");
	assert.equal(probe.filterQuery, "227");
	assert.deepEqual(ids(), ["pr227"]);
	board.handleInput("\r");
	assert.deepEqual(ids(), ["pr227"], "Enter keeps the applied filter");
} finally {
	board.dispose();
}
console.log("pr-filter-progressive-ok");
