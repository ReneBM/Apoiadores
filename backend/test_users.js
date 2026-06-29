require('dotenv').config();
const db = require('./src/config/database');

async function listUsers() {
  const res = await db.query('SELECT * FROM users');
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit();
}
listUsers();
