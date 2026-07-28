-- ============================================================
-- CMS TIME SV — Schema completo
-- Execute no Supabase SQL Editor (ou deixe o backend criar
-- automaticamente na primeira requisição — é idempotente).
-- ============================================================

-- Páginas gerenciadas pelo CMS
CREATE TABLE IF NOT EXISTS cms_paginas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT UNIQUE NOT NULL,
  titulo       TEXT NOT NULL,
  descricao    TEXT DEFAULT '',
  categoria    TEXT DEFAULT 'geral',
  template     TEXT DEFAULT 'campanha',          -- qual HTML base renderiza a página
  seo          JSONB DEFAULT '{}'::jsonb,        -- {title, description, og_image, keywords, noindex}
  status       TEXT NOT NULL DEFAULT 'rascunho', -- rascunho | publicada | agendada
  publicar_em  TIMESTAMPTZ,                      -- agendamento de publicação
  criado_por   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Revisões de conteúdo (versionamento automático)
-- content = mapa de overrides { "chave": {text|html|src|href|hidden|styles|attr} }
CREATE TABLE IF NOT EXISTS cms_revisoes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pagina_id    UUID NOT NULL REFERENCES cms_paginas(id) ON DELETE CASCADE,
  numero       INTEGER NOT NULL,
  tipo         TEXT NOT NULL DEFAULT 'rascunho', -- rascunho | publicada
  content      JSONB NOT NULL DEFAULT '{}'::jsonb,
  autor_id     TEXT,
  autor_nome   TEXT,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cms_revisoes_pagina ON cms_revisoes (pagina_id, criado_em DESC);

-- Biblioteca de mídia (arquivos ficam no Supabase Storage, bucket "feed", pasta cms/)
CREATE TABLE IF NOT EXISTS cms_midia (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         TEXT NOT NULL,
  url          TEXT NOT NULL,
  tipo         TEXT NOT NULL,                    -- mimetype
  tamanho      INTEGER DEFAULT 0,
  pasta        TEXT DEFAULT 'geral',
  criado_por   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Configurações globais do site (chave → valor)
-- Chaves usadas: geral, cores, analytics, custom
CREATE TABLE IF NOT EXISTS cms_config (
  chave        TEXT PRIMARY KEY,
  valor        JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auditoria: toda alteração registra quem, quando e o quê
CREATE TABLE IF NOT EXISTS cms_auditoria (
  id             BIGSERIAL PRIMARY KEY,
  usuario_id     TEXT,
  usuario_nome   TEXT,
  acao           TEXT NOT NULL,   -- salvar_rascunho | publicar | despublicar | restaurar | criar_pagina | ...
  entidade       TEXT NOT NULL,   -- pagina | midia | config | ...
  entidade_id    TEXT,
  detalhe        JSONB DEFAULT '{}'::jsonb, -- {campo, valor_anterior, valor_novo}
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cms_auditoria_data ON cms_auditoria (criado_em DESC);

-- Analytics simples (beacon do site público)
CREATE TABLE IF NOT EXISTS cms_acessos (
  id           BIGSERIAL PRIMARY KEY,
  pagina       TEXT NOT NULL,
  visitante    TEXT,              -- id anônimo persistido no localStorage
  user_agent   TEXT,
  referer      TEXT,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cms_acessos_data ON cms_acessos (criado_em DESC);

-- Página inicial padrão do site de campanha
INSERT INTO cms_paginas (slug, titulo, descricao, status, template)
VALUES ('home', 'Página inicial — TIME SV', 'Página principal do site de campanha', 'publicada', 'campanha')
ON CONFLICT (slug) DO NOTHING;
