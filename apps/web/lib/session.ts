/**
 * Stateless session helpers: an HMAC-SHA256 signed, expiring token carried in an httpOnly
 * cookie. Built on Web Crypto only, so the same module runs in route handlers (Node) and in
 * edge middleware without any Node-specific imports.
 */

export type AuthRole = "farmer" | "operator" | "consumer";

export type SessionUser = {
  sub: string;
  email: string;
  name: string;
  role: AuthRole;
};

type TokenPayload = SessionUser & { iat: number; exp: number };

export const SESSION_COOKIE = "farmit_session";
/** Seven days; the demo marketplace is a weekly cycle so this outlives a single run. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  return verifySessionToken(token);
}

/** Dev fallback. Set AUTH_SECRET to a long random string for any deployed environment. */
const SESSION_SECRET = process.env.AUTH_SECRET ?? "farmit-demo-auth-secret-change-me";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function isAuthRole(value: unknown): value is AuthRole {
  return value === "farmer" || value === "operator" || value === "consumer";
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (base64.length % 4)) % 4;
  const binary = atob(base64 + "=".repeat(padding));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return hex;
}

/** Length-safe comparison for the HMAC signature (no early return on mismatch). */
function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

/** Signs a user into a `v1.<payload>.<signature>` token. */
export async function signSessionToken(user: SessionUser): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = { ...user, iat: now, exp: now + SESSION_MAX_AGE_SECONDS };
  const payloadPart = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(`v1.${payloadPart}`)),
  );
  return `v1.${payloadPart}.${bytesToHex(signature)}`;
}

/** Verifies signature and expiry; returns the user or null when invalid/expired. */
export async function verifySessionToken(token: string | null | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const signingInput = `v1.${parts[1]}`;
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(signingInput)));
  if (!safeEqual(bytesToHex(expected), parts[2])) return null;

  let payload: TokenPayload;
  try {
    payload = JSON.parse(decoder.decode(base64UrlToBytes(parts[1]))) as TokenPayload;
  } catch {
    return null;
  }
  if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) return null;
  if (!payload.sub || !payload.email || !payload.name || !isAuthRole(payload.role)) return null;
  return { sub: payload.sub, email: payload.email, name: payload.name, role: payload.role };
}
