-- Migration v12
-- Cadastro público simplificado: e-mail passa a ser a ÚNICA chave de
-- unicidade; CPF deixa de ser único; adiciona coluna UF.

-- 1) Coluna de estado (UF) para o novo formulário
ALTER TABLE apoiadores ADD COLUMN IF NOT EXISTS uf VARCHAR(2);

-- 2) Remove a unicidade do CPF (a coluna continua existindo para os
--    cadastros antigos, mas sem restrição)
ALTER TABLE apoiadores DROP CONSTRAINT IF EXISTS apoiadores_cpf_key;

-- 3) Antes de criar a unicidade do e-mail, verifique se há duplicados:
--    (se esta consulta retornar linhas, me avise antes de continuar)
-- SELECT LOWER(email), COUNT(*) FROM apoiadores
-- WHERE email IS NOT NULL GROUP BY LOWER(email) HAVING COUNT(*) > 1;

-- 4) E-mail único (ignorando maiúsculas/minúsculas; nulos não contam)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_apoiadores_email
  ON apoiadores (LOWER(email)) WHERE email IS NOT NULL;
