<<<<<<< HEAD
// vite.config.ts
import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente (inclui as com prefixo VITE_)
  const env = loadEnv(mode, process.cwd(), "");

  // Base path (mantém compatível com GitHub Pages, mas funciona normal na Vercel)
  const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
  const baseFromEnv = env.VITE_BASE_PATH || env.BASE_PATH;
  const base =
    mode === "production"
      ? baseFromEnv || (process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/` : "/")
      : "/";
=======
﻿import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
  const baseFromEnv = env.VITE_BASE_PATH || env.BASE_PATH;
  const base =
    mode === 'production'
      ? baseFromEnv || (process.env.GITHUB_ACTIONS && repoName ? // : '/')
      : '/';
>>>>>>> 2032f9b (Remove all Gemini API references and clean Vite config)

  return {
    base,
    server: {
      port: 3000,
<<<<<<< HEAD
      host: "0.0.0.0",
    },
    plugins: [react()],
    build: {
      sourcemap: true, // útil pra debugar erro de tela branca
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
=======
      host: '0.0.0.0',
    },
    plugins: [react()],
    build: {
      sourcemap: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
>>>>>>> 2032f9b (Remove all Gemini API references and clean Vite config)
      },
    },
  };
});
