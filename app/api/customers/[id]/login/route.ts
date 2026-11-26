// GET /api/customers/:id/login — the client's sign-in details for staff:
// mobile, whether they can sign in, their TEMPORARY password while it is still
// unchanged (never one they chose), and their projects. Administrators and managers only.
import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2"
import { query } from "@/lib/db/config"
import { currentTempLogin, ownerOnly } from "@/lib/client-login-accounts"
import { ensureCustomerColumns } from "@/lib/customer-accounts"
import { projectsFor } from "@/lib/client-projects"
import { formatPhone } from "@/lib/phone"

export const dynamic = "force-dynamic"

interface Row extends RowDataPacket {
  id: string
  name: string
  email: string | null
  phone: string | null
  phone_normalized: string | null
  has_password: number
  must_change_password: number
  monday_total: string | null
  first_order_date: Date | string | null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await ownerOnly()
  if (denied) return NextResponse.json({ error: denied }, { status: 403 })
  const { id } = await params
  await ensureCustomerColumns()
  const [c] = await query<Row[]>(
    `SELECT id, name, email, phone, phone_normalized, password_hash IS NOT NULL AS has_password,
            must_change_password, monday_total, first_order_date
     FROM customers WHERE id = ?`,
    [id]
  )
  if (!c) return NextResponse.json({ error: "Customer not found" }, { status: 404 })
  const temp = await currentTempLogin(c.id)
  const projects = (await projectsFor([c.id])).get(c.id) ?? []
  return NextResponse.json(
    {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone_normalized ? formatPhone(c.phone_normalized) : c.phone,
      canSignIn: Boolean(Number(c.has_password)),
      waitingForFirstSignIn: Boolean(Number(c.must_change_password)) && Boolean(Number(c.has_password)),
      temporaryPassword: temp?.password ?? null,
      message: temp?.message ?? null,
      mondayTotal: c.monday_total === null ? null : Number(c.monday_total),
      projects,
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
