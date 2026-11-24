import { NextResponse } from "next/server"
import mysql from "mysql2/promise"

export async function POST() {
  let connection: mysql.Connection | null = null

  try {
    // Connect to MySQL with extended timeout
    const connectWithRetry = async (retries = 3): Promise<mysql.Connection> => {
      for (let i = 0; i < retries; i++) {
        try {
          const conn = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            port: Number(process.env.MYSQL_PORT) || 3306,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            multipleStatements: true,
            connectTimeout: 30000,
          })
          return conn
        } catch (err) {
          console.log(`[v0] Connection attempt ${i + 1} failed:`, (err as Error).message)
          if (i === retries - 1) throw err
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
      throw new Error("Failed to connect after retries")
    }

    connection = await connectWithRetry()
    console.log("[v0] Connected to MySQL database")

    // Drop existing tables to ensure clean schema (in reverse order due to foreign keys)
    const dropTablesSQL = `
      SET FOREIGN_KEY_CHECKS = 0;
      DROP TABLE IF EXISTS activity_logs;
      DROP TABLE IF EXISTS inventory_logs;
      DROP TABLE IF EXISTS shipments;
      DROP TABLE IF EXISTS order_items;
      DROP TABLE IF EXISTS orders;
      DROP TABLE IF EXISTS customers;
      DROP TABLE IF EXISTS products;
      DROP TABLE IF EXISTS categories;
      DROP TABLE IF EXISTS discounts;
      DROP TABLE IF EXISTS sessions;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS roles;
      DROP TABLE IF EXISTS settings;
      DROP TABLE IF EXISTS store_settings;
      SET FOREIGN_KEY_CHECKS = 1;
    `
    await connection.query(dropTablesSQL)
    console.log("[v0] Existing tables dropped")

    // Create tables with full schema matching context files
    const createTablesSQL = `
      -- Roles table
      CREATE TABLE IF NOT EXISTS roles (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        permissions JSON NOT NULL,
        is_system BOOLEAN DEFAULT FALSE,
        color VARCHAR(20) DEFAULT 'gray',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role_id VARCHAR(50) NOT NULL,
        avatar VARCHAR(500),
        status ENUM('active', 'invited', 'inactive') DEFAULT 'active',
        last_active TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id)
      );

      -- Sessions table
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Categories table (with sort_order and image)
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        parent_id VARCHAR(50) NULL,
        level INT DEFAULT 0,
        sort_order INT DEFAULT 0,
        image VARCHAR(500),
        status ENUM('active', 'inactive') DEFAULT 'active',
        product_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
        INDEX idx_parent (parent_id),
        INDEX idx_slug (slug),
        INDEX idx_level (level),
        INDEX idx_sort (sort_order)
      );

      -- Products table (with slug, cost_price, reserved_stock, featured, attributes)
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(200) UNIQUE,
        description TEXT,
        category_id VARCHAR(50),
        designer_id VARCHAR(50) NULL,
        price DECIMAL(10, 2) NOT NULL,
        compare_price DECIMAL(10, 2),
        cost_price DECIMAL(10, 2),
        sku VARCHAR(50) UNIQUE,
        barcode VARCHAR(50),
        stock INT DEFAULT 0,
        reserved_stock INT DEFAULT 0,
        low_stock_threshold INT DEFAULT 10,
        status ENUM('active', 'draft', 'archived') DEFAULT 'active',
        featured BOOLEAN DEFAULT FALSE,
        image VARCHAR(500),
        images JSON,
        weight DECIMAL(10, 2),
        dimensions JSON,
        tags JSON,
        attributes JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (designer_id) REFERENCES designers(id) ON DELETE SET NULL,
        INDEX idx_category (category_id),
        INDEX idx_designer (designer_id),
        INDEX idx_status (status),
        INDEX idx_sku (sku),
        INDEX idx_slug (slug),
        INDEX idx_featured (featured),
        FULLTEXT idx_search (name, description)
      );

      -- Customers table (with avatar and blocked status)
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20),
        avatar VARCHAR(500),
        address_line1 VARCHAR(255),
        address_line2 VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100) DEFAULT 'United States',
        total_orders INT DEFAULT 0,
        total_spent DECIMAL(12, 2) DEFAULT 0,
        tags JSON,
        notes TEXT,
        status ENUM('active', 'inactive', 'blocked') DEFAULT 'active',
        verified BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        password_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_status (status),
        INDEX idx_verified (verified),
        FULLTEXT idx_search (name, email)
      );

      -- Orders table (with customer_name, customer_email, discount_code, internal_notes)
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        order_number VARCHAR(20) NOT NULL UNIQUE,
        customer_id VARCHAR(50),
        customer_name VARCHAR(100),
        customer_email VARCHAR(255),
        status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded') DEFAULT 'pending',
        payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
        payment_method VARCHAR(50),
        subtotal DECIMAL(12, 2) NOT NULL,
        discount_amount DECIMAL(12, 2) DEFAULT 0,
        discount_code VARCHAR(50),
        shipping_amount DECIMAL(12, 2) DEFAULT 0,
        tax_amount DECIMAL(12, 2) DEFAULT 0,
        total DECIMAL(12, 2) NOT NULL,
        discount_id VARCHAR(50),
        shipping_address JSON,
        billing_address JSON,
        notes TEXT,
        internal_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        INDEX idx_customer (customer_id),
        INDEX idx_status (status),
        INDEX idx_created (created_at)
      );

      -- Order items table (with product_sku and total_price)
      CREATE TABLE IF NOT EXISTS order_items (
        id VARCHAR(50) PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL,
        product_id VARCHAR(50),
        product_name VARCHAR(200) NOT NULL,
        product_sku VARCHAR(50),
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        total_price DECIMAL(12, 2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
        INDEX idx_order (order_id)
      );

      -- Discounts table
      CREATE TABLE IF NOT EXISTS discounts (
        id VARCHAR(50) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        type ENUM('percentage', 'fixed', 'shipping') NOT NULL,
        value DECIMAL(10, 2) NOT NULL,
        min_purchase DECIMAL(10, 2) DEFAULT 0,
        max_uses INT,
        used_count INT DEFAULT 0,
        starts_at TIMESTAMP NULL,
        expires_at TIMESTAMP NULL,
        status ENUM('active', 'inactive', 'expired') DEFAULT 'active',
        applies_to JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_code (code),
        INDEX idx_status (status)
      );

      -- Shipments table
      CREATE TABLE IF NOT EXISTS shipments (
        id VARCHAR(50) PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL,
        carrier VARCHAR(50),
        tracking_number VARCHAR(100),
        status ENUM('pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed') DEFAULT 'pending',
        estimated_delivery DATE,
        actual_delivery TIMESTAMP NULL,
        weight DECIMAL(10, 2),
        dimensions JSON,
        shipping_cost DECIMAL(10, 2),
        label_url VARCHAR(500),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        INDEX idx_order (order_id),
        INDEX idx_tracking (tracking_number)
      );

      -- Inventory logs table
      CREATE TABLE IF NOT EXISTS inventory_logs (
        id VARCHAR(50) PRIMARY KEY,
        product_id VARCHAR(50) NOT NULL,
        type ENUM('adjustment', 'sale', 'return', 'restock', 'damage', 'transfer') NOT NULL,
        quantity_change INT NOT NULL,
        quantity_before INT NOT NULL,
        quantity_after INT NOT NULL,
        reason TEXT,
        reference_id VARCHAR(50),
        user_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_product (product_id),
        INDEX idx_created (created_at)
      );

      -- Activity logs table
      CREATE TABLE IF NOT EXISTS activity_logs (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id VARCHAR(50),
        details JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user (user_id),
        INDEX idx_entity (entity_type, entity_id),
        INDEX idx_created (created_at)
      );

      -- Store Settings table (key-value format)
      CREATE TABLE IF NOT EXISTS store_settings (
        id VARCHAR(36) NOT NULL DEFAULT (UUID()),
        setting_key VARCHAR(100) NOT NULL,
        setting_value LONGTEXT,
        description TEXT DEFAULT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY setting_key (setting_key),
        INDEX idx_key (setting_key)
      );
    `

    await connection.query(createTablesSQL)
    console.log("[v0] Tables created successfully")

    // Insert default roles
    const rolesSQL = `
      INSERT IGNORE INTO roles (id, name, description, permissions, is_system, color) VALUES
      ('admin', 'Administrator', 'Full access to all features', '["view_dashboard","manage_products","view_products","manage_orders","view_orders","manage_customers","view_customers","manage_inventory","view_inventory","manage_shipping","view_shipping","manage_discounts","view_discounts","view_analytics","manage_settings","manage_roles","manage_team","export_data"]', TRUE, 'red'),
      ('manager', 'Manager', 'Manage products, orders, and operations', '["view_dashboard","manage_products","view_products","manage_orders","view_orders","manage_customers","view_customers","manage_inventory","view_inventory","manage_shipping","view_shipping","manage_discounts","view_discounts","view_analytics","export_data"]', TRUE, 'blue'),
      ('staff', 'Staff', 'Process orders and manage shipping', '["view_dashboard","view_products","manage_orders","view_orders","view_customers","view_inventory","manage_shipping","view_shipping","view_discounts"]', TRUE, 'green'),
      ('viewer', 'Viewer', 'View-only access', '["view_dashboard","view_products","view_orders","view_customers","view_inventory","view_shipping","view_discounts"]', TRUE, 'gray')
    `
    await connection.query(rolesSQL)
    console.log("[v0] Default roles inserted")

    // Insert default users
    const usersSQL = `
      INSERT IGNORE INTO users (id, name, email, password_hash, role_id, status) VALUES
      ('user-1', 'John Admin', 'admin@alsubaiha.com', '$2b$10$XdF5G8h9iJ0kL1mN2oP3qRsTuVwXyZaBcDeFgHiJkLmNoPqRsTuV', 'admin', 'active'),
      ('user-2', 'Sarah Manager', 'manager@alsubaiha.com', '$2b$10$XdF5G8h9iJ0kL1mN2oP3qRsTuVwXyZaBcDeFgHiJkLmNoPqRsTuV', 'manager', 'active'),
      ('user-3', 'Mike Staff', 'staff@alsubaiha.com', '$2b$10$XdF5G8h9iJ0kL1mN2oP3qRsTuVwXyZaBcDeFgHiJkLmNoPqRsTuV', 'staff', 'active'),
      ('user-4', 'Jane Viewer', 'viewer@alsubaiha.com', '$2b$10$XdF5G8h9iJ0kL1mN2oP3qRsTuVwXyZaBcDeFgHiJkLmNoPqRsTuV', 'viewer', 'active')
    `
    await connection.query(usersSQL)
    console.log("[v0] Default users inserted")

    // Insert categories
    const categoriesSQL = `
      INSERT IGNORE INTO categories (id, name, slug, description, parent_id, level, sort_order, status, product_count) VALUES
      ('cat-1', 'Living Room', 'living-room', 'Living room furniture', NULL, 0, 1, 'active', 0),
      ('cat-2', 'Bedroom', 'bedroom', 'Bedroom furniture', NULL, 0, 2, 'active', 0),
      ('cat-3', 'Dining Room', 'dining-room', 'Dining room furniture', NULL, 0, 3, 'active', 0),
      ('cat-4', 'Office', 'office', 'Office furniture', NULL, 0, 4, 'active', 0),
      ('cat-1-1', 'Sofas', 'sofas', 'Sofas and couches', 'cat-1', 1, 1, 'active', 0),
      ('cat-1-2', 'Coffee Tables', 'coffee-tables', 'Coffee and side tables', 'cat-1', 1, 2, 'active', 0),
      ('cat-2-1', 'Beds', 'beds', 'Beds and bed frames', 'cat-2', 1, 1, 'active', 0),
      ('cat-2-2', 'Wardrobes', 'wardrobes', 'Wardrobes and closets', 'cat-2', 1, 2, 'active', 0),
      ('cat-3-1', 'Dining Tables', 'dining-tables', 'Dining tables', 'cat-3', 1, 1, 'active', 0),
      ('cat-4-1', 'Desks', 'desks', 'Office desks', 'cat-4', 1, 1, 'active', 0),
      ('cat-4-2', 'Office Chairs', 'office-chairs', 'Office seating', 'cat-4', 1, 2, 'active', 0),
      ('cat-1-1-1', 'Sectional Sofas', 'sectional-sofas', 'L-shaped and sectional sofas', 'cat-1-1', 2, 1, 'active', 0),
      ('cat-1-1-2', 'Loveseats', 'loveseats', 'Two-seater sofas', 'cat-1-1', 2, 2, 'active', 0),
      ('cat-2-1-1', 'Platform Beds', 'platform-beds', 'Platform bed frames', 'cat-2-1', 2, 1, 'active', 0),
      ('cat-4-2-1', 'Ergonomic Chairs', 'ergonomic-chairs', 'Ergonomic office chairs', 'cat-4-2', 2, 1, 'active', 0)
    `
    await connection.query(categoriesSQL)
    console.log("[v0] Categories inserted")

    // Insert sample products with all fields
    const productsSQL = `
      INSERT IGNORE INTO products (id, name, slug, description, category_id, price, compare_price, cost_price, stock, reserved_stock, status, featured, sku, image) VALUES
      ('PRD001', 'Velvet Sofa - Navy', 'velvet-sofa-navy', 'Luxurious navy velvet sofa with gold legs', 'cat-1-1-1', 1299.00, 1499.00, 650.00, 24, 2, 'active', TRUE, 'SOFA-NAV-001', '/placeholder.svg'),
      ('PRD002', 'Oak Dining Table', 'oak-dining-table', 'Solid oak dining table seats 6', 'cat-3-1', 899.00, 999.00, 450.00, 12, 0, 'active', TRUE, 'TBL-OAK-001', '/placeholder.svg'),
      ('PRD003', 'Ergonomic Office Chair', 'ergonomic-office-chair', 'Adjustable ergonomic chair with lumbar support', 'cat-4-2-1', 449.00, 549.00, 200.00, 3, 1, 'active', FALSE, 'CHR-ERG-001', '/placeholder.svg'),
      ('PRD004', 'King Size Platform Bed', 'king-platform-bed', 'Modern platform bed frame - king size', 'cat-2-1-1', 1599.00, 1899.00, 800.00, 8, 0, 'active', TRUE, 'BED-PLT-001', '/placeholder.svg'),
      ('PRD005', 'Modular Bookshelf', 'modular-bookshelf', 'Customizable modular bookshelf system', 'cat-4-1', 349.00, NULL, 175.00, 0, 0, 'active', FALSE, 'SHF-MOD-001', '/placeholder.svg'),
      ('PRD006', 'Leather Recliner', 'leather-recliner', 'Premium leather recliner with footrest', 'cat-1-1', 799.00, 899.00, 400.00, 15, 0, 'active', FALSE, 'RCL-LTH-001', '/placeholder.svg'),
      ('PRD007', 'Walnut Coffee Table', 'walnut-coffee-table', 'Mid-century modern walnut coffee table', 'cat-1-2', 399.00, NULL, 200.00, 18, 3, 'active', FALSE, 'TBL-WAL-001', '/placeholder.svg'),
      ('PRD008', 'Wardrobe Cabinet', 'wardrobe-cabinet', 'Large wardrobe with sliding doors', 'cat-2-2', 1199.00, 1399.00, 600.00, 5, 0, 'active', FALSE, 'WRD-SLD-001', '/placeholder.svg')
    `
    await connection.query(productsSQL)
    console.log("[v0] Sample products inserted")

    // Insert sample customers with avatar
    const customersSQL = `
      INSERT IGNORE INTO customers (id, name, email, phone, avatar, city, state, country, total_orders, total_spent, status, verified) VALUES
      ('cust-1', 'Alice Johnson', 'alice@example.com', '555-0101', NULL, 'New York', 'NY', 'United States', 5, 4500.00, 'active', TRUE),
      ('cust-2', 'Bob Smith', 'bob@example.com', '555-0102', NULL, 'Los Angeles', 'CA', 'United States', 3, 2100.00, 'active', TRUE),
      ('cust-3', 'Carol White', 'carol@example.com', '555-0103', NULL, 'Chicago', 'IL', 'United States', 8, 7200.00, 'active', TRUE),
      ('cust-4', 'David Brown', 'david@example.com', '555-0104', NULL, 'Houston', 'TX', 'United States', 2, 1800.00, 'active', TRUE),
      ('cust-5', 'Eve Davis', 'eve@example.com', '555-0105', NULL, 'Phoenix', 'AZ', 'United States', 1, 899.00, 'active', TRUE)
    `
    await connection.query(customersSQL)
    console.log("[v0] Sample customers inserted")

    // Insert sample orders with customer_name, customer_email, discount_code
    const ordersSQL = `
      INSERT IGNORE INTO orders (id, order_number, customer_id, customer_name, customer_email, status, payment_status, subtotal, total, discount_code, created_at) VALUES
      ('ord-1', 'ORD-2024-001', 'cust-1', 'Alice Johnson', 'alice@example.com', 'delivered', 'paid', 1299.00, 1299.00, NULL, '2024-01-15 10:30:00'),
      ('ord-2', 'ORD-2024-002', 'cust-2', 'Bob Smith', 'bob@example.com', 'shipped', 'paid', 899.00, 899.00, 'WELCOME10', '2024-01-16 14:20:00'),
      ('ord-3', 'ORD-2024-003', 'cust-3', 'Carol White', 'carol@example.com', 'processing', 'paid', 2048.00, 2048.00, NULL, '2024-01-17 09:15:00'),
      ('ord-4', 'ORD-2024-004', 'cust-1', 'Alice Johnson', 'alice@example.com', 'pending', 'pending', 449.00, 449.00, NULL, '2024-01-18 16:45:00'),
      ('ord-5', 'ORD-2024-005', 'cust-4', 'David Brown', 'david@example.com', 'confirmed', 'paid', 1599.00, 1599.00, 'SAVE50', '2024-01-19 11:00:00')
    `
    await connection.query(ordersSQL)
    console.log("[v0] Sample orders inserted")

    // Insert order items with product_sku and total_price
    const orderItemsSQL = `
      INSERT IGNORE INTO order_items (id, order_id, product_id, product_name, product_sku, quantity, unit_price, total_price) VALUES
      ('item-1', 'ord-1', 'PRD001', 'Velvet Sofa - Navy', 'SOFA-NAV-001', 1, 1299.00, 1299.00),
      ('item-2', 'ord-2', 'PRD002', 'Oak Dining Table', 'TBL-OAK-001', 1, 899.00, 899.00),
      ('item-3', 'ord-3', 'PRD001', 'Velvet Sofa - Navy', 'SOFA-NAV-001', 1, 1299.00, 1299.00),
      ('item-4', 'ord-3', 'PRD007', 'Walnut Coffee Table', 'TBL-WAL-001', 1, 399.00, 399.00),
      ('item-5', 'ord-3', 'PRD005', 'Modular Bookshelf', 'SHF-MOD-001', 1, 349.00, 349.00),
      ('item-6', 'ord-4', 'PRD003', 'Ergonomic Office Chair', 'CHR-ERG-001', 1, 449.00, 449.00),
      ('item-7', 'ord-5', 'PRD004', 'King Size Platform Bed', 'BED-PLT-001', 1, 1599.00, 1599.00)
    `
    await connection.query(orderItemsSQL)
    console.log("[v0] Order items inserted")

    // Insert sample discounts
    const discountsSQL = `
      INSERT IGNORE INTO discounts (id, code, description, type, value, min_purchase, status) VALUES
      ('disc-1', 'WELCOME10', 'Welcome discount - 10% off', 'percentage', 10.00, 50.00, 'active'),
      ('disc-2', 'SAVE50', 'Save $50 on orders over $500', 'fixed', 50.00, 500.00, 'active'),
      ('disc-3', 'FREESHIP', 'Free shipping on all orders', 'shipping', 100.00, 0.00, 'active')
    `
    await connection.query(discountsSQL)
    console.log("[v0] Sample discounts inserted")

    // Update category product counts
    await connection.query(`
      UPDATE categories c 
      SET product_count = (
        SELECT COUNT(*) FROM products p WHERE p.category_id = c.id
      )
    `)
    console.log("[v0] Category product counts updated")

    await connection.end()

    return NextResponse.json({
      success: true,
      message: "Database setup completed successfully",
      tables: [
        "roles",
        "users",
        "sessions",
        "categories",
        "products",
        "customers",
        "orders",
        "order_items",
        "discounts",
        "shipments",
        "inventory_logs",
        "activity_logs",
        "store_settings",
      ],
    })
  } catch (error) {
    console.error("[v0] Database setup error:", error)
    if (connection) {
      await connection.end()
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "POST to this endpoint to set up the database",
    warning: "This will create tables and insert sample data",
  })
}
