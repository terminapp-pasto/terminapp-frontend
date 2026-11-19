// The password never leaves the browser as typed: it is sent as
// SHA-256("terminapp|" + email + "|" + password), in hexadecimal. The email works as a
// salt, so two people with the same password send different values. The backend
// (authentication/utilities.py, browser_password_hash) then stores the PBKDF2 hash of it.

const HASH_PREFIX = "terminapp";

export async function hashPasswordForSending(email: string, password: string) {
  const text = `${HASH_PREFIX}|${email.trim().toLowerCase()}|${password}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
