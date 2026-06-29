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
