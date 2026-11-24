-- Seed Data for Furnish Dashboard
-- Run this after create-tables.sql to populate with sample data

-- Insert sample categories
INSERT IGNORE INTO categories (id, name, slug, description, parent_id, level, status) VALUES
('cat-001', 'Living Room', 'living-room', 'Living room furniture including sofas, chairs, and tables', NULL, 0, 'active'),
('cat-002', 'Bedroom', 'bedroom', 'Bedroom furniture including beds, dressers, and nightstands', NULL, 0, 'active'),
('cat-003', 'Dining', 'dining', 'Dining room furniture including tables and chairs', NULL, 0, 'active'),
('cat-004', 'Office', 'office', 'Home office furniture including desks and office chairs', NULL, 0, 'active'),
('cat-005', 'Outdoor', 'outdoor', 'Outdoor and patio furniture', NULL, 0, 'active'),
('cat-006', 'Sofas', 'sofas', 'Comfortable sofas and couches', 'cat-001', 1, 'active'),
('cat-007', 'Armchairs', 'armchairs', 'Stylish armchairs and accent chairs', 'cat-001', 1, 'active'),
('cat-008', 'Coffee Tables', 'coffee-tables', 'Modern coffee and side tables', 'cat-001', 1, 'active'),
('cat-009', 'Beds', 'beds', 'Quality beds in various sizes', 'cat-002', 1, 'active'),
('cat-010', 'Dressers', 'dressers', 'Storage dressers and chests', 'cat-002', 1, 'active'),
('cat-011', 'Dining Tables', 'dining-tables', 'Dining tables for every space', 'cat-003', 1, 'active'),
('cat-012', 'Dining Chairs', 'dining-chairs', 'Comfortable dining chairs', 'cat-003', 1, 'active'),
('cat-013', 'Desks', 'desks', 'Work desks and writing desks', 'cat-004', 1, 'active'),
('cat-014', 'Office Chairs', 'office-chairs', 'Ergonomic office chairs', 'cat-004', 1, 'active');

-- Insert sample products
INSERT IGNORE INTO products (id, sku, name, slug, description, price, compare_price, category_id, stock, low_stock_threshold, status, featured, images) VALUES
('prod-001', 'SOFA-OSLO-01', 'Oslo Modern Sofa', 'oslo-modern-sofa', 'A sleek, contemporary sofa with clean lines and premium fabric upholstery. Perfect for modern living spaces.', 2490.00, 2990.00, 'cat-006', 15, 5, 'active', TRUE, '["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800"]'),
('prod-002', 'SOFA-COPEN-01', 'Copenhagen Sectional', 'copenhagen-sectional', 'Spacious L-shaped sectional sofa with modular design. Customizable configuration for any room.', 3290.00, NULL, 'cat-006', 8, 3, 'active', TRUE, '["https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800"]'),
('prod-003', 'CHAIR-BERG-01', 'Bergen Armchair', 'bergen-armchair', 'Classic Scandinavian armchair with wooden legs and plush cushioning.', 890.00, 1090.00, 'cat-007', 24, 5, 'active', FALSE, '["https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800"]'),
('prod-004', 'TABLE-MALM-01', 'Malmo Coffee Table', 'malmo-coffee-table', 'Minimalist coffee table with oak veneer top and steel legs.', 450.00, NULL, 'cat-008', 32, 10, 'active', FALSE, '["https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=800"]'),
('prod-005', 'BED-STOCK-01', 'Stockholm Queen Bed', 'stockholm-queen-bed', 'Elegant platform bed with upholstered headboard. Available in multiple colors.', 1890.00, 2190.00, 'cat-009', 12, 4, 'active', TRUE, '["https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800"]'),
('prod-006', 'BED-STOCK-02', 'Stockholm King Bed', 'stockholm-king-bed', 'King size version of our popular Stockholm bed frame.', 2290.00, 2590.00, 'cat-009', 6, 2, 'active', FALSE, '["https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800"]'),
('prod-007', 'DRESS-NORD-01', 'Nordic Dresser', 'nordic-dresser', '6-drawer dresser with soft-close drawers and walnut finish.', 1290.00, NULL, 'cat-010', 18, 5, 'active', FALSE, '["https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=800"]'),
('prod-008', 'TABLE-DIN-01', 'Helsinki Dining Table', 'helsinki-dining-table', 'Solid oak dining table seats 6-8 people. Extendable leaf included.', 1850.00, 2150.00, 'cat-011', 10, 3, 'active', TRUE, '["https://images.unsplash.com/photo-1577140917170-285929fb55b7?w=800"]'),
('prod-009', 'CHAIR-DIN-01', 'Helsinki Dining Chair', 'helsinki-dining-chair', 'Matching dining chair with cushioned seat. Sold individually.', 320.00, NULL, 'cat-012', 48, 12, 'active', FALSE, '["https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800"]'),
('prod-010', 'DESK-EXEC-01', 'Executive Home Desk', 'executive-home-desk', 'Premium home office desk with built-in cable management.', 1450.00, 1690.00, 'cat-013', 14, 4, 'active', TRUE, '["https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800"]'),
('prod-011', 'CHAIR-ERG-01', 'Ergo Pro Office Chair', 'ergo-pro-office-chair', 'Fully adjustable ergonomic office chair with lumbar support.', 890.00, 990.00, 'cat-014', 22, 6, 'active', FALSE, '["https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800"]'),
('prod-012', 'SOFA-VELV-01', 'Velvet Lounge Sofa', 'velvet-lounge-sofa', 'Luxurious velvet sofa with gold accent legs.', 2890.00, 3290.00, 'cat-006', 4, 2, 'active', TRUE, '["https://images.unsplash.com/photo-1550254478-ead40cc54513?w=800"]'),
('prod-013', 'TABLE-SIDE-01', 'Marble Side Table', 'marble-side-table', 'Elegant side table with genuine marble top.', 380.00, NULL, 'cat-008', 28, 8, 'active', FALSE, '["https://images.unsplash.com/photo-1499933374294-4584851497cc?w=800"]'),
('prod-014', 'BED-PLAT-01', 'Platform Storage Bed', 'platform-storage-bed', 'Modern platform bed with 4 storage drawers.', 1690.00, 1890.00, 'cat-009', 9, 3, 'active', FALSE, '["https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800"]'),
('prod-015', 'DESK-STAND-01', 'Standing Desk Pro', 'standing-desk-pro', 'Electric height-adjustable standing desk with memory presets.', 1290.00, 1490.00, 'cat-013', 16, 5, 'active', TRUE, '["https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800"]');

