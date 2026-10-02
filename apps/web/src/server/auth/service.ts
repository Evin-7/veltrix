import "server-only";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
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

type PlayerAccountInput = {
  email: string;
  passwordHash: string | null;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

async function createPlayerAccount(tx: Prisma.TransactionClient, input: PlayerAccountInput) {
  const createdUser = await tx.user.create({
    data: {
      email: input.email,
      passwordHash: input.passwordHash,
      role: "PLAYER",
      status: "ACTIVE",
      profile: {
        create: {
          username: input.username,
          displayName: input.displayName ?? input.username,
          avatarUrl: input.avatarUrl ?? undefined,
        },
      },
    },
    include: userWithProfile,
  });

  // Keep all player onboarding in one transaction so Google accounts receive
  // exactly the same wallet, welcome credit, progression, and safety defaults.
  await createPlayerWalletWithWelcome(tx, createdUser.id);
  await tx.playerProgression.create({ data: { userId: createdUser.id, level: "BRONZE", xp: 0 } });
  await tx.responsibleGamingSetting.create({ data: { userId: createdUser.id } });
  return createdUser;
}

export async function registerUser(input: RegisterInput): Promise<SafeUser> {
  const passwordHash = await hashPassword(input.password);
  const prisma = getPrisma();

  try {
    const user = await prisma.$transaction(async (tx) => {
      return createPlayerAccount(tx, { email: input.email, passwordHash, username: input.username });
    }, { maxWait: 15_000, timeout: 30_000 });

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
  if (!user || user.status !== "ACTIVE" || !user.passwordHash || !(await verifyPassword(user.passwordHash, input.password))) {
    throw new Error("INVALID_CREDENTIALS");
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return toSafeUser(user);
}

export type GoogleIdentity = {
  providerAccountId: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

const GOOGLE_PROVIDER = "google";

function googleUsername(identity: GoogleIdentity) {
  const localPart = identity.email.split("@", 1)[0] ?? "player";
  const base = localPart.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^_+|_+$/g, "").slice(0, 17) || "player";
  const suffix = createHash("sha256").update(identity.providerAccountId).digest("hex").slice(0, 6);
  return `${base}_${suffix}`.slice(0, 24);
}

function isUniqueConstraint(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function resolveGoogleUser(identity: GoogleIdentity) {
  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    const existingAccount = await tx.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider: GOOGLE_PROVIDER, providerAccountId: identity.providerAccountId } },
      include: { user: { include: userWithProfile } },
    });

    if (existingAccount) {
      if (existingAccount.user.status !== "ACTIVE") throw new Error("GOOGLE_ACCOUNT_DISABLED");
      await tx.user.update({ where: { id: existingAccount.userId }, data: { lastLoginAt: new Date() } });
      return tx.user.findUniqueOrThrow({ where: { id: existingAccount.userId }, include: userWithProfile });
    }

    const existingUser = await tx.user.findUnique({ where: { email: identity.email }, include: userWithProfile });
    if (existingUser) {
      if (existingUser.status !== "ACTIVE") throw new Error("GOOGLE_ACCOUNT_DISABLED");
      // Never let a Google email claim an admin account. Admin identities must
      // be explicitly provisioned and linked outside the player login surface.
      if (existingUser.role !== "PLAYER") throw new Error("GOOGLE_ACCOUNT_LINK_NOT_ALLOWED");

      if (existingUser.profile) {
        const profileData: { displayName?: string; avatarUrl?: string } = {};
        if (!existingUser.profile.displayName && identity.displayName) profileData.displayName = identity.displayName;
        if (!existingUser.profile.avatarUrl && identity.avatarUrl) profileData.avatarUrl = identity.avatarUrl;
        if (Object.keys(profileData).length > 0) {
          await tx.profile.update({ where: { userId: existingUser.id }, data: profileData });
        }
      } else {
        await tx.profile.create({
          data: {
            userId: existingUser.id,
            username: googleUsername(identity),
            displayName: identity.displayName ?? identity.email.split("@", 1)[0],
            avatarUrl: identity.avatarUrl ?? undefined,
          },
        });
      }

      await tx.oAuthAccount.create({ data: { userId: existingUser.id, provider: GOOGLE_PROVIDER, providerAccountId: identity.providerAccountId } });
      await tx.user.update({ where: { id: existingUser.id }, data: { lastLoginAt: new Date() } });
      return tx.user.findUniqueOrThrow({ where: { id: existingUser.id }, include: userWithProfile });
    }

    const createdUser = await createPlayerAccount(tx, {
      email: identity.email,
      passwordHash: null,
      username: googleUsername(identity),
      displayName: identity.displayName ?? identity.email.split("@", 1)[0],
      avatarUrl: identity.avatarUrl,
    });
    await tx.oAuthAccount.create({ data: { userId: createdUser.id, provider: GOOGLE_PROVIDER, providerAccountId: identity.providerAccountId } });
    return createdUser;
  }, { maxWait: 15_000, timeout: 30_000 });
}

export async function authenticateGoogleUser(identity: GoogleIdentity): Promise<SafeUser> {
  // A simultaneous first login can race on the email/provider unique indexes.
  // Retrying lets the second request resolve the account that won the race.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return toSafeUser(await resolveGoogleUser(identity));
    } catch (error) {
      if (!isUniqueConstraint(error) || attempt === 1) throw error;
    }
  }

  throw new Error("GOOGLE_ACCOUNT_RESOLUTION_FAILED");
}
