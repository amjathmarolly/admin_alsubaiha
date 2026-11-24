-- Create settings table for storing application settings
CREATE TABLE IF NOT EXISTS settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  store_name VARCHAR(255) NOT NULL DEFAULT 'Furnish',
  currency VARCHAR(10) NOT NULL DEFAULT 'usd',
  timezone VARCHAR(50) NOT NULL DEFAULT 'pst',
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  inventory_tracking BOOLEAN NOT NULL DEFAULT TRUE,
  low_stock_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  auto_fulfill_orders BOOLEAN NOT NULL DEFAULT FALSE,
  notification_new_orders BOOLEAN NOT NULL DEFAULT TRUE,
  notification_order_updates BOOLEAN NOT NULL DEFAULT TRUE,
  notification_customer_reviews BOOLEAN NOT NULL DEFAULT TRUE,
  notification_inventory_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  notification_marketing_updates BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default settings if not exists
INSERT IGNORE INTO settings (id) VALUES ('default');
