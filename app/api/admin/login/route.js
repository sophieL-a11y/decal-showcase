import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, expectedSessionToken } from "../../../../lib/auth";

export async function POST(request) {
  const { password } = await request.json().catch(() => ({}));
  const configuredPassword = process.env.ADMIN_PASSWORD;

  if (!configuredPassword) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD is not set on the server. Add it in Vercel's project settings." },
      { status: 500 }
    );
  }

  if (typeof password !== "string" || password !== configuredPassword) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  let token;
  try {
    token = await expectedSessionToken();
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14, // 14 days
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}
