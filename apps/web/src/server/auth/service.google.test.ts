import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => {
  const users = new Map<string, { id: string; email: string; role: "PLAYER"; status: "ACTIVE"; createdAt: Date; profile: { userId: string; username: string; displayName: string | null; avatarUrl: string | null } | null }>();
  const accounts = new Map<string, { userId: string; provider: string; providerAccountId: string }>();

  const findUser = (where: { id?: string; email?: string }) => [...users.values()].find((user) => (where.id ? user.id === where.id : user.email === where.email)) ?? null;
  const tx = {
    user: {
      create: vi.fn(async ({ data }: { data: { email: string; profile: { create: { username: string; displayName: string; avatarUrl?: string } } } }) => {
        const id = `user-${users.size + 1}`;
        const user = { id, email: data.email, role: "PLAYER" as const, status: "ACTIVE" as const, createdAt: new Date(), profile: { userId: id, username: data.profile.create.username, displayName: data.profile.create.displayName, avatarUrl: data.profile.create.avatarUrl ?? null } };
        users.set(id, user);
        return user;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id?: string; email?: string } }) => findUser(where)),
      findUniqueOrThrow: vi.fn(async ({ where }: { where: { id?: string } }) => findUser(where)),
      update: vi.fn(async ({ where }: { where: { id: string } }) => findUser(where)),
    },
    oAuthAccount: {
      findUnique: vi.fn(async ({ where }: { where: { provider_providerAccountId: { provider: string; providerAccountId: string } } }) => {
        const account = accounts.get(`${where.provider_providerAccountId.provider}:${where.provider_providerAccountId.providerAccountId}`);
        return account ? { ...account, user: findUser({ id: account.userId }) } : null;
      }),
      create: vi.fn(async ({ data }: { data: { userId: string; provider: string; providerAccountId: string } }) => {
        accounts.set(`${data.provider}:${data.providerAccountId}`, data);
        return data;
      }),
    },
    profile: {
      update: vi.fn(async ({ where, data }: { where: { userId: string }; data: { displayName?: string; avatarUrl?: string } }) => {
        const user = findUser({ id: where.userId });
        if (user?.profile) Object.assign(user.profile, data);
        return user?.profile;
      }),
      create: vi.fn(async ({ data }: { data: { userId: string; username: string; displayName: string; avatarUrl?: string } }) => {
        const user = findUser({ id: data.userId });
        if (user) user.profile = { ...data, avatarUrl: data.avatarUrl ?? null };
        return user?.profile;
      }),
    },
    playerProgression: { create: vi.fn() },
    responsibleGamingSetting: { create: vi.fn() },
  };
  const db = { $transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx)) };
  return { users, accounts, tx, db, welcome: vi.fn() };
});

vi.mock("@/server/db/prisma", () => ({ getPrisma: () => harness.db }));
vi.mock("@/server/wallet/service", () => ({ createPlayerWalletWithWelcome: harness.welcome }));
vi.mock("./session", () => ({ toSafeUser: (user: { id: string }) => ({ id: user.id }) }));

import { authenticateGoogleUser } from "./service";

describe("Google user resolution", () => {
  beforeEach(() => {
    harness.users.clear();
    harness.accounts.clear();
    harness.welcome.mockClear();
    vi.clearAllMocks();
  });

  it("creates one player account and provisions onboarding once across duplicate callbacks", async () => {
    const identity = { providerAccountId: "google-sub-1", email: "player@example.com", displayName: "Player" };
    const first = await authenticateGoogleUser(identity);
    const second = await authenticateGoogleUser(identity);

    expect(first.id).toBe(second.id);
    expect(harness.users.size).toBe(1);
    expect(harness.accounts.size).toBe(1);
    expect(harness.welcome).toHaveBeenCalledTimes(1);
  });

  it("links a verified-email Google identity to the existing player without a new wallet", async () => {
    harness.users.set("existing-user", { id: "existing-user", email: "existing@example.com", role: "PLAYER", status: "ACTIVE", createdAt: new Date(), profile: { userId: "existing-user", username: "existing", displayName: "Existing", avatarUrl: null } });

    const linked = await authenticateGoogleUser({ providerAccountId: "google-sub-2", email: "existing@example.com", displayName: "Existing" });

    expect(linked.id).toBe("existing-user");
    expect(harness.accounts.get("google:google-sub-2")?.userId).toBe("existing-user");
    expect(harness.welcome).not.toHaveBeenCalled();
  });
});
