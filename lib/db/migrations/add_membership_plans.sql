-- ============================================
-- MEMBERSHIP PLANS SCHEMA
-- ============================================

-- Create membership_plans table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add membership_tier_id column to customers table if it doesn't exist
ALTER TABLE customers ADD COLUMN IF NOT EXISTS membership_tier_id VARCHAR(36) AFTER total_spent;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_membership_recalculated_at DATETIME AFTER membership_tier_id;
ALTER TABLE customers ADD CONSTRAINT FOREIGN KEY IF NOT EXISTS (membership_tier_id) REFERENCES membership_plans(id) ON DELETE SET NULL;
ALTER TABLE customers ADD INDEX IF NOT EXISTS idx_membership_tier (membership_tier_id);

-- Insert default membership plans
INSERT INTO membership_plans (id, name, tier_level, description, min_purchase, max_purchase, discount_percentage, color, icon, status) VALUES
('plan-1', 'Blue', 1, 'Entry level membership', 0, 49999.99, 0, 'blue', 'droplet', 'active'),
('plan-2', 'Silver', 2, 'Silver tier membership', 50000, 99999.99, 10, 'slate', 'gem', 'active'),
('plan-3', 'Gold', 3, 'Gold tier membership', 100000, 199999.99, 15, 'yellow', 'crown', 'active'),
('plan-4', 'Platinum', 4, 'Platinum tier membership', 200000, 499999.99, 20, 'purple', 'star', 'active'),
('plan-5', 'Diamond', 5, 'Diamond tier membership', 500000, NULL, 25, 'pink', 'sparkles', 'active');
