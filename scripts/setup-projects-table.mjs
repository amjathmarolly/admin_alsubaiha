import mysql from "mysql2/promise";
import path from "path";
import fs from "fs";

// Simple dotenv loader to run standalone
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8').split('\n');
  envConfig.forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2];
    }
  });
}

async function setupProjectsTable() {
  let connection = null;

  try {
    console.log("Connecting to MySQL database to create projects table...");

    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || "3306"),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    console.log("Connected successfully!");

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        year VARCHAR(10),
        type ENUM('image', 'video') DEFAULT 'image',
        image_url VARCHAR(500),
        thumbnail_url VARCHAR(500),
        status ENUM('active', 'inactive') DEFAULT 'active',
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_projects_status (status),
        INDEX idx_projects_sort (sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log("- projects table created successfully!");
    await connection.end();
  } catch (error) {
    console.error("Error setting up projects table:", error);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

setupProjectsTable();
