// One-shot quality gate: runs JS + PHP coverage and mutation quietly, then prints a single
// summary (pass/fail + headline metric). Per-tool output is suppressed; a failed step's last
// lines are shown so failures stay debuggable. Exits non-zero if any step failed.
// Metric parsing is best-effort: format drift only downgrades a metric to "see output".
import { spawnSync } from "node:child_process";

const STEPS = [
  { name: "JS coverage",   cmd: "pnpm",     args: ["run", "test:ts"],       metric: /All files\s*\|\s*([\d.]+)/ },
  { name: "JS mutation",   cmd: "pnpm",     args: ["run", "test:mutation"], metric: /All files\s*\|\s*([\d.]+)/ },
  { name: "PHP coverage",  cmd: "composer", args: ["test:coverage"],        metric: /Total:\s*([\d.]+)\s*%/ },
  { name: "PHP mutation",  cmd: "composer", args: ["test:mutation"],        metric: /Score:\s*([\d.]+)\s*%/ },
];

const results = [];
for (const s of STEPS) {
  process.stderr.write(`  running ${s.name}...`);
  const r = spawnSync(s.cmd, s.args, { encoding: "utf8" });
  const raw = (r.stdout || "") + (r.stderr || "");
  const out = raw.replace(/\x1b\[[0-9;]*m/g, ""); // strip ANSI so metric regexes match
  const m = out.match(s.metric);
  process.stderr.write(r.status === 0 ? " done\n" : " failed\n");
  results.push({ name: s.name, ok: r.status === 0, value: m ? `${m[1]}%` : "see output", out });
}

console.log("\n\x1b[1m==================== test:cover summary ====================\x1b[0m");
for (const r of results) {
  const tag = r.ok ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(`  ${tag}  ${r.name.padEnd(13)} ${r.value}`);
}
const failed = results.filter((r) => !r.ok);
console.log("\x1b[1m============================================================\x1b[0m");
console.log(failed.length ? `\x1b[31m${failed.length} step(s) failed\x1b[0m` : "\x1b[32mall passed\x1b[0m");

for (const r of failed) {
  console.log(`\n\x1b[31m--- ${r.name} (last 20 lines) ---\x1b[0m`);
  console.log(r.out.trimEnd().split("\n").slice(-20).join("\n"));
}
process.exit(failed.length ? 1 : 0);
