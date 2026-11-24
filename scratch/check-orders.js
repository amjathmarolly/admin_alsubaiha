const mysql = require('mysql2/promise');

const fs = require('fs');
const path = require('path');

// Manually parse .env
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      process.env[key] = val;
    }
  });
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  try {
    const [orders] = await connection.query('SELECT * FROM orders');
    console.log("Orders count:", orders.length);
    console.log("Orders:", orders);

    if (orders.length > 0) {
      const [items] = await connection.query('SELECT * FROM order_items WHERE order_id = ?', [orders[0].id]);
      console.log("Items for first order:", items);
    }
  } catch (err) {
    console.error("Error querying orders:", err);
  } finally {
    await connection.end();
  }
}

main();
