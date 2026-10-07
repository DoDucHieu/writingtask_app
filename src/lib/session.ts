import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "wt2_session";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error("Thiếu AUTH_SECRET");
  }
  return new TextEncoder().encode(value);
}

export async function signSession(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function readSession(token: string) {
  const { payload } = await jwtVerify(token, secret());
  return typeof payload.sub === "string" ? payload.sub : null;
}

export function sessionCookieOptions(maxAge = 60 * 60 * 24 * 30) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
