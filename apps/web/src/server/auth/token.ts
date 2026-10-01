import { createHmac, randomBytes } from "node:crypto";

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string, secret: string) {
  return createHmac("sha256", secret).update(token).digest("hex");
}
