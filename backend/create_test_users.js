const { Client } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function createOrUpdateUser(client, nome, email, password, role, isMultiplicador = false, municipio = 'Natal') {
  const senhaHash = await bcrypt.hash(password, 12);
  
  // Verifica se o usuário já existe
  const checkRes = await client.query('SELECT id FROM users WHERE email = $1', [email]);
  let userId;

  if (checkRes.rows.length > 0) {
    userId = checkRes.rows[0].id;
    // Atualiza nome, role e senha
    await client.query(
      'UPDATE users SET nome = $1, role = $2, senha_hash = $3, ativo = true, primeiro_acesso = false WHERE id = $4',
      [nome, role, senhaHash, userId]
    );
    console.log(`Usuário atualizado: ${email} (${role})`);
  } else {
    userId = uuidv4();
    // Insere novo usuário
    await client.query(
      `INSERT INTO users (id, nome, email, senha_hash, role, ativo, primeiro_acesso)
       VALUES ($1, $2, $3, $4, $5, true, false)`,
      [userId, nome, email, senhaHash, role]
    );
    console.log(`Usuário criado: ${email} (${role})`);
  }

  // Se for multiplicador, garante registro na tabela multiplicadores
  let multiplicadorId = null;
  if (isMultiplicador) {
    const checkMult = await client.query('SELECT id FROM multiplicadores WHERE user_id = $1', [userId]);
    if (checkMult.rows.length === 0) {
      multiplicadorId = uuidv4();
      await client.query(
        `INSERT INTO multiplicadores (id, user_id, municipio, telefone, meta_apoiadores)
         VALUES ($1, $2, $3, $4, 15)`,
        [multiplicadorId, userId, municipio, '(84) 99999-1234']
      );
      console.log(`Perfil de multiplicador criado para ${email}`);
    } else {
      multiplicadorId = checkMult.rows[0].id;
      // Garante meta de apoiadores ativada para testes
      await client.query(
        'UPDATE multiplicadores SET municipio = $1, meta_apoiadores = 15 WHERE user_id = $2',
        [municipio, userId]
      );
      console.log(`Perfil de multiplicador atualizado para ${email}`);
    }
  }

  return { userId, multiplicadorId };
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();

  console.log('Conectado ao banco de dados. Criando usuários de teste...');

  // 1. Administrador Geral
  await createOrUpdateUser(
    client,
    'Admin Geral Teste',
    'admin@tocomstyvenson.com.br',
    'SV@12345',
    'admin'
  );

  // 2. Coordenador
  await createOrUpdateUser(
    client,
    'Coordenador Assessoria',
    'coordenador@tocomstyvenson.com.br',
    'SV@12345',
    'coordenador'
  );

  // 3. Apoiador (0 indicações)
  const apoiadorObj = await createOrUpdateUser(
    client,
    'Apoiador Teste',
    'apoiador@tocomstyvenson.com.br',
    'SV@12345',
    'multiplicador',
    true,
    'Parnamirim'
  );

  // 4. Mobilizador (1 a 10 indicações)
  const mobilizadorObj = await createOrUpdateUser(
    client,
    'Mobilizador Teste',
    'mobilizador@tocomstyvenson.com.br',
    'SV@12345',
    'multiplicador',
    true,
    'Mossoró'
  );

  // 5. Líder de Base (11+ indicações)
  const liderObj = await createOrUpdateUser(
    client,
    'Líder de Base Teste',
    'lider@tocomstyvenson.com.br',
    'SV@12345',
    'multiplicador',
    true,
    'Natal'
  );

  // Limpa indicações existentes dos usuários de teste para repovoamento limpo
  await client.query(
    "DELETE FROM apoiadores WHERE multiplicador_id IN ($1, $2, $3) AND nome LIKE 'Simpatizante Teste %'",
    [apoiadorObj.multiplicadorId, mobilizadorObj.multiplicadorId, liderObj.multiplicadorId]
  );

  // Adiciona 3 apoiadores ativos para o Mobilizador
  for (let i = 1; i <= 3; i++) {
    await client.query(
      `INSERT INTO apoiadores (id, nome, email, telefone, cidade, status, multiplicador_id, cadastrado_por, consentimento_lgpd, data_consentimento)
       VALUES ($1, $2, $3, $4, $5, 'ativo', $6, $7, true, now())`,
      [uuidv4(), `Simpatizante Teste ${i}`, `teste.mob.${i}@email.com`, `(84) 98888-000${i}`, 'Mossoró', mobilizadorObj.multiplicadorId, mobilizadorObj.userId]
    );
  }
  console.log('Adicionados 3 apoiadores ativos para o Mobilizador.');

  // Adiciona 12 apoiadores ativos para o Líder de Base
  for (let i = 1; i <= 12; i++) {
    await client.query(
      `INSERT INTO apoiadores (id, nome, email, telefone, cidade, status, multiplicador_id, cadastrado_por, consentimento_lgpd, data_consentimento)
       VALUES ($1, $2, $3, $4, $5, 'ativo', $6, $7, true, now())`,
      [uuidv4(), `Simpatizante Teste Lider ${i}`, `teste.lid.${i}@email.com`, `(84) 97777-000${i}`, 'Natal', liderObj.multiplicadorId, liderObj.userId]
    );
  }
  console.log('Adicionados 12 apoiadores ativos para o Líder de Base.');

  await client.end();
  console.log('Todos os usuários e dados de teste foram criados com sucesso!');
}

main().catch((err) => {
  console.error('Erro na criação de usuários:', err);
  process.exit(1);
});
