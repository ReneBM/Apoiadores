-- Migration v13
-- Configurações do sistema editáveis pelo painel (ex.: credenciais de e-mail).
-- Valores sensíveis são gravados criptografados (AES-256-GCM) pela aplicação.

CREATE TABLE IF NOT EXISTS configuracoes (
  chave       VARCHAR(60)  PRIMARY KEY,
  valor       TEXT,
  sensivel    BOOLEAN      NOT NULL DEFAULT FALSE,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_by  UUID         REFERENCES users(id) ON DELETE SET NULL
);
