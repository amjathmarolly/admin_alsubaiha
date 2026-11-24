const mysql = require('mysql2/promise');

async function migrate() {
    // Attempt to get config from environment or use defaults
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'furnish_db',
    });

    try {
        console.log('Adding location column to projects table...');
        await connection.execute('ALTER TABLE projects ADD COLUMN location VARCHAR(255) DEFAULT NULL AFTER subheading');
        console.log('Migration successful!');
    } catch (error) {
        if (error.code === 'ER_DUP_COLUMN_NAME') {
            console.log('Column "location" already exists.');
        } else {
            console.error('Migration failed:', error);
        }
    } finally {
        await connection.end();
    }
}

migrate();
