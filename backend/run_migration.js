require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  try {
    const filename = process.argv[2] || 'migrate_v5.sql';
    const sqlPath = path.join(__dirname, 'database', filename);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log(`Running migration: ${filename}...`);
    await pool.query(sql);
    console.log(`Migration ${filename} ran successfully!`);
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    await pool.end();
  }
}

runMigration();
