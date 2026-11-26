/**
 * Keeps a client's TEMPORARY password readable for staff (Customers page) until
 * the client signs in and chooses their own. Encrypted with AES-256-GCM using a
 * key derived from the session signing key; deleted as soon as the client
 * changes it. A password the client chose is never stored this way.
 */
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "crypto"
import { sessionSecret } from "@/lib/session"

async function key(): Promise<Buffer> {
  return createHmac("sha256", await sessionSecret()).update("temp-password-vault-v1").digest()
}

export async function sealTempPassword(password: string): Promise<string> {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", await key(), iv)
  const data = Buffer.concat([cipher.update(password, "utf8"), cipher.final()])
  return `v1.${iv.toString("base64url")}.${data.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}`
}

/** The temporary password, or null when missing or unreadable (e.g. the key changed). */
export async function openTempPassword(sealed: string | null | undefined): Promise<string | null> {
  if (!sealed) return null
  const [v, iv, data, tag] = sealed.split(".")
  if (v !== "v1" || !iv || !data || !tag) return null
  try {
    const decipher = createDecipheriv("aes-256-gcm", await key(), Buffer.from(iv, "base64url"))
    decipher.setAuthTag(Buffer.from(tag, "base64url"))
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8")
  } catch {
    return null
  }
}
