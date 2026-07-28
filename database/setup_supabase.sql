-- =====================================================================
--  SETUP COMPLETO DO BANCO — TimeSV / Senador Styveson Valim
--  Cole tudo no SQL Editor do Supabase e execute (Run).
--  Gerado a partir de schema.sql + migrations v_/v2..v10.
-- =====================================================================

-- ========== 1) schema.sql ==========
-- ============================================================
--  SISTEMA DE GESTÃO DE APOIADORES POLÍTICOS
--  Senador Styveson Valim
--  Schema PostgreSQL — Supabase
--  Execute este script no SQL Editor do Supabase
-- ============================================================

-- ── Extensões ────────────────────────────────────────────────
-- gen_random_uuid() já disponível no Supabase por padrão
-- Habilitar apenas se necessário em instância própria:
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── TABELA: users ────────────────────────────────────────────
-- Todos os usuários do sistema (admin, coordenador, multiplicador)
CREATE TABLE IF NOT EXISTS users (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        VARCHAR(150) NOT NULL,
  email       VARCHAR(150) UNIQUE NOT NULL,
  senha_hash  TEXT        NOT NULL,
  role        VARCHAR(30)  NOT NULL
              CHECK (role IN ('admin', 'coordenador', 'multiplicador')),
  ativo       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── TABELA: multiplicadores ───────────────────────────────────
-- Perfil estendido do usuário com role = 'multiplicador'
CREATE TABLE IF NOT EXISTS multiplicadores (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coordenador_id  UUID        REFERENCES users(id) ON DELETE SET NULL,
  municipio       VARCHAR(100),
  telefone        VARCHAR(20),
  meta_apoiadores INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── TABELA: apoiadores ────────────────────────────────────────
-- Tabela central — dados dos apoiadores
CREATE TABLE IF NOT EXISTS apoiadores (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                VARCHAR(150) NOT NULL,
  telefone            VARCHAR(20),
  cidade              VARCHAR(100) NOT NULL,
  bairro              VARCHAR(100),
  interesse           TEXT,
  observacoes         TEXT,
  -- LGPD: consentimento explícito obrigatório
  consentimento_lgpd  BOOLEAN     NOT NULL DEFAULT FALSE,
  data_consentimento  TIMESTAMPTZ,
  status              VARCHAR(20)  NOT NULL DEFAULT 'ativo'
                      CHECK (status IN ('ativo', 'inativo', 'pendente')),
  multiplicador_id    UUID        REFERENCES multiplicadores(id) ON DELETE SET NULL,
  cadastrado_por      UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── TABELA: refresh_tokens ────────────────────────────────────
-- Armazena refresh tokens para rotação segura de sessão
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT        UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── TABELA: audit_log ─────────────────────────────────────────
-- Registro imutável de operações sensíveis (conformidade LGPD)
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
  acao        VARCHAR(50) NOT NULL,   -- ex: 'CREATE_APOIADOR'
  entidade    VARCHAR(50),            -- ex: 'apoiadores'
  entidade_id UUID,
  detalhes    JSONB,
  ip          INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── ÍNDICES ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_apoiadores_cidade
  ON apoiadores(cidade);

CREATE INDEX IF NOT EXISTS idx_apoiadores_multiplicador
  ON apoiadores(multiplicador_id);

CREATE INDEX IF NOT EXISTS idx_apoiadores_created
  ON apoiadores(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_apoiadores_status
  ON apoiadores(status);

CREATE INDEX IF NOT EXISTS idx_apoiadores_nome_search
  ON apoiadores USING gin(to_tsvector('portuguese', nome));

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user
  ON refresh_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires
  ON refresh_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_audit_log_user
  ON audit_log(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_created
  ON audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_multiplicadores_user
  ON multiplicadores(user_id);

-- ── FUNÇÃO: updated_at automático ────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── TRIGGERS: updated_at ──────────────────────────────────────
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_apoiadores_updated_at ON apoiadores;
CREATE TRIGGER trg_apoiadores_updated_at
  BEFORE UPDATE ON apoiadores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── VIEWS ─────────────────────────────────────────────────────

-- Totais por multiplicador (usada no ranking do dashboard)
CREATE OR REPLACE VIEW vw_apoiadores_por_multiplicador AS
SELECT
  m.id                  AS multiplicador_id,
  u.nome                AS multiplicador_nome,
  u.email               AS multiplicador_email,
  m.municipio,
  m.meta_apoiadores,
  COUNT(a.id)           AS total_apoiadores,
  COUNT(CASE WHEN a.created_at::date = CURRENT_DATE THEN 1 END) AS novos_hoje,
  CASE
    WHEN m.meta_apoiadores > 0
    THEN ROUND((COUNT(a.id)::numeric / m.meta_apoiadores) * 100)
    ELSE NULL
  END                   AS percentual_meta
FROM multiplicadores m
JOIN  users u        ON u.id = m.user_id
LEFT JOIN apoiadores a ON a.multiplicador_id = m.id
WHERE u.ativo = true
GROUP BY m.id, u.nome, u.email, m.municipio, m.meta_apoiadores;

-- Totais por cidade
CREATE OR REPLACE VIEW vw_apoiadores_por_cidade AS
SELECT
  cidade,
  COUNT(*)              AS total,
  COUNT(CASE WHEN status = 'ativo'   THEN 1 END) AS ativos,
  COUNT(CASE WHEN status = 'inativo' THEN 1 END) AS inativos,
  COUNT(CASE WHEN status = 'pendente' THEN 1 END) AS pendentes
FROM apoiadores
GROUP BY cidade
ORDER BY total DESC;

-- Série diária dos últimos 30 dias
CREATE OR REPLACE VIEW vw_serie_diaria AS
SELECT
  created_at::date AS dia,
  COUNT(*)         AS novos
FROM apoiadores
WHERE created_at >= CURRENT_DATE - INTERVAL '29 days'
GROUP BY dia
ORDER BY dia;

-- ── SEED: Usuário Admin Inicial ───────────────────────────────
-- IMPORTANTE: Substitua o hash antes de executar!
-- Para gerar o hash correto, rode no backend:
--   node -e "const bcrypt = require('bcrypt'); bcrypt.hash('Admin@2025', 12).then(console.log)"
-- Cole o hash gerado no lugar de HASH_GERADO_PELO_BCRYPT abaixo:

-- INSERT INTO users (nome, email, senha_hash, role)
-- VALUES (
--   'Administrador',
--   'admin@senadorvalim.com.br',
--   'HASH_GERADO_PELO_BCRYPT',
--   'admin'
-- )
-- ON CONFLICT (email) DO NOTHING;

-- ── LIMPEZA DE TOKENS EXPIRADOS (executar periodicamente) ─────
-- Sugestão: criar um pg_cron job no Supabase:
--
-- SELECT cron.schedule(
--   'limpar-refresh-tokens-expirados',
--   '0 3 * * *',    -- todo dia às 03:00
--   $$DELETE FROM refresh_tokens WHERE expires_at < now()$$
-- );

-- ========== 2) migrate_primeiro_acesso ==========
ALTER TABLE users ADD COLUMN IF NOT EXISTS primeiro_acesso BOOLEAN NOT NULL DEFAULT FALSE;

-- ========== 3) migrate_v2 ==========
-- ============================================================
--  SISTEMA DE GESTÃO DE APOIADORES: TÔ COM STYVENSON
--  Migration Script v2 — PostgreSQL / Supabase
-- ============================================================

-- 1. Adicionar coluna email à tabela apoiadores se não existir
ALTER TABLE apoiadores ADD COLUMN IF NOT EXISTS email VARCHAR(150);

-- 2. Alterar o valor padrão da coluna status para 'pendente'
ALTER TABLE apoiadores ALTER COLUMN status SET DEFAULT 'pendente';

-- 3. Criar tabela de notícias/avisos
CREATE TABLE IF NOT EXISTS noticias (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo      VARCHAR(250) NOT NULL,
  conteudo    TEXT        NOT NULL,
  imagem_url  TEXT,
  antecipada  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Criar tabela de materiais para compartilhar
CREATE TABLE IF NOT EXISTS materiais (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo      VARCHAR(150) NOT NULL,
  descricao   TEXT,
  link_url    TEXT        NOT NULL,
  tipo        VARCHAR(30)  NOT NULL CHECK (tipo IN ('video', 'imagem', 'card', 'documento')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Criar tabela de disparos de mensagens simulados
CREATE TABLE IF NOT EXISTS mensagens_disparadas (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo          VARCHAR(150) NOT NULL,
  conteudo        TEXT        NOT NULL,
  destinatarios   VARCHAR(30)  NOT NULL CHECK (destinatarios IN ('todos', 'mobilizadores', 'lideres')),
  coordenador_id  UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Atualizar a View vw_apoiadores_por_multiplicador AS
CREATE OR REPLACE VIEW vw_apoiadores_por_multiplicador AS
SELECT
  m.id                  AS multiplicador_id,
  u.nome                AS multiplicador_nome,
  u.email               AS multiplicador_email,
  m.municipio,
  m.meta_apoiadores,
  COUNT(CASE WHEN a.status = 'ativo' THEN 1 END) AS total_apoiadores,
  COUNT(CASE WHEN a.created_at::date = CURRENT_DATE AND a.status = 'ativo' THEN 1 END) AS novos_hoje,
  CASE
    WHEN m.meta_apoiadores > 0
    THEN ROUND((COUNT(CASE WHEN a.status = 'ativo' THEN 1 END)::numeric / m.meta_apoiadores) * 100)
    ELSE NULL
  END                   AS percentual_meta
FROM multiplicadores m
JOIN users u        ON u.id = m.user_id
LEFT JOIN apoiadores a ON a.multiplicador_id = m.id
WHERE u.ativo = true
GROUP BY m.id, u.nome, u.email, m.municipio, m.meta_apoiadores;

-- 7. Inserir algumas sementes (seeds) para notícias e materiais caso estejam vazios
INSERT INTO noticias (titulo, conteudo, antecipada)
VALUES 
  ('Lançamento do Aplicativo Tô com Styvenson!', 'Seja bem-vindo ao nosso aplicativo oficial de mobilização! Aqui você pode acompanhar notícias, compartilhar materiais e convidar mais simpatizantes.', FALSE),
  ('Reunião de Alinhamento com as Lideranças', 'Atenção Líderes de Base, teremos uma reunião exclusiva na próxima segunda-feira às 19h para discutir as diretrizes regionais. O link da sala será liberado no painel.', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO materiais (titulo, descricao, link_url, tipo)
VALUES 
  ('Card Oficial do Senador Styveson', 'Imagem oficial para divulgar nas redes sociais.', 'https://www.senado.leg.br/senadores/img/fotos-oficiais/senador_5982.jpg', 'imagem'),
  ('Vídeo de Prestação de Contas', 'Vídeo do YouTube resumindo os investimentos no RN.', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'video')
ON CONFLICT DO NOTHING;

-- ========== 4) migrate_v3 ==========
-- ============================================================
--  SISTEMA DE GESTÃO DE APOIADORES: TÔ COM STYVENSON
--  Migration Script v3 — PostgreSQL
-- ============================================================

-- Criar tabela de mensagens privadas (Chat / Inbox de comunicação)
CREATE TABLE IF NOT EXISTS mensagens_privadas (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  remetente_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  destinatario_id UUID        REFERENCES users(id) ON DELETE CASCADE,
  mensagem        TEXT        NOT NULL,
  lida            BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed de mensagens de boas-vindas para os usuários existentes
INSERT INTO mensagens_privadas (remetente_id, destinatario_id, mensagem)
SELECT 
  (SELECT id FROM users WHERE role = 'coordenador' LIMIT 1),
  u.id,
  'Seja muito bem-vindo ao Tô com Styvenson! Este é o seu canal direto para receber orientações da nossa coordenação. Fique atento às novidades no feed!'
FROM users u
WHERE u.role = 'multiplicador'
ON CONFLICT DO NOTHING;

-- ========== 5) migrate_v4 ==========
-- ============================================================
--  SISTEMA DE GESTÃO DE APOIADORES: TÔ COM STYVENSON
--  Migration Script v4 — PostgreSQL
-- ============================================================

-- 1. Adiciona a coluna tipo à tabela users se não existir
ALTER TABLE users ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'Apoiador';

-- 2. Adiciona a coluna tipo à tabela apoiadores se não existir
ALTER TABLE apoiadores ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'Apoiador';

-- 3. Atualizar registros existentes para definir tipo com base na role
UPDATE users SET tipo = 'Admin' WHERE role = 'admin';
UPDATE users SET tipo = 'Coordenador' WHERE role = 'coordenador';
UPDATE users SET tipo = 'Mobilizador' WHERE role = 'multiplicador';

-- 4. Sincronizar os apoiadores que possuem contas correspondentes
UPDATE apoiadores a
SET tipo = u.tipo
FROM users u
WHERE LOWER(a.email) = LOWER(u.email);

-- ========== 6) migrate_v5 ==========
-- Migrate V5
-- Adiciona CPF, Sexo, e perguntas de engajamento ao cadastro de Apoiador

ALTER TABLE apoiadores ADD COLUMN IF NOT EXISTS cpf VARCHAR(14) UNIQUE;
ALTER TABLE apoiadores ADD COLUMN IF NOT EXISTS sexo VARCHAR(20);
ALTER TABLE apoiadores ADD COLUMN IF NOT EXISTS acao_impacto TEXT;
ALTER TABLE apoiadores ADD COLUMN IF NOT EXISTS como_se_considera VARCHAR(50);
ALTER TABLE apoiadores ADD COLUMN IF NOT EXISTS como_ajudar JSONB;
ALTER TABLE apoiadores ADD COLUMN IF NOT EXISTS pessoas_mobilizar VARCHAR(50);
ALTER TABLE apoiadores ADD COLUMN IF NOT EXISTS grupo_organizacao JSONB;
ALTER TABLE apoiadores ADD COLUMN IF NOT EXISTS temas_interesse JSONB;
ALTER TABLE apoiadores ADD COLUMN IF NOT EXISTS redes_sociais JSONB;

-- Preenche redes sociais com formato base para registros existentes (opcional, mas evita null pointer handlers pesados no front)
UPDATE apoiadores SET redes_sociais = '{"instagram": "", "facebook": "", "tiktok": "", "youtube": ""}'::jsonb WHERE redes_sociais IS NULL;

-- ========== 7) migrate_v6 ==========
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

-- ========== 8) migrate_v7 ==========
-- Migrate V7
-- Adiciona coluna senha_inicial na tabela apoiadores para armazenar
-- o hash da senha definida pelo próprio apoiador no cadastro público.
-- Quando o admin aprovar o cadastro, essa senha será usada para criar
-- a conta do usuário no sistema em vez da senha padrão SV@12345.

ALTER TABLE apoiadores ADD COLUMN IF NOT EXISTS senha_inicial TEXT DEFAULT NULL;

-- Garante que usuários existentes sem perfil_id recebam o perfil Operador padrão
UPDATE users 
SET perfil_id = 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3'
WHERE perfil_id IS NULL AND role = 'multiplicador';

-- ========== 9) migrate_v8 ==========
-- Migrate V8
-- Sincroniza os nomes das funcionalidades no banco com os definidos em funcionalidades.js
-- O arquivo funcionalidades.js define: 'Apoiadores', 'Apoiadores - Aprovar Cadastros', 
-- 'Apoiadores - Exportar Base', 'Equipe', 'Perfis de Acesso', 'Feed de Notícias', 
-- 'Materiais', 'Mensagens', 'Dashboard'
-- Já no banco, as permissões foram inseridas com 'Notícias' (sem 'Feed de').
-- Corrige renomeando os registros existentes.

UPDATE perfil_permissoes 
SET funcionalidade = 'Feed de Notícias'
WHERE funcionalidade = 'Notícias';

-- Garante que todas as funcionalidades do sistema estão cadastradas para o perfil Admin
-- (todas TRUE)
INSERT INTO perfil_permissoes (perfil_id, funcionalidade, visualizar, criar, editar, excluir) VALUES
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Apoiadores', true, true, true, true),
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Apoiadores - Aprovar Cadastros', true, true, true, true),
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Apoiadores - Exportar Base', true, true, true, true),
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Equipe', true, true, true, true),
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Perfis de Acesso', true, true, true, true),
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Feed de Notícias', true, true, true, true),
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Materiais', true, true, true, true),
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Mensagens', true, true, true, true),
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Dashboard', true, true, true, true)
ON CONFLICT ON CONSTRAINT uniq_perfil_func DO UPDATE 
SET visualizar = true, criar = true, editar = true, excluir = true;

-- Supervisor: acesso intermediário
INSERT INTO perfil_permissoes (perfil_id, funcionalidade, visualizar, criar, editar, excluir) VALUES
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Apoiadores', true, true, true, false),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Apoiadores - Aprovar Cadastros', true, true, false, false),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Apoiadores - Exportar Base', true, false, false, false),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Equipe', true, false, false, false),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Perfis de Acesso', false, false, false, false),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Feed de Notícias', true, true, true, false),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Materiais', true, true, true, false),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Mensagens', true, true, true, false),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Dashboard', true, false, false, false)
ON CONFLICT ON CONSTRAINT uniq_perfil_func DO NOTHING;

