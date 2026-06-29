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
