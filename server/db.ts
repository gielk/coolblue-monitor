import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { checkHistory, InsertCheckHistory, InsertMonitoredProduct, monitoredProducts, InsertUser, users, emailSettings, InsertEmailSettings, priceHistory, InsertPriceHistory } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserProducts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.id, userId)).limit(1);
}

export async function getMonitoredProducts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(monitoredProducts).where(eq(monitoredProducts.userId, userId)).orderBy((t) => t.createdAt);
}

export async function getMonitoredProductById(productId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(monitoredProducts)
    .where(and(eq(monitoredProducts.id, productId), eq(monitoredProducts.userId, userId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createMonitoredProduct(product: InsertMonitoredProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(monitoredProducts).values(product);
  return result;
}

export async function updateMonitoredProduct(productId: number, userId: number, updates: Partial<InsertMonitoredProduct>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(monitoredProducts)
    .set(updates)
    .where(and(eq(monitoredProducts.id, productId), eq(monitoredProducts.userId, userId)));
}

export async function deleteMonitoredProduct(productId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .delete(monitoredProducts)
    .where(and(eq(monitoredProducts.id, productId), eq(monitoredProducts.userId, userId)));
}

export async function addCheckHistory(history: InsertCheckHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(checkHistory).values(history);
}

export async function getProductCheckHistory(productId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(checkHistory)
    .where(eq(checkHistory.productId, productId))
    .orderBy((t) => t.checkedAt)
    .limit(limit);
}

export async function getEmailSettings(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(emailSettings)
    .where(eq(emailSettings.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function upsertEmailSettings(userId: number, settings: Partial<InsertEmailSettings>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getEmailSettings(userId);

  if (existing) {
    await db
      .update(emailSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(emailSettings.userId, userId));
  } else {
    await db.insert(emailSettings).values({
      userId,
      ...settings,
    });
  }
}


export async function addPriceHistory(history: InsertPriceHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(priceHistory).values(history);
}

export async function getPriceHistory(productId: number, limit: number = 30) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(priceHistory)
    .where(eq(priceHistory.productId, productId))
    .orderBy((t) => t.recordedAt)
    .limit(limit);
}
