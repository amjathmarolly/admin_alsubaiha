/**
 * Staff (users table) password checks.
 *
 * Passwords are checked against users.password_hash with bcrypt. The four
 * original accounts were set up with fixed starter passwords that were written
 * into the code; those keep working only until the account's password is
 * changed once (users.password_changed_at is then set), after which bcrypt is
 * the only check. Any other account needs a matching bcrypt hash.
 */
import bcrypt from "bcrypt"
import { query } from "@/lib/db/config"
import { addColumnIfMissing } from "@/lib/seo"

/** bcrypt hashes of the starter passwords the original code shipped with. */
const STARTER_HASHES: Record<string, string> = {
  "admin@alsubaiha.com": "$2b$12$QgXNNx77pi7kIg55PLgl0.LTna1tdwS9/fHR.vgpl42CnBPnnbae6",
  "manager@alsubaiha.com": "$2b$12$N8yvjh5yEbxvncaILq.qfuZtJVjzEIUzoUttbkdgPenL15npH9RFu",
  "staff@alsubaiha.com": "$2b$12$C6o5zMR.U6MV5BpZUMTSsuad6RNpVjaOix9dHdn.E50NVGJet5Nme",
  "viewer@alsubaiha.com": "$2b$12$FefX/ohxbNYMozGkZRblZue1zD87cjGhHz7DR6rTj8doPLi4y2hbO",
}

let columnReady: Promise<void> | null = null
export function ensurePasswordColumn(): Promise<void> {
  columnReady ??= addColumnIfMissing("users", "password_changed_at", "DATETIME NULL").catch((e) => {
    columnReady = null
    throw e
  })
  return columnReady
}

export interface StaffPasswordRow {
  email: string
  password_hash: string | null
  password_changed_at?: Date | string | null
}

const isBcrypt = (h: unknown): h is string => typeof h === "string" && /^\$2[aby]\$\d{2}\$.{53}$/.test(h)

/**
 * How the password matched: "hash" for the account's own password, "starter" for
 * one of the starter passwords, or false. Starter passwords were published with
 * the old code, so they no longer open anything: sign-in refuses them.
 */
export async function verifyStaffPassword(user: StaffPasswordRow, password: string): Promise<"hash" | "starter" | false> {
  if (typeof password !== "string" || !password) return false
  if (!user.password_changed_at) {
    // Checked first: the stored hash may itself be of the starter password.
    const starter = STARTER_HASHES[user.email.toLowerCase()]
    if (starter && (await bcrypt.compare(password, starter))) return "starter"
  }
  return isBcrypt(user.password_hash) && (await bcrypt.compare(password, user.password_hash)) ? "hash" : false
}

export const MIN_PASSWORD_LENGTH = 10

/** Why a new password is not acceptable, or null when it is fine. */
export async function newPasswordProblem(password: unknown, email: string): Promise<string | null> {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `New password must be at least ${MIN_PASSWORD_LENGTH} characters`
  }
  if (password.length > 200) return "New password is too long"
  if (password.toLowerCase().includes(email.split("@")[0].toLowerCase())) return "New password must not contain your email name"
  for (const h of Object.values(STARTER_HASHES)) {
    if (await bcrypt.compare(password, h)) return "Choose a password that is not one of the old starter passwords"
  }
  return null
}

export async function setStaffPassword(userId: string, password: string): Promise<void> {
  await ensurePasswordColumn()
  const hash = await bcrypt.hash(password, 12)
  await query("UPDATE users SET password_hash = ?, password_changed_at = NOW() WHERE id = ?", [hash, userId])
}
