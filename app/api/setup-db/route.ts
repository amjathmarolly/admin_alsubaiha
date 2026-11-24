import { NextResponse } from "next/server"
import { query } from "@/lib/db/config"

export async function GET() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS blogs (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        excerpt TEXT,
        content LONGTEXT NOT NULL,
        category VARCHAR(100),
        author VARCHAR(255),
        image VARCHAR(500),
        video_url VARCHAR(500),
        status ENUM('active', 'draft', 'archived') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_slug (slug),
        INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await query(createTableQuery);

    // Add permissions to roles
    const permissions = [
      { roleId: 'role-admin', permission: 'view_blogs' },
      { roleId: 'role-admin', permission: 'manage_blogs' },
      { roleId: 'role-manager', permission: 'view_blogs' },
      { roleId: 'role-manager', permission: 'manage_blogs' },
      { roleId: 'role-staff', permission: 'view_blogs' },
      { roleId: 'role-viewer', permission: 'view_blogs' },
    ];

    for (const p of permissions) {
      try {
        await query(
          'INSERT IGNORE INTO role_permissions (role_id, permission) VALUES (?, ?)',
          [p.roleId, p.permission]
        );
      } catch (e) {
        // Ignore if already exists
      }
    }

    // Insert a test blog post to verify sync
    const testBlogId = 'TEST-BLOG-001';
    await query(`
      INSERT IGNORE INTO blogs (id, title, slug, excerpt, content, category, author, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      testBlogId,
      'Welcome to the Al Subaiha Journal',
      'welcome-to-journal',
      'This is a test post to verify that your blog management system is working correctly.',
      '<p>If you can see this post, it means your frontend is successfully communicating with your Admin Dashboard!</p>',
      'Announcements',
      'System Admin',
      'active'
    ]);

    return NextResponse.json({ 
      success: true, 
      message: 'Database initialized successfully. Table created, permissions updated, and test post added.' 
    });
  } catch (error: any) {
    console.error('Error creating table:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
