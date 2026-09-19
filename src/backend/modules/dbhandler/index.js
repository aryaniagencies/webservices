import { PrismaClient } from "@prisma/client";
import { getConfig } from "../../../config/index.js";

let prisma;

export function getDatabase() {
  if (!prisma) {
    const { databaseUrl } = getConfig();
    if (!databaseUrl) throw new Error("DATABASE_URL is required to use the database manager");
    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  }
  return prisma;
}

export async function disconnectDatabase() {
  if (prisma) await prisma.$disconnect();
  prisma = undefined;
}

export const databaseManager = { getDatabase, disconnectDatabase };