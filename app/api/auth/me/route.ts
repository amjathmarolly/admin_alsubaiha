import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import { endSession, readSession } from "@/lib/session"
import { ensureCustomerColumns } from "@/lib/customer-accounts"
import type { RowDataPacket } from "mysql2"
import { withCors } from "@/lib/cors"

interface UserRow extends RowDataPacket {
  id: string
  email: string
  name: string
  avatar: string | null
  role_id: string | null
  status: string
  customer_id?: string
  created_at?: string
  updated_at?: string
}

interface RoleRow extends RowDataPacket {
  id: string
  name: string
  permissions: string
}

/** A DATE column as YYYY-MM-DD (mysql2 returns it as a local-time Date). */
function toDateOnly(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

interface CustomerRow extends RowDataPacket {
  phone_normalized?: string | null
  first_order_date?: Date | string | null
  id: string
  name: string
  email: string
  phone: string | null
  avatar: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
  total_spent: number
  total_orders: number
  tags: string | null
  notes: string | null
  status: string
  created_at?: string
  updated_at?: string
}

interface MembershipTierRow extends RowDataPacket {
  id: string
  name: string
  tier_level: number
  discount_percentage: number
  min_purchase: number
  max_purchase: number | null
  color: string
  icon: string
}

// GET /api/auth/me - Get current user with membership and spending info
const meHandler = async () => {
  try {
    const session = await readSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    const mustChangePassword = Boolean(session.mustChange)

    // Handle Customer Session
    if (session.isCustomer) {
      await ensureCustomerColumns()
      const customerResult = await query<(CustomerRow & MembershipTierRow)[]>(
        `SELECT c.id, c.name, c.email, c.phone, c.avatar, c.address_line1, 
                c.address_line2, c.city, c.state, c.postal_code, c.country,
                c.total_spent, c.total_orders, c.tags, c.notes, c.status,
                c.created_at, c.updated_at, c.membership_tier_id,
                c.phone_normalized, c.first_order_date,
                mp.id as tier_id, mp.name as tier_name, mp.tier_level, 
                mp.discount_percentage, mp.min_purchase, mp.max_purchase, mp.color, mp.icon
         FROM customers c
         LEFT JOIN membership_plans mp ON c.membership_tier_id = mp.id
         WHERE c.id = ?`,
        [session.userId]
      )

      if (customerResult.length === 0 || customerResult[0].status !== "active") {
        await endSession()
        return NextResponse.json(
          { error: "Customer not found or inactive" },
          { status: 401 }
        )
      }

      const customer = customerResult[0]
      const totalSpent = parseFloat(customer.total_spent?.toString() || "0")

      const customerInfo = {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone_normalized || customer.phone,
        first_order_date: customer.first_order_date ? toDateOnly(customer.first_order_date) : null,
        avatar: customer.avatar,
        totalOrders: customer.total_orders,
        status: customer.status,
        address: {
          line1: customer.address_line1,
          line2: customer.address_line2,
          city: customer.city,
          state: customer.state,
          postalCode: customer.postal_code,
          country: customer.country,
        },
        // tags and notes are the team's own remarks about the client: not shown to them.
        createdAt: customer.created_at,
        updatedAt: customer.updated_at,
      }

      let membershipInfo: any = {
        currentTier: null,
        nextTier: null,
      }
      let spendingInfo: any = null

      if (customer.tier_id) {
        membershipInfo.currentTier = {
          id: customer.tier_id,
          name: customer.tier_name,
          level: customer.tier_level,
          discount: customer.discount_percentage,
          color: customer.color,
          icon: customer.icon,
        }

        // Get next tier if not at highest
        if (customer.max_purchase === null || totalSpent < customer.max_purchase) {
          const nextTierResult = await query<MembershipTierRow[]>(
            `SELECT id, name, tier_level, discount_percentage, min_purchase, max_purchase, color, icon
             FROM membership_plans
             WHERE status = 'active' AND tier_level > ?
             ORDER BY tier_level ASC
             LIMIT 1`,
            [customer.tier_level || 0]
          )

          if (nextTierResult.length > 0) {
            const nextTier = nextTierResult[0]
            const spendNeeded = Math.max(0, nextTier.min_purchase - totalSpent)

            membershipInfo.nextTier = {
              id: nextTier.id,
              name: nextTier.name,
              level: nextTier.tier_level,
              discount: nextTier.discount_percentage,
              minPurchase: nextTier.min_purchase,
              color: nextTier.color,
              icon: nextTier.icon,
            }

            spendingInfo = {
              totalSpent,
              currentTierMinPurchase: customer.min_purchase,
              currentTierMaxPurchase: customer.max_purchase,
              nextTierMinPurchase: nextTier.min_purchase,
              amountNeededForNextTier: spendNeeded,
              percentageTowardNextTier: Math.round(
                ((totalSpent - customer.min_purchase) / (nextTier.min_purchase - customer.min_purchase)) * 100
              ),
            }
          } else {
            spendingInfo = {
              totalSpent,
              currentTierMinPurchase: customer.min_purchase,
              currentTierMaxPurchase: customer.max_purchase,
              nextTierMinPurchase: null,
              amountNeededForNextTier: 0,
              percentageTowardNextTier: 100,
              isMaxTier: true,
            }
          }
        } else {
          spendingInfo = {
            totalSpent,
            currentTierMinPurchase: customer.min_purchase,
            currentTierMaxPurchase: customer.max_purchase,
            nextTierMinPurchase: null,
            amountNeededForNextTier: 0,
            percentageTowardNextTier: 100,
            isMaxTier: true,
          }
        }
      } else {
        // No tier assigned yet, get bronze tier as default
        const bronzeTierResult = await query<MembershipTierRow[]>(
          `SELECT id, name, tier_level, discount_percentage, min_purchase, max_purchase, color, icon
           FROM membership_plans
           WHERE status = 'active'
           ORDER BY tier_level ASC
           LIMIT 1`
        )

        if (bronzeTierResult.length > 0) {
          const bronzeTier = bronzeTierResult[0]
          membershipInfo.currentTier = {
            id: bronzeTier.id,
            name: bronzeTier.name,
            level: bronzeTier.tier_level,
            discount: bronzeTier.discount_percentage,
            color: bronzeTier.color,
            icon: bronzeTier.icon,
          }

          const nextTierResult = await query<MembershipTierRow[]>(
            `SELECT id, name, tier_level, discount_percentage, min_purchase, max_purchase, color, icon
             FROM membership_plans
             WHERE status = 'active' AND tier_level > ?
             ORDER BY tier_level ASC
             LIMIT 1`,
            [bronzeTier.tier_level]
          )

          if (nextTierResult.length > 0) {
            const nextTier = nextTierResult[0]
            membershipInfo.nextTier = {
              id: nextTier.id,
              name: nextTier.name,
              level: nextTier.tier_level,
              discount: nextTier.discount_percentage,
              minPurchase: nextTier.min_purchase,
              color: nextTier.color,
              icon: nextTier.icon,
            }

            spendingInfo = {
              totalSpent,
              currentTierMinPurchase: bronzeTier.min_purchase,
              currentTierMaxPurchase: bronzeTier.max_purchase,
              nextTierMinPurchase: nextTier.min_purchase,
              amountNeededForNextTier: nextTier.min_purchase - totalSpent,
              percentageTowardNextTier: Math.round((totalSpent / nextTier.min_purchase) * 100),
            }
          }
        }
      }

      return NextResponse.json({
        user: {
          id: customer.id,
          email: customer.email,
          name: customer.name,
          avatar: customer.avatar,
          role: "customer",
          roleId: "customer",
          status: customer.status,
          createdAt: customer.created_at,
          updatedAt: customer.updated_at,
        },
        permissions: ["view_profile", "place_order"],
        mustChangePassword,
        customer: customerInfo,
        membership: membershipInfo,
        spending: spendingInfo,
      })
    }

    // Handle Admin/Staff User Session
    const userResult = await query<UserRow[]>(
      "SELECT * FROM users WHERE id = ?",
      [session.userId]
    )

    if (userResult.length === 0 || userResult[0].status !== "active") {
      await endSession()
      return NextResponse.json(
        { error: "User not found or inactive" },
        { status: 401 }
      )
    }

    const user = userResult[0]

    // Get role with permissions
    let role = null
    let permissions: string[] = []

    if (user.role_id) {
      const roleResult = await query<RoleRow[]>(
        `SELECT r.id, r.name, GROUP_CONCAT(rp.permission) as permissions
         FROM roles r
         LEFT JOIN role_permissions rp ON r.id = rp.role_id
         WHERE r.id = ?
         GROUP BY r.id`,
        [user.role_id]
      )

      if (roleResult.length > 0) {
        role = {
          id: roleResult[0].id,
          name: roleResult[0].name,
        }
        permissions = roleResult[0].permissions ? roleResult[0].permissions.split(",") : []
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: role?.name || "viewer",
        roleId: user.role_id,
        status: user.status,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      permissions,
      mustChangePassword,
    })
  } catch (error) {
    console.error("GET /api/auth/me error:", error)
    return NextResponse.json(
      { error: "Failed to get user" },
      { status: 500 }
    )
  }
}

export const GET = withCors(meHandler)

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  })
}
