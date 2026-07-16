const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_xYegwN9rSd3m@ep-orange-dust-atuz2o3a-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  const res = await client.query('SELECT * FROM apoiadores');
  console.log('Supporter:', res.rows[0]);
  await client.end();
}

run().catch(console.error);
