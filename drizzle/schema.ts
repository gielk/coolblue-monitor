import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const monitoredProducts = mysqlTable("monitored_products", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  productUrl: text("productUrl").notNull(),
  productName: varchar("productName", { length: 255 }),
  productImage: text("productImage"),
  originalPrice: int("originalPrice"), // stored in cents
  tweedeKansPrice: int("tweedeKansPrice"), // stored in cents
  tweedeKansAvailable: boolean("tweedeKansAvailable").default(false).notNull(),
  checkIntervalMinutes: int("checkIntervalMinutes").default(60).notNull(), // 15, 30, 60, 120, etc
  lastCheckedAt: timestamp("lastCheckedAt"),
  lastNotifiedAt: timestamp("lastNotifiedAt"),
  userEmail: varchar("userEmail", { length: 320 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MonitoredProduct = typeof monitoredProducts.$inferSelect;
export type InsertMonitoredProduct = typeof monitoredProducts.$inferInsert;

export const checkHistory = mysqlTable("check_history", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().references(() => monitoredProducts.id, { onDelete: "cascade" }),
  tweedeKansAvailable: boolean("tweedeKansAvailable").notNull(),
  originalPrice: int("originalPrice"),
  tweedeKansPrice: int("tweedeKansPrice"),
  checkStatus: varchar("checkStatus", { length: 50 }).default("success").notNull(), // success, failed, error
  errorMessage: text("errorMessage"),
  checkedAt: timestamp("checkedAt").defaultNow().notNull(),
});

export type CheckHistory = typeof checkHistory.$inferSelect;
export type InsertCheckHistory = typeof checkHistory.$inferInsert;