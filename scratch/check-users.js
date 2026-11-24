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
    const [rows] = await connection.query('SELECT c.id, c.email, c.name, c.membership_tier_id, mp.name as tier_name, mp.discount_percentage FROM customers c LEFT JOIN membership_plans mp ON c.membership_tier_id = mp.id');
    console.log("Customers and their membership tiers:", rows);
  } catch (err) {
    console.error("Error querying users:", err);
  } finally {
    await connection.end();
  }
}

main();
