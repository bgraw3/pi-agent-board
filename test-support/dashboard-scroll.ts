// Exercise the real dashboard viewport and keyboard navigation on crowded screens.
// Run with --experimental-transform-types for DashboardComponent parameter properties.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createView } from "../src/core/store.mjs";
import { createService } from "../src/runtime/service.mjs";
import { DashboardComponent } from "../src/ui/dashboard.ts";

const root = mkdtempSync(join(tmpdir(), "agentview-scroll-"));
let dashboard;
try {
	for (let i = 0; i < 30; i++) {
		createView(root, { id: `v${i}`, name: `session-${i}`, cwd: root });
	}
	const service = createService({
		root,
		runnerScript: "/no/runner.mjs",
		piCommand: "pi",
		piArgsPrefix: [],
		defaultCwd: root,
		launch: () => ({ pid: null, configPath: "/no/config.json" }),
		launchHost: () => ({ pid: null, configPath: "/no/host-config.json" }),
		launchTitle: () => ({ pid: null, configPath: "/no/title-config.json" }),
	});
	const tui = {
		terminal: { rows: 24, cols: 120, columns: 120, write: () => {} },
		requestRender: () => {},
	};
	const theme = { fg: (_c, text) => text, bold: (text) => text };
	dashboard = new DashboardComponent(tui, theme, {}, () => {}, {
		service, root, defaultCwd: root, availableModels: [],
		currentModel: null, currentThinkingLevel: "off",
	});

	// Reproduce moving up onto the first sliced line with a hidden line above.
	dashboard.scrollTop = 1;
	const selected = "  › running session";
	const body = ["RUNNING", selected, ...Array.from({ length: 10 }, (_, i) => `row ${i}`)];
	assert.ok(dashboard.windowBody(body, 5).lines.includes(selected), "up marker must not overwrite selection");

	// Every selection must survive both clipping boundaries, even on a resize
	// leaving only one or two body lines. Counts include the replaced lines.
	for (let capacity = 1; capacity <= 14; capacity++) {
		for (let start = 0; start < 12; start++) {
			for (let sel = 0; sel < 12; sel++) {
				dashboard.scrollTop = start;
				const body = Array.from({ length: 12 }, (_, i) => i === sel ? selected : `row ${i}`);
				const { lines } = dashboard.windowBody(body, capacity);
				assert.ok(lines.includes(selected), `selection ${sel}, start ${start}, capacity ${capacity}`);
				assert.ok(lines.length <= capacity);
				if (lines[0].includes("↑")) {
					assert.equal(lines[0], `  ↑ ${dashboard.scrollTop + 1} more`);
				}
				if (lines.at(-1).includes("↓")) {
					assert.equal(lines.at(-1), `  ↓ ${body.length - dashboard.scrollTop - capacity + 1} more`);
				}
			}
		}
	}

	// Drive public input and render after every step, including wraparound and
	// changing terminal height while the viewport is scrolled down.
	for (const height of [24, 16, 12, 24]) {
		tui.terminal.rows = height;
		for (const key of ["\x1b[B", "\x1b[A"]) {
			for (let step = 0; step <= dashboard.orderedIds.length; step++) {
				const row = service.rows().find((row) => row.meta.id === dashboard.selectedId);
				const lines = dashboard.render(120);
				assert.equal(lines.length, height);
				assert.ok(lines.some((line) => line.includes("›") && line.includes(row.meta.name)),
					`selected ${row.meta.name} must be visible at height ${height}`);
				dashboard.handleInput(key);
			}
		}
	}
	console.log(JSON.stringify({ ok: true }));
} finally {
	dashboard?.dispose();
	rmSync(root, { recursive: true, force: true });
}
