export type SafeUser = {
  id: string;
  email: string;
  role: "PLAYER" | "ADMIN" | "SUPER_ADMIN";
  status: "ACTIVE" | "DISABLED";
  createdAt: string;
  profile: { username: string; displayName: string | null; avatarUrl: string | null } | null;
};
