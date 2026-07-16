-- Migrate V8
-- Sincroniza os nomes das funcionalidades no banco com os definidos em funcionalidades.js
-- O arquivo funcionalidades.js define: 'Apoiadores', 'Apoiadores - Aprovar Cadastros', 
-- 'Apoiadores - Exportar Base', 'Equipe', 'Perfis de Acesso', 'Feed de Notícias', 
-- 'Materiais', 'Mensagens', 'Dashboard'
-- Já no banco, as permissões foram inseridas com 'Notícias' (sem 'Feed de').
-- Corrige renomeando os registros existentes.

UPDATE perfil_permissoes 
SET funcionalidade = 'Feed de Notícias'
WHERE funcionalidade = 'Notícias';

-- Garante que todas as funcionalidades do sistema estão cadastradas para o perfil Admin
-- (todas TRUE)
INSERT INTO perfil_permissoes (perfil_id, funcionalidade, visualizar, criar, editar, excluir) VALUES
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Apoiadores', true, true, true, true),
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Apoiadores - Aprovar Cadastros', true, true, true, true),
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Apoiadores - Exportar Base', true, true, true, true),
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Equipe', true, true, true, true),
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Perfis de Acesso', true, true, true, true),
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Feed de Notícias', true, true, true, true),
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Materiais', true, true, true, true),
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Mensagens', true, true, true, true),
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Dashboard', true, true, true, true)
ON CONFLICT ON CONSTRAINT uniq_perfil_func DO UPDATE 
SET visualizar = true, criar = true, editar = true, excluir = true;

-- Supervisor: acesso intermediário
INSERT INTO perfil_permissoes (perfil_id, funcionalidade, visualizar, criar, editar, excluir) VALUES
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Apoiadores', true, true, true, false),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Apoiadores - Aprovar Cadastros', true, true, false, false),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Apoiadores - Exportar Base', true, false, false, false),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Equipe', true, false, false, false),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Perfis de Acesso', false, false, false, false),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Feed de Notícias', true, true, true, false),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Materiais', true, true, true, false),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Mensagens', true, true, true, false),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'Dashboard', true, false, false, false)
ON CONFLICT ON CONSTRAINT uniq_perfil_func DO NOTHING;

-- Operador: acesso básico
INSERT INTO perfil_permissoes (perfil_id, funcionalidade, visualizar, criar, editar, excluir) VALUES
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Apoiadores', true, true, true, false),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Apoiadores - Aprovar Cadastros', false, false, false, false),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Apoiadores - Exportar Base', false, false, false, false),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Equipe', false, false, false, false),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Perfis de Acesso', false, false, false, false),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Feed de Notícias', true, false, false, false),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Materiais', true, false, false, false),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Mensagens', false, false, false, false),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'Dashboard', true, false, false, false)
ON CONFLICT ON CONSTRAINT uniq_perfil_func DO NOTHING;
