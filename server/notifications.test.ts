import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb, createNotification, getUserNotifications, getUnreadNotifications, markNotificationAsRead, markAllNotificationsAsRead, getNotificationPreferences, upsertNotificationPreferences } from "./db";

describe("Notification System", () => {
  const testUserId = 1;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) {
      console.warn("Database not available for tests");
    }
  });

  it("should create a notification", async () => {
    const db = await getDb();
    if (!db) {
      console.warn("Skipping test: Database not available");
      return;
    }

    const result = await createNotification({
      userId: testUserId,
      type: "tweedekans_available",
      title: "Test Notification",
      message: "This is a test notification",
      isRead: false,
    });

    expect(result).toBeDefined();
  });

  it("should get user notifications", async () => {
    const db = await getDb();
    if (!db) {
      console.warn("Skipping test: Database not available");
      return;
    }

    const notifications = await getUserNotifications(testUserId, 10);
    expect(Array.isArray(notifications)).toBe(true);
  });

  it("should get unread notifications", async () => {
    const db = await getDb();
    if (!db) {
      console.warn("Skipping test: Database not available");
      return;
    }

    const unread = await getUnreadNotifications(testUserId);
    expect(Array.isArray(unread)).toBe(true);
  });

  it("should get notification preferences", async () => {
    const db = await getDb();
    if (!db) {
      console.warn("Skipping test: Database not available");
      return;
    }

    const prefs = await getNotificationPreferences(testUserId);
    // Can be null if not set yet
    expect(prefs === null || typeof prefs === "object").toBe(true);
  });

  it("should upsert notification preferences", async () => {
    const db = await getDb();
    if (!db) {
      console.warn("Skipping test: Database not available");
      return;
    }

    const result = await upsertNotificationPreferences(testUserId, {
      emailNotifications: true,
      pushNotifications: false,
      inAppNotifications: true,
      tweedeKansNotifications: true,
      productUpdatesNotifications: false,
      errorNotifications: true,
    });

    expect(result).toBeDefined();
  });
});
