-- Per-page / per-product SEO overrides managed from the admin panel (SEO page).
-- Also created automatically on first use by lib/seo.ts.
CREATE TABLE IF NOT EXISTS seo_metadata (
  id VARCHAR(36) PRIMARY KEY,
  entity_type VARCHAR(20) NOT NULL,
  entity_key VARCHAR(255) NOT NULL,
  title VARCHAR(255) NULL,
  description TEXT NULL,
  og_image VARCHAR(500) NULL,
  canonical_url VARCHAR(500) NULL,
  noindex BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_seo_entity (entity_type, entity_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
