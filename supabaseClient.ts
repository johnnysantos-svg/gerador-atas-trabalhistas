
import { createClient } from '@supabase/supabase-js'
import { AtaData } from './types';

// !! AÇÃO NECESSÁRIA !!
// Substitua os valores abaixo pela URL e Chave 'anon' do seu projeto Supabase.
// Você pode encontrá-los em: Project Settings > API
const supabaseUrl = 'https://uoqjvfvnyhwayadtzclg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcWp2ZnZueWh3YXlhZHR6Y2xnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4ODQzNDksImV4cCI6MjA3ODQ2MDM0OX0.4dDdI_gRI9To1BqQg5PnmfRz43CxlhrtBsvol1nFHUI'

// FIX: Expanded the type definitions for each table inline within the Database interface.
// This resolves a TypeScript type inference issue where the Supabase client was incorrectly
// resolving Insert and Update operation types to 'never', causing errors in api.ts.
// By defining the Row, Insert, and Update shapes explicitly here, we ensure the client
// is correctly typed for all database operations.
interface Database {
  public: {
    Tables: {
      peritos: {
        Row: {
          id: string;
          nome: string;
        };
        Insert: {
          nome: string;
        };
        Update: {
          nome?: string;
        };
      };
      juizes: {
        Row: {
          id: string;
          nome: string;
        };
        Insert: {
          nome: string;
        };
        Update: {
          nome?: string;
        };
      };
      textos_padroes: {
        Row: {
          id: string;
          titulo: string;
          texto: string;
        };
        Insert: {
          titulo: string;
          texto: string;
        };
        Update: {
          titulo?: string;
          texto?: string;
        };
      };
      atas: {
        Row: {
            id: string;
            nome_rascunho: string;
            updated_at: string;
            dados_ata: AtaData;
        };
        Insert: {
            nome_rascunho: string;
            dados_ata: AtaData;
            updated_at: string;
        };
        Update: {
            nome_rascunho?: string;
            dados_ata?: AtaData;
            updated_at?: string;
        };
      };
      usuarios: {
        Row: {
            id: string;
            email: string;
            nome: string;
            is_admin: boolean;
            created_at: string;
        };
        Insert: {
            email: string;
            nome: string;
            is_admin?: boolean;
            created_at?: string;
        };
        Update: {
            email?: string;
            nome?: string;
            is_admin?: boolean;
        };
      };
    };
    Views: {
      [key: string]: never;
    };
    Functions: {
      [key: string]: never;
    };
  };
}


export const supabase = createClient<Database>(supabaseUrl, supabaseKey)
