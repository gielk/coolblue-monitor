import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

async function getOrCreateDefaultUser(): Promise<User> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if default user exists
  const existingUser = await db.select().from(users).where(eq(users.openId, "local-user")).limit(1);

  if (existingUser.length > 0) {
    return existingUser[0];
  }

  // Create default user for local installation
  const [newUser] = await db.insert(users).values({
    openId: "local-user",
    name: "Local User",
    email: process.env.GMAIL_EMAIL || "local@localhost",
    loginMethod: "local",
    role: "admin",
  });

  // Fetch the created user
  const createdUser = await db.select().from(users).where(eq(users.id, newUser.insertId)).limit(1);
  return createdUser[0];
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // For local installations, skip OAuth and use default user
  if (process.env.NODE_ENV === "production" || process.env.SKIP_AUTH === "true") {
    user = await getOrCreateDefaultUser();
  } else {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // In development, also fall back to default user
      user = await getOrCreateDefaultUser();
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
