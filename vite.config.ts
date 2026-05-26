import path from "node:path";

import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { humanId } from "human-id";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const { DEV_SSL, DEV_SSL_CERT_PATH, DEV_SSL_KEY_PATH, PLUGIN_SLUG, SERVER_VARIABLES } = loadEnv(
    mode,
    process.cwd(),
    "",
  );

  const isDevelopment = mode === "development" || mode === "test";
  const isTest = mode === "test";
  const folderName = path.basename(process.cwd());
  const ASSETS_DIR = "assets";
  const codeName = humanId({ capitalize: false, separator: "-" });

  return {
    base: isDevelopment ? `/wp-content/plugins/${folderName}/frontend/` : "",
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
      tanstackRouter({
        routesDirectory: "./src/routes",
        generatedRouteTree: "./src/routeTree.gen.ts",
      }),
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