-- Operador: acesso básico
INSERT INTO perfil_permissoes (perfil_id, funcionalidade, visualizar, criar, editar, excluir) VALUES
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Apoiadores', true, true, true, false),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Apoiadores - Aprovar Cadastros', false, false, false, false),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Apoiadores - Exportar Base', false, false, false, false),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Equipe', false, false, false, false),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Perfis de Acesso', false, false, false, false),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Feed de Notícias', true, false, false, false),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Materiais', true, false, false, false),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Mensagens', false, false, false, false),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Dashboard', true, false, false, false)
ON CONFLICT ON CONSTRAINT uniq_perfil_func DO NOTHING;

-- ========== 10) migrate_v9 ==========
-- Migrate V9
-- Adiciona a coluna origem na tabela apoiadores para rastrear de onde veio o cadastro

ALTER TABLE apoiadores ADD COLUMN IF NOT EXISTS origem VARCHAR(50) DEFAULT 'Painel Administrativo';

-- Atualiza os registros antigos
UPDATE apoiadores SET origem = 'Site / Landing Page' WHERE cadastrado_por IS NULL AND origem = 'Painel Administrativo';
UPDATE apoiadores SET origem = 'Indicação (Link)' WHERE cadastrado_por IS NOT NULL AND status = 'pendente' AND origem = 'Painel Administrativo';

