import "server-only";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { getEnv } from "@/server/env";
import { unauthorized } from "@/server/http/errors";
import type { SafeUser } from "@/types/auth";
import { createSessionToken, hashSessionToken } from "./token";

export type { SafeUser } from "@/types/auth";

export const SESSION_COOKIE_NAME = "veltrix_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

type UserWithProfile = Prisma.UserGetPayload<{ include: { profile: true } }>;

export function toSafeUser(user: UserWithProfile): SafeUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    profile: user.profile ? { username: user.profile.username, displayName: user.profile.displayName, avatarUrl: user.profile.avatarUrl } : null,
  };
}

function getRequestToken() {
  return cookies().then((store) => store.get(SESSION_COOKIE_NAME)?.value);
}

export async function createSession(userId: string) {
  const prisma = getPrisma();
  const token = createSessionToken();
  const tokenHash = hashSessionToken(token, getEnv().AUTH_SECRET);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await prisma.authSession.create({ data: { userId, tokenHash, expiresAt } });
  return { token, expiresAt };
}

export async function revokeSession(token: string | undefined) {
  if (!token) return;
  const prisma = getPrisma();
  await prisma.authSession.updateMany({ where: { tokenHash: hashSessionToken(token, getEnv().AUTH_SECRET), revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: getEnv().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, "", { httpOnly: true, secure: getEnv().NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  const token = await getRequestToken();
  if (!token || token.length < 30) return null;
  const prisma = getPrisma();

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashSessionToken(token, getEnv().AUTH_SECRET) },
    include: { user: { include: { profile: true } } },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") return null;

  return toSafeUser(session.user);
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}
