// Settings API - Uses store_settings table with key-value format
// Table columns: id, setting_key, setting_value, description, updated_at
// Updated: 2026-03-19 - No ensureStoreSettingsTable function
import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import type { RowDataPacket, ResultSetHeader } from "mysql2"

interface StoreSettingRow extends RowDataPacket {
  id: string
  setting_key: string
  setting_value: string
  description: string | null
  updated_at: Date
}

const DEFAULT_SETTINGS = {
  storeName: "Furnish",
  currency: "usd",
  timezone: "pst",
  language: "en",
  inventoryTracking: true,
  lowStockAlerts: true,
  autoFulfillOrders: false,
  notificationNewOrders: true,
  notificationOrderUpdates: true,
  notificationCustomerReviews: true,
  notificationInventoryAlerts: true,
  notificationMarketingUpdates: false,
}

// Map camelCase to snake_case keys for database
const KEY_MAP: Record<string, string> = {
  storeName: 'store_name',
  currency: 'currency',
  timezone: 'timezone',
  language: 'language',
  inventoryTracking: 'inventory_tracking',
  lowStockAlerts: 'low_stock_alerts',
  autoFulfillOrders: 'auto_fulfill_orders',
  notificationNewOrders: 'notification_new_orders',
  notificationOrderUpdates: 'notification_order_updates',
  notificationCustomerReviews: 'notification_customer_reviews',
  notificationInventoryAlerts: 'notification_inventory_alerts',
  notificationMarketingUpdates: 'notification_marketing_updates',
}

// Reverse map snake_case to camelCase
const REVERSE_KEY_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(KEY_MAP).map(([camel, snake]) => [snake, camel])
)

// Helper to parse JSON setting value
function parseValue(val: string | null): unknown {
  if (!val) return null
  try {
    return JSON.parse(val)
  } catch {
    return val
  }
}

// GET /api/settings - Fetch all settings from store_settings table
export async function GET() {
  try {
    const rows = await query<StoreSettingRow[]>(
      "SELECT setting_key, setting_value FROM store_settings"
    )
    
    // Build settings object from key-value rows
    const settings: Record<string, unknown> = {}
    for (const row of rows) {
      const camelKey = REVERSE_KEY_MAP[row.setting_key]
      if (camelKey) {
        settings[camelKey] = parseValue(row.setting_value)
      }
    }
    
    // Return with defaults for any missing settings
    return NextResponse.json({
      storeName: settings.storeName ?? DEFAULT_SETTINGS.storeName,
      currency: settings.currency ?? DEFAULT_SETTINGS.currency,
      timezone: settings.timezone ?? DEFAULT_SETTINGS.timezone,
      language: settings.language ?? DEFAULT_SETTINGS.language,
      inventoryTracking: settings.inventoryTracking ?? DEFAULT_SETTINGS.inventoryTracking,
      lowStockAlerts: settings.lowStockAlerts ?? DEFAULT_SETTINGS.lowStockAlerts,
      autoFulfillOrders: settings.autoFulfillOrders ?? DEFAULT_SETTINGS.autoFulfillOrders,
      notificationNewOrders: settings.notificationNewOrders ?? DEFAULT_SETTINGS.notificationNewOrders,
      notificationOrderUpdates: settings.notificationOrderUpdates ?? DEFAULT_SETTINGS.notificationOrderUpdates,
      notificationCustomerReviews: settings.notificationCustomerReviews ?? DEFAULT_SETTINGS.notificationCustomerReviews,
      notificationInventoryAlerts: settings.notificationInventoryAlerts ?? DEFAULT_SETTINGS.notificationInventoryAlerts,
      notificationMarketingUpdates: settings.notificationMarketingUpdates ?? DEFAULT_SETTINGS.notificationMarketingUpdates,
    })
  } catch (error) {
    const err = error as Error
    console.error("GET /api/settings error:", err.message)
    // Return defaults on error so UI still works
    return NextResponse.json(DEFAULT_SETTINGS)
  }
}

// PUT /api/settings - Update settings using INSERT ON DUPLICATE KEY UPDATE
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Update each provided setting
    for (const [camelKey, value] of Object.entries(body)) {
      const snakeKey = KEY_MAP[camelKey]
      if (!snakeKey || value === undefined) continue
      
      const jsonValue = JSON.stringify(value)
      
      // Upsert based on unique setting_key constraint
      await query<ResultSetHeader>(
        `INSERT INTO store_settings (id, setting_key, setting_value, updated_at)
         VALUES (UUID(), ?, ?, NOW())
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
        [snakeKey, jsonValue]
      )
    }
    
    // Fetch and return all settings
    const rows = await query<StoreSettingRow[]>(
      "SELECT setting_key, setting_value FROM store_settings"
    )
    
    const settings: Record<string, unknown> = {}
    for (const row of rows) {
      const camelKey = REVERSE_KEY_MAP[row.setting_key]
      if (camelKey) {
        settings[camelKey] = parseValue(row.setting_value)
      }
    }
    
    return NextResponse.json({
      storeName: settings.storeName ?? DEFAULT_SETTINGS.storeName,
      currency: settings.currency ?? DEFAULT_SETTINGS.currency,
      timezone: settings.timezone ?? DEFAULT_SETTINGS.timezone,
      language: settings.language ?? DEFAULT_SETTINGS.language,
      inventoryTracking: settings.inventoryTracking ?? DEFAULT_SETTINGS.inventoryTracking,
      lowStockAlerts: settings.lowStockAlerts ?? DEFAULT_SETTINGS.lowStockAlerts,
      autoFulfillOrders: settings.autoFulfillOrders ?? DEFAULT_SETTINGS.autoFulfillOrders,
      notificationNewOrders: settings.notificationNewOrders ?? DEFAULT_SETTINGS.notificationNewOrders,
      notificationOrderUpdates: settings.notificationOrderUpdates ?? DEFAULT_SETTINGS.notificationOrderUpdates,
      notificationCustomerReviews: settings.notificationCustomerReviews ?? DEFAULT_SETTINGS.notificationCustomerReviews,
      notificationInventoryAlerts: settings.notificationInventoryAlerts ?? DEFAULT_SETTINGS.notificationInventoryAlerts,
      notificationMarketingUpdates: settings.notificationMarketingUpdates ?? DEFAULT_SETTINGS.notificationMarketingUpdates,
    })
  } catch (error) {
    const err = error as Error
    console.error("PUT /api/settings error:", err.message)
    return NextResponse.json(
      { error: err.message || "Failed to update settings" },
      { status: 500 }
    )
  }
}
