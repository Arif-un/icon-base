import fs from "node:fs";
import path from "node:path";

import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import fse from "fs-extra";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { humanId } from "human-id";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const { DEV_SSL, DEV_SSL_CERT_PATH, DEV_SSL_KEY_PATH } = env;
  // .env is gitignored, so it is absent on CI / fresh clones. Fall back to the
  // plugin's own constants (Config::SLUG / Config::VAR_PREFIX on the PHP side) so
  // the built asset filenames + window var always match what Head.php enqueues.
  // Without this the CSS ships as `main-undefined-ba-assets-*.css` (404) and the
  // localized object lands on `window.undefined`.
  const PLUGIN_SLUG = env.PLUGIN_SLUG || "icon-indexa";
  const SERVER_VARIABLES = env.SERVER_VARIABLES || "ICON_INDEXA_";

  const isDevelopment = mode === "development" || mode === "test";
  const isTest = mode === "test";
  const ASSETS_DIR = "assets";
  const codeName = humanId({ capitalize: false, separator: "-" });

  return {
    // Dev base must match the DEV_URL path the PHP side enqueues (Head.php), which is
    // derived from PLUGIN_SLUG — not the on-disk folder name, since the dev bundle is
    // served virtually by the Vite dev server, not from wp-content/plugins.
    base: isDevelopment ? `/wp-content/plugins/${PLUGIN_SLUG}/frontend/` : "",
    build: {
      emptyOutDir: true,
      outDir: `../${ASSETS_DIR}`,
      rolldownOptions: {
        input: path.resolve(import.meta.dirname, "frontend/src/main.tsx"),
        output: {
          assetFileNames: (fInfo) => {
            const pathArr = fInfo?.name?.split("/");
            const fileName = pathArr?.at(-1);

            if (fileName === "main.css") {
              return `main-${PLUGIN_SLUG}-ba-assets-${codeName}.css`;
            }

            if (fileName === "logo.svg") {
              return `logo.svg`;
            }

            return `${PLUGIN_SLUG}-ba-assets-${hash()}.[ext]`;
          },
          chunkFileNames: (fInfo) => {
            const name = typeof fInfo.name === "string" ? fInfo.name.slice(0, 8).toLowerCase() : "";
            const chunkName = name + "-" + hash() + ".js";
            return chunkName;
          },
          entryFileNames: `main-${codeName}.js`,
        },
      },
    },
    define: {
      ...(!isTest && { SERVER_VARIABLES: `window.${SERVER_VARIABLES}` }),
    },
    plugins: [
      {
        name: "write-build-code-name",
        closeBundle() {
          if (!isDevelopment) {
            fs.writeFileSync(path.resolve(import.meta.dirname, ASSETS_DIR, "build-code-name.txt"), codeName);
          }
        },
      },
      {
        // Fonts are the tracked source of truth; assets/ is git-ignored build
        // output and wiped by emptyOutDir on every build. Copy fonts into
        // assets/fonts on dev-server start (buildStart) and after each
        // production build (closeBundle, which runs after emptyOutDir).
        name: "copy-fonts",
        buildStart() {
          if (isDevelopment) copyFonts();
        },
        closeBundle() {
          copyFonts();
        },
      },
      ...(!isTest
        ? [
            tanstackRouter({
              routesDirectory: "./src/routes",
              generatedRouteTree: "./src/routeTree.gen.ts",
            }),
          ]
        : []),
      tailwindcss(),
      react(),
      babel({
        presets: ["jotai-babel/preset"],
      }),
    ],
    resolve: {
      tsconfigPaths: true,
    },
    root: "frontend",
    server: {
      ...(DEV_SSL === "true" && {
        https: {
          cert: DEV_SSL_CERT_PATH,
          key: DEV_SSL_KEY_PATH,
        },
      }),
      cors: true, // required to load scripts from custom host
      hmr: { host: "localhost" },
      port: 3000,
      strictPort: true, // strict port to match on PHP side
    },
    test: {
      environment: "happy-dom",
      // environment: 'jsdom',
      globals: true,
      include: ["frontend/src/**/*.test.{tsx,ts}"],
      root: "./",
      setupFiles: ["./frontend/src/config/test.setup.ts"],
      testTimeout: 10_000,
    },
  };
});

function hash() {
  return Math.round(Math.random() * (999 - 1) + 1);
}

function copyFonts() {
  const src = path.resolve(import.meta.dirname, "frontend/src/resource/fonts");
  const dest = path.resolve(import.meta.dirname, "assets/fonts");
  fse.copySync(src, dest, { overwrite: true });
}
