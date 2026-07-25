-- Migration v10: Adiciona indicador de pesquisa de engajamento (onboarding)
ALTER TABLE apoiadores ADD COLUMN IF NOT EXISTS pesquisa_concluida BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pesquisa_concluida BOOLEAN DEFAULT FALSE;

-- Marca apoiadores que já preencheram a pesquisa no cadastro anterior como concluídos
UPDATE apoiadores SET pesquisa_concluida = TRUE WHERE como_se_considera IS NOT NULL OR acao_impacto IS NOT NULL;

-- Administradores e Coordenadores não exigem pesquisa de onboarding
UPDATE users SET pesquisa_concluida = TRUE WHERE role IN ('admin', 'coordenador');
