// Runs the PHP (Pest) suite with coverage, auto-loading a coverage driver.
// PHP + driver resolution lives in ./php-env.mjs (shared with the mutation script).
// Extra CLI args forward to pest.
import { spawnSync } from "node:child_process";
import { resolvePhp, driverArgs, versionOf, MIN } from "./php-env.mjs";

const PHP = resolvePhp();
if (!PHP) {
  console.error(
    `No PHP >= ${MIN.join(".")} found (required by Pest 5 / PHPUnit 13). ` +
      `Install PHP ${MIN.join(".")}+ or set PHP_BIN to its path.`,
  );
  process.exit(1);
}
console.error(`test:php using ${PHP} (${(versionOf(PHP) || []).join(".")})`);

// TIA (--tia) and mutation (--mutate) need the coverage driver loaded but drive their own
// reporting, so skip forcing --coverage for them; every other run gets coverage as before.
const passthrough = process.argv.slice(2);
const forceCoverage = !passthrough.some((a) => a === "--tia" || a === "--mutate");

// The Browser (e2e) suite needs a live wp-env + Playwright and contributes no PHP coverage,
// so keep it out of coverage/mutation/tia runs unless the caller selects a suite explicitly.
const hasSuite = passthrough.some((a) => a === "--testsuite" || a.startsWith("--testsuite="));
const suiteArgs = hasSuite ? [] : ["--testsuite=Unit,Integration"];

const phpArgs = [
  ...driverArgs(PHP),
  "./vendor/bin/pest",
  ...(forceCoverage ? ["--coverage"] : []),
  ...suiteArgs,
  ...passthrough,
];

const result = spawnSync(PHP, phpArgs, {
  stdio: "inherit",
  env: { ...process.env, XDEBUG_MODE: "coverage" },
});

process.exit(result.status ?? 1);
