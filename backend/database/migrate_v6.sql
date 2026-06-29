-- Migrate V6
-- Criação do módulo de Perfis de Acesso e Permissões (RBAC Dinâmico)

-- 1. Tabela de Perfis
CREATE TABLE IF NOT EXISTS perfis (
  id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        VARCHAR(100)    UNIQUE NOT NULL,
  descricao   TEXT,
  base_role   VARCHAR(30)     NOT NULL CHECK (base_role IN ('admin', 'coordenador', 'multiplicador')),
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- 2. Tabela de Permissões por Perfil
CREATE TABLE IF NOT EXISTS perfil_permissoes (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id       UUID            NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  funcionalidade  VARCHAR(100)    NOT NULL,
  visualizar      BOOLEAN         NOT NULL DEFAULT FALSE,
  criar           BOOLEAN         NOT NULL DEFAULT FALSE,
  editar          BOOLEAN         NOT NULL DEFAULT FALSE,
  excluir         BOOLEAN         NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  CONSTRAINT uniq_perfil_func UNIQUE (perfil_id, funcionalidade)
);

-- 3. Adiciona a coluna perfil_id na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS perfil_id UUID REFERENCES perfis(id) ON DELETE SET NULL;

-- 4. Inserir Perfis Padrão
INSERT INTO perfis (id, nome, descricao, base_role) VALUES
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Administrador', 'Acesso total e irrestrito a todas as funcionalidades.', 'admin'),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Supervisor', 'Perfil de assessoria regional com permissões de gestão intermediárias.', 'coordenador'),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Operador', 'Perfil de voluntário e multiplicador de campo.', 'multiplicador'),
  ('d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', 'Financeiro', 'Acesso financeiro focado em relatórios e controle básico.', 'coordenador')
ON CONFLICT (nome) DO NOTHING;

-- 5. Inserir Permissões para Perfis Padrão

-- Permissões do Administrador (Tudo TRUE)
INSERT INTO perfil_permissoes (perfil_id, funcionalidade, visualizar, criar, editar, excluir) VALUES
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Apoiadores', true, true, true, true),
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Equipe', true, true, true, true),
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Notícias', true, true, true, true),
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Materiais', true, true, true, true),
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Mensagens', true, true, true, true),
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Dashboard', true, true, true, true)
ON CONFLICT ON CONSTRAINT uniq_perfil_func DO UPDATE 
SET visualizar = true, criar = true, editar = true, excluir = true;

-- Permissões do Supervisor (Supervisor/Coordenador)
INSERT INTO perfil_permissoes (perfil_id, funcionalidade, visualizar, criar, editar, excluir) VALUES
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Apoiadores', true, true, true, true),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Equipe', true, false, false, false),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Notícias', true, true, true, true),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Materiais', true, true, true, true),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Mensagens', true, true, true, true),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Dashboard', true, true, true, true)
ON CONFLICT ON CONSTRAINT uniq_perfil_func DO NOTHING;

-- Permissões do Operador (Multiplicador/Líder)
INSERT INTO perfil_permissoes (perfil_id, funcionalidade, visualizar, criar, editar, excluir) VALUES
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Apoiadores', true, true, true, false),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Equipe', false, false, false, false),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Notícias', true, false, false, false),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Materiais', true, false, false, false),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Mensagens', false, false, false, false),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Dashboard', true, false, false, false)
ON CONFLICT ON CONSTRAINT uniq_perfil_func DO NOTHING;

-- Permissões do Financeiro
INSERT INTO perfil_permissoes (perfil_id, funcionalidade, visualizar, criar, editar, excluir) VALUES
  ('d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', 'Apoiadores', true, false, false, false),
  ('d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', 'Equipe', false, false, false, false),
  ('d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', 'Notícias', true, false, false, false),
  ('d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', 'Materiais', false, false, false, false),
  ('d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', 'Mensagens', false, false, false, false),
  ('d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', 'Dashboard', true, false, false, false)
ON CONFLICT ON CONSTRAINT uniq_perfil_func DO NOTHING;

-- 6. Atualizar os usuários existentes com base em suas roles
UPDATE users SET perfil_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1' WHERE role = 'admin';
UPDATE users SET perfil_id = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2' WHERE role = 'coordenador';
UPDATE users SET perfil_id = 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3' WHERE role = 'multiplicador';
