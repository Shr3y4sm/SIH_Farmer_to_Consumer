import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "../../../../lib/session";

/** Returns the signed-in user, or 401 when the session cookie is missing/invalid/expired. */
export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  return NextResponse.json({ user });
}