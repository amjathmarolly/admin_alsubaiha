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

async function addDesignerIdColumn() {
  let connection = null;

  try {
    console.log("Connecting to MySQL to add designer_id column to products table...");

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
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products' AND COLUMN_NAME = 'designer_id'
    `, [process.env.MYSQL_DATABASE]);

    if (columns.length === 0) {
      // Add designer_id column
      await connection.execute(`
        ALTER TABLE products ADD COLUMN designer_id VARCHAR(50) NULL
      `);
      console.log("- Added 'designer_id' VARCHAR(50) column to 'products' table!");

      // Add index
      await connection.execute(`
        ALTER TABLE products ADD INDEX idx_designer_id (designer_id)
      `);
      console.log("- Added index on 'designer_id' in 'products' table!");

      // Add foreign key constraint safely (check if designers table exists)
      try {
        await connection.execute(`
          ALTER TABLE products ADD CONSTRAINT fk_products_designer 
          FOREIGN KEY (designer_id) REFERENCES designers(id) ON DELETE SET NULL
        `);
        console.log("- Added foreign key constraint linking products.designer_id to designers.id!");
      } catch (fkErr) {
        console.warn("- Warning: Could not create foreign key constraint:", fkErr.message);
      }
    } else {
      console.log("- Column 'designer_id' already exists in 'products' table.");
    }

    await connection.end();
  } catch (error) {
    console.error("Error adding designer_id column:", error);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

addDesignerIdColumn();
