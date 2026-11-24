-- Alsubaiha E-commerce Dashboard Database Schema
-- MySQL 8.0+

-- ============================================
-- DROP TABLES (for fresh install)
-- ============================================
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS our_work;
DROP TABLE IF EXISTS shipments;
DROP TABLE IF EXISTS inventory_logs;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS discount_usage;
DROP TABLE IF EXISTS discounts;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS notifications;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar VARCHAR(500),
    role_id VARCHAR(36),
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ROLES & PERMISSIONS
-- ============================================
CREATE TABLE roles (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(20) DEFAULT 'gray',
    is_system BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE role_permissions (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    role_id VARCHAR(36) NOT NULL,
    permission VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_role_permission (role_id, permission),
    INDEX idx_role (role_id),
    INDEX idx_permission (permission)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE team_members (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role_id VARCHAR(36),
    status ENUM('active', 'invited', 'inactive') DEFAULT 'invited',
    invited_by VARCHAR(36),
    invited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    joined_at DATETIME,
    last_active DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_role (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- CATEGORIES (Hierarchical)
-- ============================================
CREATE TABLE categories (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    parent_id VARCHAR(36),
    level TINYINT DEFAULT 0,
    sort_order INT DEFAULT 0,
    image VARCHAR(500),
    status ENUM('active', 'inactive') DEFAULT 'active',
    product_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE,
    INDEX idx_parent (parent_id),
    INDEX idx_slug (slug),
    INDEX idx_level (level),
    INDEX idx_status (status),
    INDEX idx_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PRODUCTS
-- ============================================
CREATE TABLE products (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    sku VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    compare_price DECIMAL(10, 2),
    cost_price DECIMAL(10, 2),
    category_id VARCHAR(36),
    stock INT DEFAULT 0,
    reserved_stock INT DEFAULT 0,
    low_stock_threshold INT DEFAULT 10,
    status ENUM('active', 'draft', 'archived') DEFAULT 'active',
    featured BOOLEAN DEFAULT FALSE,
    images JSON,
    attributes JSON,
    meta_title VARCHAR(255),
    meta_description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_sku (sku),
    INDEX idx_slug (slug),
    INDEX idx_category (category_id),
    INDEX idx_status (status),
    INDEX idx_price (price),
    INDEX idx_stock (stock),
    INDEX idx_featured (featured),
    FULLTEXT INDEX ft_search (name, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- CUSTOMERS
-- ============================================
CREATE TABLE customers (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    avatar VARCHAR(500),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'United States',
    status ENUM('active', 'inactive', 'blocked') DEFAULT 'active',
    total_orders INT DEFAULT 0,
    total_spent DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    tags JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_total_spent (total_spent),
    INDEX idx_created (created_at),
    FULLTEXT INDEX ft_search (name, email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ORDERS
-- ============================================
CREATE TABLE orders (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    order_number VARCHAR(20) NOT NULL UNIQUE,
    customer_id VARCHAR(36),
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded') DEFAULT 'pending',
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    subtotal DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    shipping_amount DECIMAL(10, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    discount_code VARCHAR(50),
    shipping_address JSON,
    billing_address JSON,
    notes TEXT,
    internal_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    INDEX idx_order_number (order_number),
    INDEX idx_customer (customer_id),
    INDEX idx_status (status),
    INDEX idx_payment_status (payment_status),
    INDEX idx_created (created_at),
    INDEX idx_total (total)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_items (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    order_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36),
    product_sku VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    INDEX idx_order (order_id),
    INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INVENTORY
-- ============================================
CREATE TABLE inventory (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    product_id VARCHAR(36) NOT NULL UNIQUE,
    stock INT DEFAULT 0,
    reserved INT DEFAULT 0,
    incoming INT DEFAULT 0,
    reorder_point INT DEFAULT 10,
    reorder_quantity INT DEFAULT 50,
    location VARCHAR(100),
    last_counted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product (product_id),
    INDEX idx_stock (stock)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    product_id VARCHAR(36) NOT NULL,
    type ENUM('adjustment', 'restock', 'sale', 'return', 'transfer', 'count') NOT NULL,
    quantity_change INT NOT NULL,
    quantity_before INT NOT NULL,
    quantity_after INT NOT NULL,
    reason TEXT,
    reference_id VARCHAR(36),
    created_by VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_product (product_id),
    INDEX idx_type (type),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SHIPPING
-- ============================================
CREATE TABLE shipments (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    shipment_number VARCHAR(20) NOT NULL UNIQUE,
    order_id VARCHAR(36) NOT NULL,
    carrier VARCHAR(100),
    tracking_number VARCHAR(100),
    tracking_url VARCHAR(500),
    status ENUM('pending', 'label_created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned') DEFAULT 'pending',
    weight DECIMAL(8, 2),
    dimensions JSON,
    shipping_cost DECIMAL(10, 2),
    estimated_delivery DATE,
    actual_delivery DATETIME,
    shipped_at DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_shipment_number (shipment_number),
    INDEX idx_order (order_id),
    INDEX idx_tracking (tracking_number),
    INDEX idx_status (status),
    INDEX idx_carrier (carrier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DISCOUNTS
-- ============================================
CREATE TABLE discounts (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    type ENUM('percentage', 'fixed', 'shipping', 'bogo') NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    min_purchase DECIMAL(10, 2) DEFAULT 0,
    max_discount DECIMAL(10, 2),
    usage_limit INT,
    usage_count INT DEFAULT 0,
    usage_per_customer INT DEFAULT 1,
    status ENUM('active', 'inactive', 'expired') DEFAULT 'active',
    starts_at DATETIME,
    expires_at DATETIME,
    applicable_products JSON,
    applicable_categories JSON,
    created_by VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_code (code),
    INDEX idx_status (status),
    INDEX idx_type (type),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE discount_usage (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    discount_id VARCHAR(36) NOT NULL,
    order_id VARCHAR(36) NOT NULL,
    customer_id VARCHAR(36),
    discount_amount DECIMAL(10, 2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (discount_id) REFERENCES discounts(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    INDEX idx_discount (discount_id),
    INDEX idx_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_read (is_read),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- OUR WORK
-- ============================================
CREATE TABLE our_work (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    type ENUM('photo', 'video') NOT NULL,
    url VARCHAR(500) NOT NULL,
    thumbnail VARCHAR(500),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INT DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_type (type),
    INDEX idx_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Default Roles
INSERT INTO roles (id, name, description, color, is_system) VALUES
('role-admin', 'Administrator', 'Full access to all features and settings', 'red', TRUE),
('role-manager', 'Manager', 'Manage products, orders, and team operations', 'blue', TRUE),
('role-staff', 'Staff', 'Process orders and manage shipping', 'green', TRUE),
('role-viewer', 'Viewer', 'View-only access to all data', 'gray', TRUE);

-- Admin permissions
INSERT INTO role_permissions (role_id, permission) VALUES
('role-admin', 'view_dashboard'),
('role-admin', 'view_products'),
('role-admin', 'manage_products'),
('role-admin', 'view_orders'),
('role-admin', 'manage_orders'),
('role-admin', 'view_customers'),
('role-admin', 'manage_customers'),
('role-admin', 'view_inventory'),
('role-admin', 'manage_inventory'),
('role-admin', 'view_shipping'),
('role-admin', 'manage_shipping'),
('role-admin', 'view_discounts'),
('role-admin', 'manage_discounts'),
('role-admin', 'view_analytics'),
('role-admin', 'manage_settings'),
('role-admin', 'manage_roles'),
('role-admin', 'manage_team'),
('role-admin', 'export_data'),
('role-admin', 'view_our_work'),
('role-admin', 'manage_our_work');

-- Manager permissions
INSERT INTO role_permissions (role_id, permission) VALUES
('role-manager', 'view_dashboard'),
('role-manager', 'view_products'),
('role-manager', 'manage_products'),
('role-manager', 'view_orders'),
('role-manager', 'manage_orders'),
('role-manager', 'view_customers'),
('role-manager', 'manage_customers'),
('role-manager', 'view_inventory'),
('role-manager', 'manage_inventory'),
('role-manager', 'view_shipping'),
('role-manager', 'manage_shipping'),
('role-manager', 'view_discounts'),
('role-manager', 'manage_discounts'),
('role-manager', 'view_analytics'),
('role-manager', 'export_data'),
('role-manager', 'view_our_work'),
('role-manager', 'manage_our_work');

-- Staff permissions
INSERT INTO role_permissions (role_id, permission) VALUES
('role-staff', 'view_dashboard'),
('role-staff', 'view_products'),
('role-staff', 'view_orders'),
('role-staff', 'manage_orders'),
('role-staff', 'view_customers'),
('role-staff', 'view_inventory'),
('role-staff', 'view_shipping'),
('role-staff', 'manage_shipping'),
('role-staff', 'view_discounts'),
('role-staff', 'view_our_work');

-- Viewer permissions
INSERT INTO role_permissions (role_id, permission) VALUES
('role-viewer', 'view_dashboard'),
('role-viewer', 'view_products'),
('role-viewer', 'view_orders'),
('role-viewer', 'view_customers'),
('role-viewer', 'view_inventory'),
('role-viewer', 'view_shipping'),
('role-viewer', 'view_discounts'),
('role-viewer', 'view_our_work');

-- Default Admin User (password: admin123)
INSERT INTO users (id, email, password_hash, name, role_id, status) VALUES
('user-admin', 'admin@alsubaiha.com', '$2b$10$rQZ8K4U4f5v5p1s1w1z1z1z1z1z1z1z1z1z1z1z1z1z1z1z1z1z1z', 'John Admin', 'role-admin', 'active');

-- Default Categories
INSERT INTO categories (id, name, slug, description, parent_id, level, status) VALUES
('cat-1', 'Living Room', 'living-room', 'Living room furniture', NULL, 0, 'active'),
('cat-2', 'Bedroom', 'bedroom', 'Bedroom furniture', NULL, 0, 'active'),
('cat-3', 'Dining Room', 'dining-room', 'Dining room furniture', NULL, 0, 'active'),
('cat-4', 'Office', 'office', 'Office furniture', NULL, 0, 'active'),
('cat-5', 'Outdoor', 'outdoor', 'Outdoor furniture', NULL, 0, 'active'),
('cat-1-1', 'Sofas', 'sofas', 'Sofas and couches', 'cat-1', 1, 'active'),
('cat-1-2', 'Coffee Tables', 'coffee-tables', 'Coffee and side tables', 'cat-1', 1, 'active'),
('cat-1-3', 'TV Stands', 'tv-stands', 'TV stands and media centers', 'cat-1', 1, 'active'),
('cat-2-1', 'Beds', 'beds', 'Bed frames and mattresses', 'cat-2', 1, 'active'),
('cat-2-2', 'Wardrobes', 'wardrobes', 'Wardrobes and closets', 'cat-2', 1, 'active'),
('cat-3-1', 'Dining Tables', 'dining-tables', 'Dining tables', 'cat-3', 1, 'active'),
('cat-3-2', 'Dining Chairs', 'dining-chairs', 'Dining chairs', 'cat-3', 1, 'active'),
('cat-4-1', 'Desks', 'desks', 'Office desks', 'cat-4', 1, 'active'),
('cat-4-2', 'Office Chairs', 'office-chairs', 'Office chairs', 'cat-4', 1, 'active'),
('cat-1-1-1', 'Sectional Sofas', 'sectional-sofas', 'L-shaped and sectional sofas', 'cat-1-1', 2, 'active'),
('cat-1-1-2', 'Loveseats', 'loveseats', 'Two-seater sofas', 'cat-1-1', 2, 'active'),
('cat-2-1-1', 'Platform Beds', 'platform-beds', 'Platform bed frames', 'cat-2-1', 2, 'active'),
('cat-4-2-1', 'Ergonomic Chairs', 'ergonomic-chairs', 'Ergonomic office chairs', 'cat-4-2', 2, 'active');
