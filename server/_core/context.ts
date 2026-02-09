import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Authenticate user via OAuth - required for all users
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // User is not authenticated - they must log in
    // This is expected for public pages like the homepage
    console.debug("[Auth] User not authenticated:", error instanceof Error ? error.message : String(error));
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
