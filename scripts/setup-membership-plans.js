const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupMembershipPlans() {
  let connection;
  try {
    console.log('[Setup] Connecting to MySQL database...');
    
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      multipleStatements: true,
      connectionLimit: 1,
      waitForConnections: true,
      enableKeepAlive: true,
      keepAliveInitialDelayMs: 0,
    });

    console.log('[Setup] Connected to MySQL');

    // Check if membership_plans table exists
    const [tables] = await connection.query(
      'SELECT COUNT(*) as count FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = "membership_plans"',
      [process.env.MYSQL_DATABASE]
    );

    if (tables[0].count > 0) {
      console.log('[Setup] membership_plans table already exists');
      
      // Check if default tiers exist
      const [plans] = await connection.query('SELECT COUNT(*) as count FROM membership_plans');
      console.log('[Setup] Found ' + plans[0].count + ' membership plans');
      
      if (plans[0].count === 0) {
        console.log('[Setup] Inserting default membership tiers...');
        await connection.query(`
          INSERT INTO membership_plans (id, name, tier_level, description, min_purchase, max_purchase, discount_percentage, color, icon, status) VALUES
          ('plan-1', 'Blue', 1, 'Entry level membership', 0, 49999.99, 0, 'blue', 'droplet', 'active'),
          ('plan-2', 'Silver', 2, 'Silver tier membership', 50000, 99999.99, 10, 'slate', 'gem', 'active'),
          ('plan-3', 'Gold', 3, 'Gold tier membership', 100000, 199999.99, 15, 'yellow', 'crown', 'active'),
          ('plan-4', 'Platinum', 4, 'Platinum tier membership', 200000, 499999.99, 20, 'purple', 'star', 'active'),
          ('plan-5', 'Diamond', 5, 'Diamond tier membership', 500000, NULL, 25, 'pink', 'sparkles', 'active')
        `);
        console.log('[Setup] Default membership tiers inserted');
      }
      
      return true;
    }

    console.log('[Setup] Creating membership_plans table...');

    // Create membership_plans table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS membership_plans (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(100) NOT NULL UNIQUE,
        tier_level INT NOT NULL UNIQUE,
        description TEXT,
        min_purchase DECIMAL(12, 2) NOT NULL DEFAULT 0,
        max_purchase DECIMAL(12, 2),
        discount_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0,
        color VARCHAR(20) DEFAULT 'gray',
        icon VARCHAR(50),
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tier_level (tier_level),
        INDEX idx_status (status),
        INDEX idx_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('[Setup] membership_plans table created');

    // Add columns to customers table if needed
    console.log('[Setup] Updating customers table...');
    
    try {
      await connection.query(`
        ALTER TABLE customers ADD COLUMN membership_tier_id VARCHAR(36) AFTER total_spent
      `);
      console.log('[Setup] Added membership_tier_id column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('[Setup] membership_tier_id column already exists');
      } else {
        throw err;
      }
    }

    try {
      await connection.query(`
        ALTER TABLE customers ADD COLUMN last_membership_recalculated_at DATETIME AFTER membership_tier_id
      `);
      console.log('[Setup] Added last_membership_recalculated_at column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('[Setup] last_membership_recalculated_at column already exists');
      } else {
        throw err;
      }
    }

    // Add foreign key if not exists
    try {
      await connection.query(`
        ALTER TABLE customers ADD CONSTRAINT fk_membership_tier 
        FOREIGN KEY (membership_tier_id) REFERENCES membership_plans(id) ON DELETE SET NULL
      `);
      console.log('[Setup] Added foreign key constraint');
    } catch (err) {
      if (err.code === 'ER_DUP_KEY') {
        console.log('[Setup] Foreign key constraint already exists');
      } else {
        throw err;
      }
    }

    // Add index if not exists
    try {
      await connection.query(`
        ALTER TABLE customers ADD INDEX idx_membership_tier (membership_tier_id)
      `);
      console.log('[Setup] Added index on membership_tier_id');
    } catch (err) {
      if (err.code === 'ER_DUP_KEY_NAME') {
        console.log('[Setup] Index already exists');
      } else {
        throw err;
      }
    }

    // Insert default membership plans
    console.log('[Setup] Inserting default membership tiers...');
    
    await connection.query(`
      INSERT INTO membership_plans (id, name, tier_level, description, min_purchase, max_purchase, discount_percentage, color, icon, status) VALUES
      ('plan-1', 'Blue', 1, 'Entry level membership', 0, 49999.99, 0, 'blue', 'droplet', 'active'),
      ('plan-2', 'Silver', 2, 'Silver tier membership', 50000, 99999.99, 10, 'slate', 'gem', 'active'),
      ('plan-3', 'Gold', 3, 'Gold tier membership', 100000, 199999.99, 15, 'yellow', 'crown', 'active'),
      ('plan-4', 'Platinum', 4, 'Platinum tier membership', 200000, 499999.99, 20, 'purple', 'star', 'active'),
      ('plan-5', 'Diamond', 5, 'Diamond tier membership', 500000, NULL, 25, 'pink', 'sparkles', 'active')
    `);

    console.log('[Setup] Default membership tiers inserted');

    // Verify
    const [verify] = await connection.query('SELECT COUNT(*) as count FROM membership_plans');
    console.log('[Setup] SUCCESS: ' + verify[0].count + ' membership tiers now in database');

    await connection.end();
    return true;
  } catch (error) {
    console.error('[Setup] ERROR:', error.message);
    if (connection) {
      await connection.end().catch(() => {});
    }
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  setupMembershipPlans().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { setupMembershipPlans };
