const mysql = require('mysql2/promise');

async function migrate() {
  const dbConfig = {
    host: process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.MYSQL_PORT || "3306"),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "furnish_db",
  };

  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log("Checking for schema_data column in blogs table...");
    const [columns] = await connection.execute("SHOW COLUMNS FROM blogs LIKE 'schema_data'");
    
    if (columns.length === 0) {
      console.log("Adding schema_data column...");
      await connection.execute("ALTER TABLE blogs ADD COLUMN schema_data TEXT AFTER gallery_images");
      console.log("Column added successfully.");
    } else {
      console.log("schema_data column already exists.");
    }
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
