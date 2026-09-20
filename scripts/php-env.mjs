// Shared PHP resolver + coverage-driver args for the PHP tooling scripts
// (Pest coverage and Pest --mutate both need PHP >= 8.4 with a coverage driver).
// PHP resolution order: PHP_BIN, then `php` on PATH, then the newest PHP >= MIN found
// installed (Homebrew, ServBay, studio php-bin). Coverage driver: use xdebug/pcov if
// already loaded, else auto-locate xdebug.so next to the chosen php, else XDEBUG_SO.
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

export function findXdebug(bin) {
  const cands = [];
  if (bin.includes("/")) {
    const d = dirname(bin);
    cands.push(join(d, "..", "ext", "xdebug.so"), join(d, "ext", "xdebug.so"));
  }
  const extDir = spawnSync(bin, ["-r", "echo ini_get('extension_dir');"], { encoding: "utf8" }).stdout;
  if (extDir) cands.push(join(extDir, "xdebug.so"));
  return cands.find(existsSync) || null;
}

function canCover(bin) {
  const mods = spawnSync(bin, ["-m"], { encoding: "utf8" }).stdout || "";
  if (/^(xdebug|pcov)$/im.test(mods)) return true;
  if (process.env.XDEBUG_SO) return existsSync(process.env.XDEBUG_SO);
  return !!findXdebug(bin);
}

export function resolvePhp() {
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

// PHP -d flags that guarantee a coverage driver is loaded for `php`. Exits with a clear
// message if none can be found (matching the old inline behaviour of the coverage script).
export function driverArgs(php) {
  const modules = spawnSync(php, ["-m"], { encoding: "utf8" }).stdout || "";
  const args = ["-d", "xdebug.mode=coverage"];
  if (/^(xdebug|pcov)$/im.test(modules)) return args;
  const so = process.env.XDEBUG_SO || findXdebug(php);
  if (!so) {
    console.error(`No coverage driver for ${php}. Install xdebug/pcov or set XDEBUG_SO to an xdebug.so path.`);
    process.exit(1);
  }
  return ["-d", `zend_extension=${so}`, ...args];
}

export { MIN, versionOf };