-- ========== 11) migrate_v10 ==========
-- Migration v10: Adiciona indicador de pesquisa de engajamento (onboarding)
ALTER TABLE apoiadores ADD COLUMN IF NOT EXISTS pesquisa_concluida BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pesquisa_concluida BOOLEAN DEFAULT FALSE;

-- Marca apoiadores que já preencheram a pesquisa no cadastro anterior como concluídos
UPDATE apoiadores SET pesquisa_concluida = TRUE WHERE como_se_considera IS NOT NULL OR acao_impacto IS NOT NULL;

-- Administradores e Coordenadores não exigem pesquisa de onboarding
UPDATE users SET pesquisa_concluida = TRUE WHERE role IN ('admin', 'coordenador');

-- ========== 12) Coluna criada em runtime pelo backend ==========
ALTER TABLE mensagens_disparadas ADD COLUMN IF NOT EXISTS imagem_url TEXT;

-- ========== 13) Usuário administrador inicial ==========
-- Senha temporária: TimeSV@Admin2026  (o sistema força a troca no 1º login)
-- >>> TROQUE o e-mail abaixo pelo e-mail de admin que você quer usar. <<<
INSERT INTO users (nome, email, senha_hash, role, tipo, ativo, primeiro_acesso, perfil_id)
VALUES (
  'Administrador',
  'admin@timesv.com.br',
  '$2b$12$JqTSnyyzITyWKuiD/WHW4.XjlvnpsaBYTOt7qDIQd2nxC1EZ6ER8K',
  'admin',
  'Admin',
  TRUE,
  TRUE,
  'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'
)
ON CONFLICT (email) DO NOTHING;
