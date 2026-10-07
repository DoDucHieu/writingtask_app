import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    password?: unknown;
  } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const matched = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !matched) {
    return NextResponse.json(
      { error: "Email hoặc mật khẩu chưa đúng." },
      { status: 401 },
    );
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(user.id), sessionCookieOptions());
  return NextResponse.json({ ok: true });
}
