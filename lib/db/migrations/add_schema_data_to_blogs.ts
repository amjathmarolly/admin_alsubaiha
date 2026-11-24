import { query } from "../config";

async function migrate() {
  try {
    console.log("Checking for schema_data column in blogs table...");
    const columns = await query<any[]>("SHOW COLUMNS FROM blogs LIKE 'schema_data'");
    
    if (columns.length === 0) {
      console.log("Adding schema_data column...");
      await query("ALTER TABLE blogs ADD COLUMN schema_data TEXT AFTER gallery_images");
      console.log("Column added successfully.");
    } else {
      console.log("schema_data column already exists.");
    }
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
