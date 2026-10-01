import "server-only";
import { PrismaClient } from "@prisma/client";
import { getEnv } from "@/server/env";

const globalForPrisma = globalThis as typeof globalThis & {
  veltrixPrisma?: PrismaClient;
};

function createPrismaClient() {
  getEnv();
  return new PrismaClient();
}

export function getPrisma() {
  if (!globalForPrisma.veltrixPrisma) {
    globalForPrisma.veltrixPrisma = createPrismaClient();
  }
  return globalForPrisma.veltrixPrisma;
}
