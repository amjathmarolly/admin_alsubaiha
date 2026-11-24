import mysql from "mysql2/promise";
import path from "path";
import fs from "fs";

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

async function addHotspotsColumn() {
  let connection = null;

  try {
    console.log("Connecting to MySQL to add hotspots column...");

    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || "3306"),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    // Check if column exists first
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'hotspots'
    `, [process.env.MYSQL_DATABASE]);

    if (columns.length === 0) {
      await connection.execute(`
        ALTER TABLE projects ADD COLUMN hotspots JSON NULL
      `);
      console.log("- Added 'hotspots' JSON column to 'projects' table!");
    } else {
      console.log("- Column 'hotspots' already exists.");
    }

    await connection.end();
  } catch (error) {
    console.error("Error adding hotspots column:", error);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

addHotspotsColumn();
