import "server-only";
import { getPrisma } from "@/server/db/prisma";
import { conflict } from "@/server/http/errors";
import { hashPassword, verifyPassword } from "./password";
import { toSafeUser } from "./session";
import { createPlayerWalletWithWelcome } from "@/server/wallet/service";
import type { SafeUser } from "@/types/auth";
import type { z } from "zod";
import type { loginSchema, registerSchema } from "./schemas";

type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;

const userWithProfile = { profile: true } as const;

export async function registerUser(input: RegisterInput): Promise<SafeUser> {
  const passwordHash = await hashPassword(input.password);
  const prisma = getPrisma();

  try {
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          role: "PLAYER",
          status: "ACTIVE",
          profile: { create: { username: input.username, displayName: input.username } },
        },
        include: userWithProfile,
      });
      await createPlayerWalletWithWelcome(tx, createdUser.id);
      return createdUser;
    });

    return toSafeUser(user);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      throw conflict("Email or username is already in use.");
    }
    throw error;
  }
}

export async function authenticateUser(input: LoginInput): Promise<SafeUser> {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { email: input.email }, include: userWithProfile });
  if (!user || user.status !== "ACTIVE" || !(await verifyPassword(user.passwordHash, input.password))) {
    throw new Error("INVALID_CREDENTIALS");
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return toSafeUser(user);
}
