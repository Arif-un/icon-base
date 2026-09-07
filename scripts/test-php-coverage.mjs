// Runs the PHP (Pest) suite with coverage.
// Pest 5 / PHPUnit 13 need PHP >= 8.4. PHP resolution order:
//   1. PHP_BIN, if set and new enough.
//   2. `php` on PATH, if new enough.
//   3. else the NEWEST PHP >= MIN found installed on the system (Homebrew, ServBay,
//      the studio php-bin dir). If none, show an error.
// Coverage driver: use xdebug/pcov if already loaded, else auto-locate xdebug.so next
// to the chosen php, else XDEBUG_SO, else error. Extra CLI args forward to pest.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const MIN = [8, 4]; // Pest 5 / PHPUnit 13 floor

const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || (a[2] || 0) - (b[2] || 0);

function versionOf(bin) {
  const r = spawnSync(bin, ["-r", "echo PHP_VERSION;"], { encoding: "utf8" });
  if (r.status !== 0 || !r.stdout) return null;
  const m = r.stdout.match(/^(\d+)\.(\d+)\.(\d+)/);
  return m ? [+m[1], +m[2], +m[3]] : null;
}
const meetsMin = (v) => v && cmp(v, MIN) >= 0;

// Every php binary worth probing, most-likely first.
function candidates() {
  const list = [];
  if (process.env.PHP_BIN) list.push(process.env.PHP_BIN);
  list.push("php", "php8.6", "php8.5", "php8.4");
  // <root>/<dir>/<tail> — Homebrew formulae and the studio php-bin versions.
  for (const [root, tail] of [
    ["/opt/homebrew/opt", "bin/php"],
    ["/usr/local/opt", "bin/php"],
    [join(homedir(), ".studio/php-bin"), "php"],
  ]) {
    if (!existsSync(root)) continue;
    for (const d of readdirSync(root)) {
      const p = join(root, d, tail);
      if (existsSync(p)) list.push(p);
    }
  }
  // ServBay: /Applications/ServBay/package/php/<major>/<full>/bin/php
  const sb = "/Applications/ServBay/package/php";
  if (existsSync(sb)) {
    for (const a of readdirSync(sb)) {
      try {
        for (const b of readdirSync(join(sb, a))) {
          const p = join(sb, a, b, "bin/php");
          if (existsSync(p)) list.push(p);
        }
      } catch {} // not a dir
    }
  }
  return [...new Set(list)];
}

function canCover(bin) {
  const mods = spawnSync(bin, ["-m"], { encoding: "utf8" }).stdout || "";
  if (/^(xdebug|pcov)$/im.test(mods)) return true;
  if (process.env.XDEBUG_SO) return existsSync(process.env.XDEBUG_SO);
  return !!findXdebug(bin);
}

function resolvePhp() {
  // Explicit override wins if it satisfies the version floor.
  if (process.env.PHP_BIN && meetsMin(versionOf(process.env.PHP_BIN))) return process.env.PHP_BIN;
  // Rank valid candidates: coverage-capable first, then newest version.
  const scored = [];
  for (const c of candidates()) {
    const v = versionOf(c);
    if (meetsMin(v)) scored.push({ bin: c, v, cover: canCover(c) });
  }
  scored.sort((a, b) => Number(b.cover) - Number(a.cover) || cmp(b.v, a.v));
  return scored[0]?.bin || null;
}

function findXdebug(bin) {
  const cands = [];
  if (bin.includes("/")) {
    const d = dirname(bin);
    cands.push(join(d, "..", "ext", "xdebug.so"), join(d, "ext", "xdebug.so"));
  }
  const extDir = spawnSync(bin, ["-r", "echo ini_get('extension_dir');"], { encoding: "utf8" }).stdout;
  if (extDir) cands.push(join(extDir, "xdebug.so"));
  return cands.find(existsSync) || null;
}

const PHP = resolvePhp();
if (!PHP) {
  console.error(
    `No PHP >= ${MIN.join(".")} found (required by Pest 5 / PHPUnit 13). ` +
      `Install PHP ${MIN.join(".")}+ or set PHP_BIN to its path.`,
  );
  process.exit(1);
}
console.error(`test:php using ${PHP} (${(versionOf(PHP) || []).join(".")})`);

const modules = spawnSync(PHP, ["-m"], { encoding: "utf8" }).stdout || "";
const hasDriver = /^(xdebug|pcov)$/im.test(modules);

const phpArgs = ["-d", "xdebug.mode=coverage"];
if (!hasDriver) {
  const so = process.env.XDEBUG_SO || findXdebug(PHP);
  if (!so) {
    console.error(`No coverage driver for ${PHP}. Install xdebug/pcov or set XDEBUG_SO to an xdebug.so path.`);
    process.exit(1);
  }
  phpArgs.unshift("-d", `zend_extension=${so}`);
}
phpArgs.push("./vendor/bin/pest", "--coverage", ...process.argv.slice(2));

const result = spawnSync(PHP, phpArgs, {
  stdio: "inherit",
  env: { ...process.env, XDEBUG_MODE: "coverage" },
});

process.exit(result.status ?? 1);
