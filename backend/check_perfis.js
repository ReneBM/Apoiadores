const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_xYegwN9rSd3m@ep-orange-dust-atuz2o3a-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  console.log('Connected to database...');
  
  const perfis = await client.query('SELECT * FROM perfis');
  console.log('Profiles in DB:', perfis.rows);
  
  const users = await client.query('SELECT id, nome, email, role, perfil_id, tipo FROM users');
  console.log('Users in DB:', users.rows);
  
  const perms = await client.query('SELECT * FROM perfil_permissoes');
  console.log('Permissions in DB:', perms.rows);
  
  await client.end();
}

run().catch(console.error);
