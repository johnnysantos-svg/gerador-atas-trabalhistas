# Configuração do Sistema de Autenticação

Este documento explica como configurar o sistema de autenticação no Supabase.

## 1. Criar a Tabela de Usuários

No Supabase, vá em **SQL Editor** e execute o seguinte SQL:

```sql
-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
CREATE POLICY "Usuários autenticados podem ler todos os usuários"
  ON usuarios FOR SELECT
  TO authenticated
  USING (true);

-- Política para permitir inserção apenas para admins
CREATE POLICY "Apenas admins podem criar usuários"
  ON usuarios FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Política para permitir atualização apenas para admins
CREATE POLICY "Apenas admins podem atualizar usuários"
  ON usuarios FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Política para permitir exclusão apenas para admins
CREATE POLICY "Apenas admins podem excluir usuários"
  ON usuarios FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid() AND is_admin = true
    )
  );
```

## 2. Criar o Primeiro Usuário Administrador

Para criar o primeiro usuário administrador, você tem duas opções:

### Opção A: Via SQL (Recomendado)

1. Primeiro, crie o usuário no Supabase Auth:
   - Vá em **Authentication** > **Users**
   - Clique em **Add user** > **Create new user**
   - Preencha email e senha
   - Anote o **User UID** gerado

2. Depois, insira o registro na tabela `usuarios`:

```sql
INSERT INTO usuarios (id, email, nome, is_admin)
VALUES (
  'USER_UID_AQUI',  -- Substitua pelo UID do usuário criado
  'admin@exemplo.com',
  'Administrador',
  true
);
```

### Opção B: Via Interface do Supabase

1. Crie o usuário no Supabase Auth (Authentication > Users)
2. Use a função `createUser` via API (será necessário ajustar as políticas RLS temporariamente)

## 3. Configurar Políticas RLS (Row Level Security)

As políticas acima já estão configuradas no SQL acima. Elas garantem que:
- Todos os usuários autenticados podem ver a lista de usuários
- Apenas administradores podem criar, editar ou excluir usuários

## 4. Habilitar Email/Password Authentication

**⚠️ IMPORTANTE - ESTE É O PASSO CRUCIAL PARA O LOGIN FUNCIONAR:**

No Supabase:
1. Vá em **Authentication** > **Providers**
2. Certifique-se de que **Email** está habilitado
3. **CRÍTICO**: Desabilite a confirmação de email:
   - Vá em **Authentication** > **Settings** (ou **Email Auth**)
   - Procure por **"Enable email confirmations"** ou **"Confirm email"**
   - **DESMARQUE** essa opção
   - Salve as alterações
   
   **Por que isso é importante?**
   - Se a confirmação de email estiver habilitada, os usuários criados não poderão fazer login até confirmarem o email
   - Isso causa o problema de "tela pisca mas não entra" que você está enfrentando
   - Com a confirmação desabilitada, os usuários podem fazer login imediatamente após serem criados

## 5. Se o Usuário Já Foi Criado e Não Consegue Fazer Login

Se você já criou um usuário e está tendo o problema de "tela pisca mas não entra", siga estes passos:

### Solução 1: Confirmar o Email Manualmente no Supabase

1. Vá em **Authentication** > **Users** no Supabase
2. Encontre o usuário pelo email
3. Clique no usuário para abrir os detalhes
4. Procure por **"Email Confirmed"** ou **"Confirm email"**
5. Se estiver como **false** ou **não confirmado**, clique para confirmar manualmente
6. Tente fazer login novamente

### Solução 2: Desabilitar Confirmação de Email (Recomendado)

Siga as instruções da seção 4 acima para desabilitar a confirmação de email. Depois disso:
1. Os novos usuários criados não precisarão confirmar email
2. Para usuários já criados, você ainda precisará confirmar manualmente (Solução 1)

### Solução 3: Recriar o Usuário

1. Delete o usuário no Supabase (Authentication > Users)
2. Delete o registro na tabela `usuarios` (SQL Editor)
3. Crie o usuário novamente através da interface (após desabilitar confirmação de email)

## 6. Testar o Sistema

1. Faça login com o usuário administrador criado
2. Clique em **Gerenciar Usuários** (botão roxo no header)
3. Crie um novo usuário através da interface
4. Faça logout e teste login com o novo usuário

## Notas Importantes

- O primeiro usuário deve ser criado manualmente no Supabase
- Apenas usuários com `is_admin = true` podem criar novos usuários
- As senhas são gerenciadas pelo Supabase Auth
- Todos os usuários precisam ter um registro na tabela `usuarios` para fazer login

