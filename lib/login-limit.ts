/**
 * Slows down password guessing. Counted per account (email or mobile number),
 * not per address: website sign-ins all reach the admin from the website server.
 *
 * The first 5 wrong passwords in 15 minutes cost nothing; after that each one
 * adds a growing wait (1, 2, 4, 8, then 15 minutes at most). The right password
 * clears the count. Kept in the database so every server process sees it.
 */
import type { RowDataPacket } from "mysql2"
import { query } from "@/lib/db/config"

const FREE_ATTEMPTS = 5
const WINDOW_MIN = 15
const MAX_WAIT_MIN = 15

let ready: Promise<void> | null = null
function ensureTable(): Promise<void> {
  ready ??= query(
    `CREATE TABLE IF NOT EXISTS login_attempts (
       identifier VARCHAR(255) NOT NULL PRIMARY KEY,
       failures INT NOT NULL DEFAULT 0,
       first_failure_at DATETIME NOT NULL,
       blocked_until DATETIME NULL
     )`
  )
    .then(() => undefined)
    .catch((e) => {
      ready = null
      throw e
    })
  return ready
}

interface AttemptRow extends RowDataPacket {
  wait_seconds: number | null
}

/** Seconds to wait before this account may try again (0 = go ahead). */
export async function loginWaitSeconds(identifier: string): Promise<number> {
  await ensureTable()
  const [row] = await query<AttemptRow[]>(
    "SELECT TIMESTAMPDIFF(SECOND, NOW(), blocked_until) AS wait_seconds FROM login_attempts WHERE identifier = ?",
    [identifier]
  )
  return Math.max(0, Number(row?.wait_seconds ?? 0))
}

export async function recordLoginFailure(identifier: string): Promise<void> {
  await ensureTable()
  // A count older than the window starts again from 1.
  await query(
    `INSERT INTO login_attempts (identifier, failures, first_failure_at) VALUES (?, 1, NOW())
     ON DUPLICATE KEY UPDATE
       failures = IF(first_failure_at < NOW() - INTERVAL ${WINDOW_MIN} MINUTE, 1, failures + 1),
       first_failure_at = IF(first_failure_at < NOW() - INTERVAL ${WINDOW_MIN} MINUTE, NOW(), first_failure_at)`,
    [identifier]
  )
  await query(
    `UPDATE login_attempts
     SET blocked_until = IF(failures > ${FREE_ATTEMPTS},
       NOW() + INTERVAL LEAST(POW(2, failures - ${FREE_ATTEMPTS} - 1), ${MAX_WAIT_MIN}) MINUTE, NULL)
     WHERE identifier = ?`,
    [identifier]
  )
}

export async function clearLoginFailures(identifier: string): Promise<void> {
  await ensureTable()
  await query("DELETE FROM login_attempts WHERE identifier = ?", [identifier])
}

export function waitMessage(seconds: number): string {
  const minutes = Math.ceil(seconds / 60)
  return `Too many wrong passwords. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
}
