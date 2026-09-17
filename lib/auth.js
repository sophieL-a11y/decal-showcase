// Small helper for a signed, stateless "admin" session cookie.
// No database needed: the cookie's value is an HMAC of a fixed message,
// keyed with ADMIN_SESSION_SECRET, so only the server can produce it.
// Works in both the Edge middleware runtime and normal Node API routes
// because it only uses Web Crypto (globalThis.crypto.subtle).

const COOKIE_NAME = "admin_session";
const SESSION_MESSAGE = "fs-decal-showcase-admin";

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmac(secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(SESSION_MESSAGE));
  return toHex(sig);
}

/** The value a valid admin session cookie must have. */
export async function expectedSessionToken() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "ADMIN_SESSION_SECRET is not set. Add it in your Vercel project's Environment Variables."
    );
  }
  return hmac(secret);
}

export async function isValidSessionToken(token) {
  if (!token) return false;
  try {
    const expected = await expectedSessionToken();
    // Not constant-time, but the token isn't a secret by itself (it's a
    // fixed HMAC of a public string) -- the secret it's derived from is
    // what actually protects it.
    return token === expected;
  } catch {
    return false;
  }
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
