import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { readSession, SESSION_COOKIE } from "@/lib/session";

export async function getSessionUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const userId = await readSession(token);
    if (!userId) return null;
    return prisma.user.findUnique({ where: { id: userId } });
  } catch {
    return null;
  }
}
