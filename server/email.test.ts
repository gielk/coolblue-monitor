import { describe, it, expect, beforeAll } from "vitest";
import { testEmailConnection } from "./email";

describe("Email Service", () => {
  it("should validate Gmail connection with correct credentials", async () => {
    const gmailEmail = process.env.GMAIL_EMAIL;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailEmail || !gmailAppPassword) {
      console.warn("Gmail credentials not set, skipping test");
      expect(true).toBe(true);
      return;
    }

    const result = await testEmailConnection(gmailEmail, gmailAppPassword);
    
    console.log("[Email Test] Connection result:", result);
    
    expect(result.success).toBe(true);
    expect(result.message).toContain("successful");
  });

  it("should fail with invalid credentials", async () => {
    const result = await testEmailConnection(
      "invalid@gmail.com",
      "invalidpassword123456"
    );
    
    console.log("[Email Test] Invalid credentials result:", result);
    
    expect(result.success).toBe(false);
    expect(result.message).toBeDefined();
  });
});
