const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_xYegwN9rSd3m@ep-orange-dust-atuz2o3a-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  console.log('Connected to database...');
  
  const users = await client.query('SELECT count(*) FROM users');
  console.log('Total users:', users.rows[0].count);
  
  const userList = await client.query('SELECT id, nome, email, role FROM users');
  console.log('Users:', userList.rows);
  
  const supporters = await client.query('SELECT count(*) FROM apoiadores');
  console.log('Total supporters:', supporters.rows[0].count);
  
  const news = await client.query('SELECT count(*) FROM noticias');
  console.log('Total news:', news.rows[0].count);
  
  const newsList = await client.query('SELECT id, titulo FROM noticias');
  console.log('News:', newsList.rows);
  
  const materials = await client.query('SELECT count(*) FROM materiais');
  console.log('Total materials:', materials.rows[0].count);
  
  const materialsList = await client.query('SELECT id, titulo FROM materiais');
  console.log('Materials:', materialsList.rows);
  
  const messages = await client.query('SELECT count(*) FROM mensagens_disparadas');
  console.log('Total messages:', messages.rows[0].count);
  
  const privateMessages = await client.query('SELECT count(*) FROM mensagens_privadas');
  console.log('Total private messages:', privateMessages.rows[0].count);
  
  const audits = await client.query('SELECT count(*) FROM audit_log');
  console.log('Total audit logs:', audits.rows[0].count);
  
  await client.end();
}

run().catch(console.error);
