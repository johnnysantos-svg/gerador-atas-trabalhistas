import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente baseadas no modo (development, production, etc.)
  // O terceiro argumento '' carrega todas as variáveis, não apenas as que começam com VITE_
  // O cast (process as any) evita erros de tipagem estrita no ambiente de build
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Isso permite usar process.env.API_KEY no código do navegador
      // O Vite substituirá essa string pelo valor real da Vercel durante o build
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  };
});