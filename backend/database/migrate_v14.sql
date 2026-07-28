-- Migration v14
-- Envio de mensagens por WhatsApp (Cloud API oficial da Meta).
--
-- 1) users.telefone  — para onde enviar o código de senha / primeiro acesso.
--    Preenchido a partir de apoiadores, que já é a origem do cadastro
--    (e-mail é a chave que liga os dois desde a v12).
-- 2) apoiadores.whatsapp_optin — consentimento específico para receber
--    mensagens da campanha. Mensagens de serviço (código de senha, acesso
--    criado) não dependem disso; disparo de campanha depende.
-- 3) whatsapp_envios — log de cada envio, para auditoria e para provar
--    consentimento/descadastro se for questionado.

ALTER TABLE users ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);

ALTER TABLE apoiadores ADD COLUMN IF NOT EXISTS whatsapp_optin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE apoiadores ADD COLUMN IF NOT EXISTS whatsapp_optout_em TIMESTAMPTZ;

-- Backfill: traz o telefone que o apoiador informou no cadastro.
UPDATE users u
   SET telefone = a.telefone
  FROM apoiadores a
 WHERE u.telefone IS NULL
   AND a.telefone IS NOT NULL
   AND a.email IS NOT NULL
   AND LOWER(a.email) = LOWER(u.email);

-- Quem já aceitou os termos do cadastro e deixou telefone entra como opt-in.
-- O consentimento LGPD do cadastro cobre o contato pela campanha; o
-- descadastro continua disponível a qualquer momento (whatsapp_optout_em).
UPDATE apoiadores
   SET whatsapp_optin = TRUE
 WHERE consentimento_lgpd = TRUE
   AND telefone IS NOT NULL
   AND whatsapp_optout_em IS NULL;

CREATE TABLE IF NOT EXISTS whatsapp_envios (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone     VARCHAR(20)  NOT NULL,
  tipo         VARCHAR(30)  NOT NULL,   -- reset_senha | primeiro_acesso | disparo | teste
  template     VARCHAR(80),
  status       VARCHAR(20)  NOT NULL,   -- enviado | erro
  erro         TEXT,
  message_id   VARCHAR(120),            -- id devolvido pela Meta
  referencia   UUID,                    -- ex.: id da mensagem disparada
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_envios_created ON whatsapp_envios (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_envios_referencia ON whatsapp_envios (referencia);
