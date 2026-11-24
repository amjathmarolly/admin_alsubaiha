const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  console.log('Connected to database.');

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS blogs (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        excerpt TEXT,
        content LONGTEXT NOT NULL,
        category VARCHAR(100),
        author VARCHAR(255),
        image VARCHAR(500),
        video_url VARCHAR(500),
        status ENUM('active', 'draft', 'archived') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_slug (slug),
        INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await connection.query(createTableQuery);
    console.log('Table "blogs" created or already exists.');
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    await connection.end();
  }
}

main();
