/**
 * Tipos do banco de dados.
 *
 * Placeholder inicial — assim que o schema (supabase-schema.sql) estiver
 * aplicado no projeto Supabase, gere os tipos reais com:
 *
 *   npx supabase gen types typescript --project-id SEU_PROJECT_ID > types/database.ts
 *
 * Isso substitui este arquivo por tipos exatos de cada tabela/coluna.
 */

export interface Database {
  public: {
    Tables: {
      [key: string]: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
    }
  }
}
