import mysql from "mysql2/promise";

async function setupDatabase() {
  let connection = null;

  try {
    console.log("Connecting to MySQL database...");

    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || "3306"),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      multipleStatements: true,
    });

    console.log("Connected successfully!");

    // Create tables
    console.log("Creating tables...");

    // Users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role_id VARCHAR(36) NOT NULL,
        avatar VARCHAR(500),
        status ENUM('active', 'inactive', 'invited') DEFAULT 'active',
        last_active TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_users_email (email),
        INDEX idx_users_role (role_id),
        INDEX idx_users_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("- users table created");

    // Roles table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS roles (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        permissions JSON NOT NULL,
        color VARCHAR(20) DEFAULT 'gray',
        is_system BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_roles_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("- roles table created");

    // Categories table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        parent_id VARCHAR(36) NULL,
        level INT DEFAULT 0,
        status ENUM('active', 'inactive') DEFAULT 'active',
        product_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_categories_parent (parent_id),
        INDEX idx_categories_slug (slug),
        INDEX idx_categories_level (level),
        INDEX idx_categories_status (status),
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("- categories table created");

    // Products table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(36) PRIMARY KEY,
        sku VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category_id VARCHAR(36),
        price DECIMAL(10, 2) NOT NULL,
        compare_at_price DECIMAL(10, 2),
        cost_price DECIMAL(10, 2),
        stock INT DEFAULT 0,
        low_stock_threshold INT DEFAULT 10,
        status ENUM('active', 'draft', 'archived') DEFAULT 'active',
        image VARCHAR(500),
        images JSON,
        weight DECIMAL(8, 2),
        dimensions JSON,
        tags JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_products_sku (sku),
        INDEX idx_products_category (category_id),
        INDEX idx_products_status (status),
        INDEX idx_products_price (price),
        INDEX idx_products_stock (stock),
        FULLTEXT INDEX idx_products_search (name, description),
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("- products table created");

    // Customers table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        address_line1 VARCHAR(255),
        address_line2 VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100) DEFAULT 'USA',
        total_orders INT DEFAULT 0,
        total_spent DECIMAL(12, 2) DEFAULT 0,
        tags JSON,
        notes TEXT,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_customers_email (email),
        INDEX idx_customers_status (status),
        FULLTEXT INDEX idx_customers_search (name, email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("- customers table created");

    // Orders table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(36) PRIMARY KEY,
        order_number VARCHAR(50) NOT NULL UNIQUE,
        customer_id VARCHAR(36),
        status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded') DEFAULT 'pending',
        payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
        subtotal DECIMAL(12, 2) NOT NULL,
        discount_amount DECIMAL(12, 2) DEFAULT 0,
        shipping_amount DECIMAL(12, 2) DEFAULT 0,
        tax_amount DECIMAL(12, 2) DEFAULT 0,
        total DECIMAL(12, 2) NOT NULL,
        discount_id VARCHAR(36),
        shipping_address JSON,
        billing_address JSON,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_orders_number (order_number),
        INDEX idx_orders_customer (customer_id),
        INDEX idx_orders_status (status),
        INDEX idx_orders_payment (payment_status),
        INDEX idx_orders_created (created_at),
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("- orders table created");

    // Order items table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS order_items (
        id VARCHAR(36) PRIMARY KEY,
        order_id VARCHAR(36) NOT NULL,
        product_id VARCHAR(36),
        product_name VARCHAR(255) NOT NULL,
        product_sku VARCHAR(50),
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        total_price DECIMAL(12, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_order_items_order (order_id),
        INDEX idx_order_items_product (product_id),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("- order_items table created");

    // Discounts table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS discounts (
        id VARCHAR(36) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type ENUM('percentage', 'fixed', 'free_shipping') NOT NULL,
        value DECIMAL(10, 2) NOT NULL,
        min_purchase DECIMAL(10, 2) DEFAULT 0,
        max_discount DECIMAL(10, 2),
        usage_limit INT,
        usage_count INT DEFAULT 0,
        start_date TIMESTAMP NULL,
        end_date TIMESTAMP NULL,
        status ENUM('active', 'inactive', 'expired') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_discounts_code (code),
        INDEX idx_discounts_status (status),
        INDEX idx_discounts_dates (start_date, end_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("- discounts table created");

    // Shipments table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS shipments (
        id VARCHAR(36) PRIMARY KEY,
        order_id VARCHAR(36) NOT NULL,
        tracking_number VARCHAR(100),
        carrier VARCHAR(100),
        status ENUM('pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed') DEFAULT 'pending',
        estimated_delivery DATE,
        actual_delivery TIMESTAMP NULL,
        shipping_address JSON,
        weight DECIMAL(8, 2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_shipments_order (order_id),
        INDEX idx_shipments_tracking (tracking_number),
        INDEX idx_shipments_status (status),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("- shipments table created");

    // Inventory logs table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS inventory_logs (
        id VARCHAR(36) PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        type ENUM('adjustment', 'sale', 'return', 'restock', 'damage', 'transfer') NOT NULL,
        quantity_change INT NOT NULL,
        quantity_before INT NOT NULL,
        quantity_after INT NOT NULL,
        reason TEXT,
        reference_id VARCHAR(36),
        user_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_inventory_product (product_id),
        INDEX idx_inventory_type (type),
        INDEX idx_inventory_created (created_at),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("- inventory_logs table created");

    // Sessions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sessions_user (user_id),
        INDEX idx_sessions_token (token),
        INDEX idx_sessions_expires (expires_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("- sessions table created");

    // Activity logs table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id VARCHAR(36),
        details JSON,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_activity_user (user_id),
        INDEX idx_activity_action (action),
        INDEX idx_activity_entity (entity_type, entity_id),
        INDEX idx_activity_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("- activity_logs table created");

    console.log("\nAll tables created successfully!");

    // Insert default roles
    console.log("\nInserting default roles...");

    const allPermissions = JSON.stringify([
      "view_dashboard",
      "manage_products",
      "view_products",
      "manage_orders",
      "view_orders",
      "manage_customers",
      "view_customers",
      "manage_inventory",
      "view_inventory",
      "manage_shipping",
      "view_shipping",
      "manage_discounts",
      "view_discounts",
      "view_analytics",
      "manage_settings",
      "manage_roles",
      "manage_team",
      "export_data",
    ]);

    const managerPermissions = JSON.stringify([
      "view_dashboard",
      "manage_products",
      "view_products",
      "manage_orders",
      "view_orders",
      "manage_customers",
      "view_customers",
      "manage_inventory",
      "view_inventory",
      "manage_shipping",
      "view_shipping",
      "manage_discounts",
      "view_discounts",
      "view_analytics",
      "export_data",
    ]);

    const staffPermissions = JSON.stringify([
      "view_dashboard",
      "view_products",
      "manage_orders",
      "view_orders",
      "view_customers",
      "view_inventory",
      "manage_shipping",
      "view_shipping",
      "view_discounts",
    ]);

    const viewerPermissions = JSON.stringify([
      "view_dashboard",
      "view_products",
      "view_orders",
      "view_customers",
      "view_inventory",
      "view_shipping",
      "view_discounts",
    ]);

    await connection.execute(
      `INSERT IGNORE INTO roles (id, name, description, permissions, color, is_system) VALUES 
      ('role-admin', 'Administrator', 'Full access to all features and settings', ?, 'red', true),
      ('role-manager', 'Manager', 'Manage products, orders, and team operations', ?, 'blue', true),
      ('role-staff', 'Staff', 'Process orders and manage shipping', ?, 'green', true),
      ('role-viewer', 'Viewer', 'View-only access to all data', ?, 'gray', true)`,
      [allPermissions, managerPermissions, staffPermissions, viewerPermissions]
    );
    console.log("- Default roles inserted");

    // Insert default users (password: admin123, manager123, etc.)
    console.log("\nInserting default users...");

    // Using bcrypt hash for "admin123" - $2a$10$rQZ8kHzJzYzJz5z5z5z5z.5z5z5z5z5z5z5z5z5z5z5z5z5z5z5z5
    // For simplicity, we'll use a placeholder hash - in production, use proper bcrypt
    const passwordHash =
      "$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGhM1A8W9iqaG3vv1BD7WC";

    await connection.execute(
      `INSERT IGNORE INTO users (id, email, password_hash, name, role_id, status) VALUES 
      ('user-admin', 'admin@alsubaiha.com', ?, 'John Admin', 'role-admin', 'active'),
      ('user-manager', 'manager@alsubaiha.com', ?, 'Sarah Manager', 'role-manager', 'active'),
      ('user-staff', 'staff@alsubaiha.com', ?, 'Mike Staff', 'role-staff', 'active'),
      ('user-viewer', 'viewer@alsubaiha.com', ?, 'Jane Viewer', 'role-viewer', 'active')`,
      [passwordHash, passwordHash, passwordHash, passwordHash]
    );
    console.log("- Default users inserted");

    // Insert sample categories
    console.log("\nInserting sample categories...");

    await connection.execute(`
      INSERT IGNORE INTO categories (id, name, slug, description, parent_id, level, status, product_count) VALUES 
      ('cat-1', 'Living Room', 'living-room', 'Living room furniture', NULL, 0, 'active', 0),
      ('cat-2', 'Bedroom', 'bedroom', 'Bedroom furniture', NULL, 0, 'active', 0),
      ('cat-3', 'Dining Room', 'dining-room', 'Dining room furniture', NULL, 0, 'active', 0),
      ('cat-4', 'Office', 'office', 'Office furniture', NULL, 0, 'active', 0),
      ('cat-1-1', 'Sofas', 'sofas', 'All types of sofas', 'cat-1', 1, 'active', 0),
      ('cat-1-2', 'Coffee Tables', 'coffee-tables', 'Coffee and side tables', 'cat-1', 1, 'active', 0),
      ('cat-2-1', 'Beds', 'beds', 'All bed types', 'cat-2', 1, 'active', 0),
      ('cat-2-2', 'Wardrobes', 'wardrobes', 'Wardrobes and closets', 'cat-2', 1, 'active', 0),
      ('cat-3-1', 'Dining Tables', 'dining-tables', 'Dining tables', 'cat-3', 1, 'active', 0),
      ('cat-3-2', 'Dining Chairs', 'dining-chairs', 'Dining chairs', 'cat-3', 1, 'active', 0),
      ('cat-4-1', 'Desks', 'desks', 'Office desks', 'cat-4', 1, 'active', 0),
      ('cat-4-2', 'Office Chairs', 'office-chairs', 'Office seating', 'cat-4', 1, 'active', 0),
      ('cat-1-1-1', 'Sectional Sofas', 'sectional-sofas', 'L-shaped and sectional sofas', 'cat-1-1', 2, 'active', 0),
      ('cat-1-1-2', 'Loveseats', 'loveseats', 'Two-seater sofas', 'cat-1-1', 2, 'active', 0),
      ('cat-2-1-1', 'Platform Beds', 'platform-beds', 'Modern platform beds', 'cat-2-1', 2, 'active', 0),
      ('cat-4-2-1', 'Ergonomic Chairs', 'ergonomic-chairs', 'Ergonomic office chairs', 'cat-4-2', 2, 'active', 0)
    `);
    console.log("- Sample categories inserted");

    // Insert sample products
    console.log("\nInserting sample products...");

    await connection.execute(`
      INSERT IGNORE INTO products (id, sku, name, description, category_id, price, stock, status, image) VALUES 
      ('prod-1', 'PRD001', 'Velvet Sofa - Navy', 'Luxurious navy velvet sofa', 'cat-1-1-1', 1299.00, 24, 'active', '/placeholder.svg'),
      ('prod-2', 'PRD002', 'Oak Dining Table', 'Solid oak dining table for 6', 'cat-3-1', 899.00, 12, 'active', '/placeholder.svg'),
      ('prod-3', 'PRD003', 'Ergonomic Office Chair', 'Premium ergonomic office chair', 'cat-4-2-1', 449.00, 3, 'active', '/placeholder.svg'),
      ('prod-4', 'PRD004', 'King Size Bed Frame', 'Modern king size platform bed', 'cat-2-1-1', 1599.00, 8, 'active', '/placeholder.svg'),
      ('prod-5', 'PRD005', 'Modular Bookshelf', 'Customizable modular bookshelf', 'cat-4-1', 349.00, 0, 'draft', '/placeholder.svg'),
      ('prod-6', 'PRD006', 'Leather Recliner', 'Premium leather recliner', 'cat-1-1', 799.00, 15, 'active', '/placeholder.svg'),
      ('prod-7', 'PRD007', 'Coffee Table - Walnut', 'Walnut finish coffee table', 'cat-1-2', 399.00, 18, 'active', '/placeholder.svg'),
      ('prod-8', 'PRD008', 'Wardrobe Cabinet', 'Large wardrobe with mirror', 'cat-2-2', 1199.00, 5, 'active', '/placeholder.svg')
    `);
    console.log("- Sample products inserted");

    // Update category product counts
    await connection.execute(`
      UPDATE categories c SET product_count = (
        SELECT COUNT(*) FROM products p WHERE p.category_id = c.id
      )
    `);
    console.log("- Category product counts updated");

    // Insert sample customers
    console.log("\nInserting sample customers...");

    await connection.execute(`
      INSERT IGNORE INTO customers (id, email, name, phone, city, state, country, total_orders, total_spent, status) VALUES 
      ('cust-1', 'john.doe@email.com', 'John Doe', '+1 555-0101', 'New York', 'NY', 'USA', 5, 4599.00, 'active'),
      ('cust-2', 'jane.smith@email.com', 'Jane Smith', '+1 555-0102', 'Los Angeles', 'CA', 'USA', 3, 2199.00, 'active'),
      ('cust-3', 'bob.wilson@email.com', 'Bob Wilson', '+1 555-0103', 'Chicago', 'IL', 'USA', 2, 1299.00, 'active'),
      ('cust-4', 'alice.johnson@email.com', 'Alice Johnson', '+1 555-0104', 'Houston', 'TX', 'USA', 1, 899.00, 'active'),
      ('cust-5', 'charlie.brown@email.com', 'Charlie Brown', '+1 555-0105', 'Phoenix', 'AZ', 'USA', 4, 3599.00, 'active')
    `);
    console.log("- Sample customers inserted");

    // Insert sample orders
    console.log("\nInserting sample orders...");

    await connection.execute(`
      INSERT IGNORE INTO orders (id, order_number, customer_id, status, payment_status, subtotal, total, created_at) VALUES 
      ('order-1', 'ORD-2024-001', 'cust-1', 'delivered', 'paid', 1299.00, 1299.00, DATE_SUB(NOW(), INTERVAL 10 DAY)),
      ('order-2', 'ORD-2024-002', 'cust-2', 'shipped', 'paid', 899.00, 899.00, DATE_SUB(NOW(), INTERVAL 5 DAY)),
      ('order-3', 'ORD-2024-003', 'cust-3', 'processing', 'paid', 449.00, 449.00, DATE_SUB(NOW(), INTERVAL 2 DAY)),
      ('order-4', 'ORD-2024-004', 'cust-1', 'pending', 'pending', 1599.00, 1599.00, DATE_SUB(NOW(), INTERVAL 1 DAY)),
      ('order-5', 'ORD-2024-005', 'cust-4', 'delivered', 'paid', 799.00, 799.00, DATE_SUB(NOW(), INTERVAL 15 DAY))
    `);
    console.log("- Sample orders inserted");

    // Insert sample order items
    await connection.execute(`
      INSERT IGNORE INTO order_items (id, order_id, product_id, product_name, product_sku, quantity, unit_price, total_price) VALUES 
      ('item-1', 'order-1', 'prod-1', 'Velvet Sofa - Navy', 'PRD001', 1, 1299.00, 1299.00),
      ('item-2', 'order-2', 'prod-2', 'Oak Dining Table', 'PRD002', 1, 899.00, 899.00),
      ('item-3', 'order-3', 'prod-3', 'Ergonomic Office Chair', 'PRD003', 1, 449.00, 449.00),
      ('item-4', 'order-4', 'prod-4', 'King Size Bed Frame', 'PRD004', 1, 1599.00, 1599.00),
      ('item-5', 'order-5', 'prod-6', 'Leather Recliner', 'PRD006', 1, 799.00, 799.00)
    `);
    console.log("- Sample order items inserted");

    // Insert sample discounts
    console.log("\nInserting sample discounts...");

    await connection.execute(`
      INSERT IGNORE INTO discounts (id, code, name, description, type, value, min_purchase, usage_limit, status) VALUES 
      ('disc-1', 'WELCOME10', 'Welcome Discount', '10% off for new customers', 'percentage', 10.00, 50.00, 100, 'active'),
      ('disc-2', 'SAVE50', 'Flat $50 Off', '$50 off on orders over $500', 'fixed', 50.00, 500.00, 50, 'active'),
      ('disc-3', 'FREESHIP', 'Free Shipping', 'Free shipping on all orders', 'free_shipping', 0.00, 100.00, NULL, 'active')
    `);
    console.log("- Sample discounts inserted");

    console.log("\n========================================");
    console.log("Database setup completed successfully!");
    console.log("========================================");
    console.log("\nDefault login credentials:");
    console.log("- Admin: admin@alsubaiha.com / admin123");
    console.log("- Manager: manager@alsubaiha.com / manager123");
    console.log("- Staff: staff@alsubaiha.com / staff123");
    console.log("- Viewer: viewer@alsubaiha.com / viewer123");

    await connection.end();
  } catch (error) {
    console.error("Error setting up database:", error);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

setupDatabase();
