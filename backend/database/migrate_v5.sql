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