-- Update category product counts
UPDATE categories c SET product_count = (SELECT COUNT(*) FROM products WHERE category_id = c.id);

-- Insert sample customers
INSERT IGNORE INTO customers (id, email, name, phone, city, state, country, status, total_orders, total_spent) VALUES
('cust-001', 'sarah.johnson@example.com', 'Sarah Johnson', '+1-555-0101', 'New York', 'NY', 'United States', 'active', 5, 8432.00),
('cust-002', 'michael.chen@example.com', 'Michael Chen', '+1-555-0102', 'San Francisco', 'CA', 'United States', 'active', 3, 5621.00),
('cust-003', 'emily.davis@example.com', 'Emily Davis', '+1-555-0103', 'Chicago', 'IL', 'United States', 'active', 2, 1847.00),
('cust-004', 'james.wilson@example.com', 'James Wilson', '+1-555-0104', 'Austin', 'TX', 'United States', 'active', 8, 12340.00),
('cust-005', 'olivia.brown@example.com', 'Olivia Brown', '+1-555-0105', 'Seattle', 'WA', 'United States', 'active', 1, 449.00),
('cust-006', 'william.taylor@example.com', 'William Taylor', '+1-555-0106', 'Denver', 'CO', 'United States', 'active', 4, 3892.00),
('cust-007', 'sophia.martinez@example.com', 'Sophia Martinez', '+1-555-0107', 'Miami', 'FL', 'United States', 'inactive', 0, 0.00),
('cust-008', 'daniel.anderson@example.com', 'Daniel Anderson', '+1-555-0108', 'Boston', 'MA', 'United States', 'active', 12, 18920.00);

