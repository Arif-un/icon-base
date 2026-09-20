import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Minimal config for Stryker mutation runs. The main vite.config.ts carries a
// copy-fonts plugin (buildStart, writes to assets/) and a jotai-babel preset
// that both break inside Stryker's sandbox. Pure-util mutation targets
// (svgUtils.ts) need none of that — just React + happy-dom.
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "happy-dom",
    globals: true,
    // Scoped to the logic-layer tests that match the Stryker `mutate` targets.
    // The full app suite pulls in router/wp deps that break the minimal config.
    include: [
      "frontend/src/blocks/icon/utils/*.test.{tsx,ts}",
      "frontend/src/common/**/*.test.{tsx,ts}",
    ],
    setupFiles: ["./frontend/src/config/test.setup.ts"],
  },
});
