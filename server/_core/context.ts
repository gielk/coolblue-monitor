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
  if (!db) {
    throw new Error("[Context] Database not available");
  }

  // Check if default user exists
  const existingUser = await db.select().from(users).where(eq(users.openId, "local-user")).limit(1);

  if (existingUser.length > 0) {
    console.log("[Context] Using existing default user");
    return existingUser[0];
  }

  // Create default user for local installation
  console.log("[Context] Creating new default user");
  const [newUser] = await db.insert(users).values({
    openId: "local-user",
    name: "Local User",
    email: process.env.GMAIL_EMAIL || "local@localhost",
    loginMethod: "local",
    role: "admin",
  });

  // Fetch the created user
  const createdUser = await db.select().from(users).where(eq(users.id, newUser.insertId)).limit(1);
  console.log("[Context] Created user with ID:", newUser.insertId);
  return createdUser[0];
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Always use default user in production or when SKIP_AUTH is enabled
  const skipAuth = process.env.NODE_ENV === "production" ||
                   process.env.SKIP_AUTH === "true" ||
                   !process.env.VITE_OAUTH_PORTAL_URL;

  if (skipAuth) {
    console.log("[Context] Using default user (skipAuth=true)");
    user = await getOrCreateDefaultUser();
  } else {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      console.log("[Context] Auth failed, falling back to default user");
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
