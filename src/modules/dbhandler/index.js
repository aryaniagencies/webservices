import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { getConfig } from "../../config/index.js";


let prisma;

export const dbhandler = {

  getDatabase(env = globalThis.process?.env ?? {}) {
    if (!prisma) {
      const { databaseUrl } = getConfig(env);
      if (!databaseUrl) throw new Error("DATABASE_URL is required to use the database manager");
      prisma = new PrismaClient({ datasourceUrl: databaseUrl }).$extends(withAccelerate());
    }
    return prisma;
  },

  async disconnectDatabase() {
    if (prisma?.$disconnect) await prisma.$disconnect();
    prisma = undefined;
  },

  async addDatabaseEntry(model, data, env) {
    if (typeof model !== "string" || !model.trim()) {
      throw new TypeError("A database model name is required");
    }

    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      throw new TypeError("Database entry data must be an object");
    }

    const database = this.getDatabase(env);
    const delegate = database?.[model];

    if (!delegate?.create) {
      throw new Error(`Unknown database model: ${model}`);
    }

    return delegate.create({ data });
  },

  async getDatabaseEntry(model, where, env = globalThis.process?.env ?? {}) {
    const database = this.getDatabase(env);
    const delegate = database?.[model];

    if (!delegate?.findUnique) {
      throw new Error(`Unknown database model: ${model}`);
    }

    return delegate.findUnique({ where });
  },
};

export const databaseManager = {
  getDatabase: dbhandler.getDatabase,
  disconnectDatabase: dbhandler.disconnectDatabase,
  addDatabaseEntry: dbhandler.addDatabaseEntry,
  getDatabaseEntry: dbhandler.getDatabaseEntry,
};
