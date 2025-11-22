import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente baseadas no modo (development, production, etc.)
  // O terceiro argumento '' carrega todas as variáveis, não apenas as que começam com VITE_
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Define variáveis globais acessíveis via process.env no navegador
      // Isso resolve problemas onde import.meta.env falha em alguns ambientes de deploy
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      
      // Mapeia Supabase URL e Key. Tenta pegar com prefixo VITE_ ou sem (padrão Vercel integration)
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || env.SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY),
    },
  };
});