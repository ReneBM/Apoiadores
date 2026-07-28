/**
 * Redefine a senha de um usuário do TimeSV / Painel CMS.
 *
 * Uso (dentro da pasta backend):
 *   node redefinir-senha.js email@dominio.com "SenhaNova"
 *
 * - Atualiza o hash no banco (bcrypt, mesmas regras do sistema).
 * - Derruba todas as sessões antigas do usuário (refresh tokens).
 * - Apague este arquivo depois de usar, por higiene.
 */
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const [email, senha] = process.argv.slice(2);

if (!email || !senha) {
  console.log('Uso: node redefinir-senha.js email@dominio.com "SenhaNova"');
  process.exit(1);
}
if (senha.length < 8) {
  console.error('A senha precisa ter pelo menos 8 caracteres.');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const { rows } = await pool.query('SELECT id, nome, role FROM users WHERE email = $1', [email]);
  if (!rows.length) {
    console.error('Nenhum usuário encontrado com o e-mail: ' + email);
    const todos = await pool.query("SELECT email, role FROM users WHERE ativo = TRUE ORDER BY role");
    console.log('\nUsuários ativos no banco:');
    todos.rows.forEach((u) => console.log('  - ' + u.email + '  [' + u.role + ']'));
    process.exit(1);
  }

  const hash = await bcrypt.hash(senha, 12);
  await pool.query(
    'UPDATE users SET senha_hash = $1, primeiro_acesso = FALSE, updated_at = now() WHERE id = $2',
    [hash, rows[0].id]
  );
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [rows[0].id]);

  console.log('✅ Senha redefinida para ' + rows[0].nome + ' (' + email + ', papel: ' + rows[0].role + ').');
  console.log('Entre no painel em /campanha/admin com a senha nova.');
  await pool.end();
})().catch((e) => { console.error('Erro: ' + e.message); process.exit(1); });
