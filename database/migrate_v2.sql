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
