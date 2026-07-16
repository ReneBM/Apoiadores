-- Migrate V7
-- Adiciona coluna senha_inicial na tabela apoiadores para armazenar
-- o hash da senha definida pelo próprio apoiador no cadastro público.
-- Quando o admin aprovar o cadastro, essa senha será usada para criar
-- a conta do usuário no sistema em vez da senha padrão SV@12345.

ALTER TABLE apoiadores ADD COLUMN IF NOT EXISTS senha_inicial TEXT DEFAULT NULL;

-- Garante que usuários existentes sem perfil_id recebam o perfil Operador padrão
UPDATE users 
SET perfil_id = 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3'
WHERE perfil_id IS NULL AND role = 'multiplicador';
