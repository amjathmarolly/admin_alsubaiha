-- ============================================
-- ATELIER LIVE — private manufacturing tracker
-- ============================================
-- This table is the source of truth for in-progress manufacturing items.
-- It intentionally holds BOTH private fields (client_name, order_number,
-- price, internal_notes) and public-safe fields (title, category,
-- manufacturing_stage, material, dimensions, image_url).
--
-- Only rows with send_to_public_website = TRUE and status = 'active' are
-- eligible to be shown on the storefront, and even then the storefront
-- only ever reads them through the public-safe SELECT in
-- app/api/atelier-items/public/route.ts — client_name/order_number/price/
-- internal_notes are never selected by that endpoint.

CREATE TABLE IF NOT EXISTS atelier_items (
    id VARCHAR(36) PRIMARY KEY,

    -- Public-safe fields (whitelisted for the storefront)
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    manufacturing_stage VARCHAR(100) NOT NULL,
    material VARCHAR(255),
    dimensions VARCHAR(255),
    image_url VARCHAR(500) NOT NULL,
    slug VARCHAR(255),

    -- Private fields — NEVER sent to the storefront
    client_name VARCHAR(255),
    order_number VARCHAR(50),
    price DECIMAL(10, 2),
    internal_notes TEXT,

    -- Approval / lifecycle
    send_to_public_website BOOLEAN NOT NULL DEFAULT FALSE,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    sort_order INT DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_status (status),
    INDEX idx_send_to_public (send_to_public_website),
    INDEX idx_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Permissions, following the existing view_x/manage_x convention
INSERT INTO role_permissions (id, role_id, permission)
SELECT UUID(), 'admin', 'view_atelier_live'
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = 'admin' AND permission = 'view_atelier_live');

INSERT INTO role_permissions (id, role_id, permission)
SELECT UUID(), 'admin', 'manage_atelier_live'
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = 'admin' AND permission = 'manage_atelier_live');

INSERT INTO role_permissions (id, role_id, permission)
SELECT UUID(), 'manager', 'view_atelier_live'
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = 'manager' AND permission = 'view_atelier_live');

INSERT INTO role_permissions (id, role_id, permission)
SELECT UUID(), 'manager', 'manage_atelier_live'
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = 'manager' AND permission = 'manage_atelier_live');

INSERT INTO role_permissions (id, role_id, permission)
SELECT UUID(), 'staff', 'view_atelier_live'
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = 'staff' AND permission = 'view_atelier_live');

INSERT INTO role_permissions (id, role_id, permission)
SELECT UUID(), 'viewer', 'view_atelier_live'
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = 'viewer' AND permission = 'view_atelier_live');
