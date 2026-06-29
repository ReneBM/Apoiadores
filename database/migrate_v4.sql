-- ============================================================
--  SISTEMA DE GESTÃO DE APOIADORES: TÔ COM STYVENSON
--  Migration Script v4 — PostgreSQL
-- ============================================================

-- 1. Adiciona a coluna tipo à tabela users se não existir
ALTER TABLE users ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'Apoiador';

-- 2. Adiciona a coluna tipo à tabela apoiadores se não existir
ALTER TABLE apoiadores ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'Apoiador';

-- 3. Atualizar registros existentes para definir tipo com base na role
UPDATE users SET tipo = 'Admin' WHERE role = 'admin';
UPDATE users SET tipo = 'Coordenador' WHERE role = 'coordenador';
UPDATE users SET tipo = 'Mobilizador' WHERE role = 'multiplicador';

-- 4. Sincronizar os apoiadores que possuem contas correspondentes
UPDATE apoiadores a
SET tipo = u.tipo
FROM users u
WHERE LOWER(a.email) = LOWER(u.email);
