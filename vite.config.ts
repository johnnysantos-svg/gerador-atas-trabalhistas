import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// __dirname seguro em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
  const baseFromEnv = env.VITE_BASE_PATH || env.BASE_PATH;
  const base =
    mode === "production"
      ? baseFromEnv || (process.env.GITHUB_ACTIONS && repoName ? // : "/")
      : "/";

  return {
    base,
    plugins: [react()],
    server: { port: 3000, host: "0.0.0.0" },
    build: { sourcemap: true },
    resolve: { alias: { "@": resolve(__dirname, "./src") } },
  };
});
