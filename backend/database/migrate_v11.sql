-- Migration v11
-- Curtidas e comentários reais no Feed de Notícias

CREATE TABLE IF NOT EXISTS noticia_curtidas (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  noticia_id  UUID        NOT NULL REFERENCES noticias(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_curtida_noticia_user UNIQUE (noticia_id, user_id)
);

CREATE TABLE IF NOT EXISTS noticia_comentarios (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  noticia_id  UUID        NOT NULL REFERENCES noticias(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
  texto       TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_noticia_curtidas_noticia
  ON noticia_curtidas(noticia_id);

CREATE INDEX IF NOT EXISTS idx_noticia_comentarios_noticia
  ON noticia_comentarios(noticia_id, created_at DESC);