-- Insert sample orders
INSERT IGNORE INTO orders (id, order_number, customer_id, customer_email, customer_name, status, payment_status, subtotal, discount_amount, shipping_amount, tax_amount, total, shipping_address, created_at) VALUES
('ord-001', 'ORD-7823', 'cust-001', 'sarah.johnson@example.com', 'Sarah Johnson', 'delivered', 'paid', 2647.00, 0.00, 100.00, 100.00, 2847.00, '{"line1": "123 Main St", "city": "New York", "state": "NY", "postal": "10001"}', DATE_SUB(NOW(), INTERVAL 3 DAY)),
('ord-002', 'ORD-7822', 'cust-002', 'michael.chen@example.com', 'Michael Chen', 'shipped', 'paid', 1199.00, 0.00, 50.00, 50.00, 1299.00, '{"line1": "456 Oak Ave", "city": "San Francisco", "state": "CA", "postal": "94102"}', DATE_SUB(NOW(), INTERVAL 2 DAY)),
('ord-003', 'ORD-7821', 'cust-003', 'emily.davis@example.com', 'Emily Davis', 'processing', 'paid', 648.00, 0.00, 50.00, 50.00, 748.00, '{"line1": "789 Pine Rd", "city": "Chicago", "state": "IL", "postal": "60601"}', DATE_SUB(NOW(), INTERVAL 1 DAY)),
('ord-004', 'ORD-7820', 'cust-004', 'james.wilson@example.com', 'James Wilson', 'pending', 'pending', 2996.00, 0.00, 100.00, 100.00, 3196.00, '{"line1": "321 Elm St", "city": "Austin", "state": "TX", "postal": "78701"}', DATE_SUB(NOW(), INTERVAL 12 HOUR)),
('ord-005', 'ORD-7819', 'cust-005', 'olivia.brown@example.com', 'Olivia Brown', 'delivered', 'paid', 1498.00, 0.00, 100.00, 100.00, 1698.00, '{"line1": "654 Cedar Ln", "city": "Seattle", "state": "WA", "postal": "98101"}', DATE_SUB(NOW(), INTERVAL 5 DAY)),
('ord-006', 'ORD-7818', 'cust-006', 'william.taylor@example.com', 'William Taylor', 'cancelled', 'refunded', 349.00, 0.00, 50.00, 50.00, 449.00, '{"line1": "987 Birch Dr", "city": "Denver", "state": "CO", "postal": "80201"}', DATE_SUB(NOW(), INTERVAL 6 DAY)),
('ord-007', 'ORD-7817', 'cust-008', 'daniel.anderson@example.com', 'Daniel Anderson', 'delivered', 'paid', 1947.00, 0.00, 100.00, 100.00, 2147.00, '{"line1": "159 Maple Way", "city": "Boston", "state": "MA", "postal": "02101"}', DATE_SUB(NOW(), INTERVAL 7 DAY)),
('ord-008', 'ORD-7816', 'cust-008', 'daniel.anderson@example.com', 'Daniel Anderson', 'shipped', 'paid', 1398.00, 0.00, 100.00, 100.00, 1598.00, '{"line1": "159 Maple Way", "city": "Boston", "state": "MA", "postal": "02101"}', DATE_SUB(NOW(), INTERVAL 4 DAY));

-- Insert order items
INSERT IGNORE INTO order_items (id, order_id, product_id, product_sku, product_name, quantity, unit_price, total_price) VALUES
('item-001', 'ord-001', 'prod-001', 'SOFA-OSLO-01', 'Oslo Modern Sofa', 1, 2490.00, 2490.00),
('item-002', 'ord-001', 'prod-013', 'TABLE-SIDE-01', 'Marble Side Table', 1, 157.00, 157.00),
('item-003', 'ord-002', 'prod-011', 'CHAIR-ERG-01', 'Ergo Pro Office Chair', 1, 1199.00, 1199.00),
('item-004', 'ord-003', 'prod-09', 'CHAIR-DIN-01', 'Helsinki Dining Chair', 2, 324.00, 648.00),
('item-005', 'ord-004', 'prod-005', 'BED-STOCK-01', 'Stockholm Queen Bed', 1, 1890.00, 1890.00),
('item-006', 'ord-004', 'prod-007', 'DRESS-NORD-01', 'Nordic Dresser', 1, 1106.00, 1106.00),
('item-007', 'ord-005', 'prod-008', 'TABLE-DIN-01', 'Helsinki Dining Table', 1, 1498.00, 1498.00),
('item-008', 'ord-006', 'prod-04', 'TABLE-MALM-01', 'Malmo Coffee Table', 1, 349.00, 349.00),
('item-009', 'ord-007', 'prod-010', 'DESK-EXEC-01', 'Executive Home Desk', 1, 1450.00, 1450.00),
('item-010', 'ord-007', 'prod-013', 'TABLE-SIDE-01', 'Marble Side Table', 1, 497.00, 497.00),
('item-011', 'ord-008', 'prod-015', 'DESK-STAND-01', 'Standing Desk Pro', 1, 1290.00, 1290.00);

