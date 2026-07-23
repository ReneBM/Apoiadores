-- Migrate V9
-- Adiciona a coluna origem na tabela apoiadores para rastrear de onde veio o cadastro

ALTER TABLE apoiadores ADD COLUMN IF NOT EXISTS origem VARCHAR(50) DEFAULT 'Painel Administrativo';

-- Atualiza os registros antigos
UPDATE apoiadores SET origem = 'Site / Landing Page' WHERE cadastrado_por IS NULL AND origem = 'Painel Administrativo';
UPDATE apoiadores SET origem = 'Indicação (Link)' WHERE cadastrado_por IS NOT NULL AND status = 'pendente' AND origem = 'Painel Administrativo';
