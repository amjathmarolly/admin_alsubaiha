const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  try {
    const [rows] = await connection.query('DESCRIBE blogs');
    console.log('Columns in blogs table:');
    console.table(rows);
  } catch (error) {
    console.error('Error describing table:', error);
  } finally {
    await connection.end();
  }
}

main();
