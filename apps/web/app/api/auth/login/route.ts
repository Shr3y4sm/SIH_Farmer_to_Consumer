import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSessionToken } from "../../../../lib/session";
import { verifyCredentials } from "../../../../lib/users";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = verifyCredentials(email, password);
  if (!user) {
    // Same message for unknown email and wrong password; do not leak which accounts exist.
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = await signSessionToken(user);
  const response = NextResponse.json({ user }, { status: 200 });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}