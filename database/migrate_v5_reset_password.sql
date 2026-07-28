-- ============================================================
-- Migração V5 - Funcionalidade "Esqueceu a Senha?" (PIN de 6 dígitos)
-- ============================================================

-- Adiciona campos para armazenar o PIN e a data de expiração
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_code VARCHAR(6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMPTZ;