-- Insert sample discounts
INSERT IGNORE INTO discounts (id, code, name, description, type, value, min_purchase, max_discount, usage_limit, status, starts_at, expires_at) VALUES
('disc-001', 'WELCOME10', 'Welcome Discount', '10% off for new customers', 'percentage', 10.00, 100.00, 100.00, 1000, 'active', DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_ADD(NOW(), INTERVAL 60 DAY)),
('disc-002', 'SUMMER25', 'Summer Sale', '$25 off orders over $200', 'fixed', 25.00, 200.00, NULL, 500, 'active', DATE_SUB(NOW(), INTERVAL 15 DAY), DATE_ADD(NOW(), INTERVAL 45 DAY)),
('disc-003', 'VIP20', 'VIP Customer Discount', '20% off for VIP customers', 'percentage', 20.00, 500.00, 200.00, NULL, 'active', NULL, NULL),
('disc-004', 'FREESHIP', 'Free Shipping', 'Free shipping on orders over $150', 'shipping', 100.00, 150.00, NULL, NULL, 'active', NULL, NULL);

-- Insert sample roles
INSERT IGNORE INTO roles (id, name, description, permissions, is_system) VALUES
('role-001', 'admin', 'Full system administrator', '["view_dashboard","view_products","manage_products","view_orders","manage_orders","view_customers","manage_customers","view_analytics","manage_users","export_data","manage_categories","manage_inventory","manage_shipping","manage_discounts","manage_settings"]', TRUE),
('role-002', 'manager', 'Store manager with limited admin access', '["view_dashboard","view_products","manage_products","view_orders","manage_orders","view_customers","view_analytics","export_data","manage_categories","manage_inventory","manage_shipping","manage_discounts"]', TRUE),
('role-003', 'staff', 'Regular staff member', '["view_dashboard","view_products","view_orders","view_customers"]', TRUE),
('role-004', 'viewer', 'Read-only access', '["view_dashboard","view_products","view_orders","view_customers","view_analytics"]', TRUE);

-- Insert sample users (passwords are bcrypt hashed - all are 'password123')
INSERT IGNORE INTO users (id, email, password_hash, name, role_id, status) VALUES
('user-001', 'admin@alsubaiha.com', '$2b$10$rQnM6JqCKvxGvEFjMPzGXe5T8LCvYz3gKjGBvKHgYQKHf8FVzEBPe', 'Admin User', 'role-001', 'active'),
('user-002', 'manager@alsubaiha.com', '$2b$10$rQnM6JqCKvxGvEFjMPzGXe5T8LCvYz3gKjGBvKHgYQKHf8FVzEBPe', 'Store Manager', 'role-002', 'active'),
('user-003', 'staff@alsubaiha.com', '$2b$10$rQnM6JqCKvxGvEFjMPzGXe5T8LCvYz3gKjGBvKHgYQKHf8FVzEBPe', 'Staff Member', 'role-003', 'active');

-- Insert sample inventory log entries
INSERT IGNORE INTO inventory_log (id, product_id, type, quantity, previous_stock, new_stock, reason, created_by) VALUES
('inv-001', 'prod-001', 'adjustment', 5, 10, 15, 'Initial stock adjustment', 'user-001'),
('inv-002', 'prod-002', 'received', 10, 0, 10, 'New shipment received', 'user-001'),
('inv-003', 'prod-003', 'sold', -2, 26, 24, 'Order ORD-7823', 'user-001'),
('inv-004', 'prod-005', 'sold', -1, 13, 12, 'Order ORD-7820', 'user-001');

-- Insert sample shipments
INSERT IGNORE INTO shipments (id, order_id, tracking_number, carrier, status, shipped_at, estimated_delivery) VALUES
('ship-001', 'ord-001', 'TRK-123456789', 'FedEx', 'delivered', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY)),
('ship-002', 'ord-002', 'TRK-987654321', 'UPS', 'in_transit', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 2 DAY)),
('ship-003', 'ord-005', 'TRK-456789123', 'USPS', 'delivered', DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY)),
('ship-004', 'ord-007', 'TRK-789123456', 'FedEx', 'delivered', DATE_SUB(NOW(), INTERVAL 6 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY)),
('ship-005', 'ord-008', 'TRK-321654987', 'UPS', 'in_transit', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_ADD(NOW(), INTERVAL 1 DAY));

SELECT 'Seed data inserted successfully!' as status;
