import { forbidden } from "@/server/http/errors";
import type { SafeUser } from "@/types/auth";

export function requireRole(user: SafeUser, roles: SafeUser["role"][]) {
  if (!roles.includes(user.role)) throw forbidden();
  return user;
}
