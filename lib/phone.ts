/**
 * Mobile numbers as stored for sign-in. Must stay identical to normalizePhone()
 * in the website (src/lib/membership.ts), which sends numbers in this form.
 *
 * UAE mobile numbers in any common spelling become 9715XXXXXXXX
 * (+971 50…, 00971 50…, 971050…, 050…, 50…). Other countries keep their digits.
 */
export function normalizePhone(input: unknown): string {
  let digits = String(input ?? "").replace(/\D/g, "")
  if (digits.startsWith("00")) digits = digits.slice(2)
  if (digits.startsWith("9710")) digits = `971${digits.slice(4)}`
  if (digits.length === 10 && digits.startsWith("05")) digits = `971${digits.slice(1)}`
  if (digits.length === 9 && digits.startsWith("5")) digits = `971${digits}`
  return digits
}

/** Long enough to be a real number with a country code (E.164 allows up to 15 digits). */
export function isPlausiblePhone(normalized: string): boolean {
  return normalized.length >= 9 && normalized.length <= 15
}

/** UAE landline (02, 03, 04, 06, 07, 09 areas), which cannot receive WhatsApp messages as a rule. */
export function isUaeLandline(normalized: string): boolean {
  return /^971[234679]\d{7}$/.test(normalized)
}

/** "+971 50 123 4567" style for staff screens. */
export function formatPhone(normalized: string): string {
  if (/^9715\d{8}$/.test(normalized)) {
    return `+971 ${normalized.slice(3, 5)} ${normalized.slice(5, 8)} ${normalized.slice(8)}`
  }
  return normalized ? `+${normalized}` : ""
}
