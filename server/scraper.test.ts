import { describe, it, expect, vi } from "vitest";
import { scrapeProductData, extractProductIdFromUrl } from "./scraper";

describe("Scraper", () => {
  describe("extractProductIdFromUrl", () => {
    it("should extract product ID from valid Coolblue URL", async () => {
      const url = "https://www.coolblue.nl/product/946998/samsung-ww90db7u94gbu3-bespoke-ai-wash.html";
      const id = await extractProductIdFromUrl(url);
      expect(id).toBe("946998");
    });

    it("should return null for invalid URL", async () => {
      const url = "https://www.coolblue.nl/";
      const id = await extractProductIdFromUrl(url);
      expect(id).toBeNull();
    });

    it("should handle URLs without protocol", async () => {
      const url = "coolblue.nl/product/123456/product-name.html";
      const id = await extractProductIdFromUrl(url);
      expect(id).toBe("123456");
    });
  });

  describe("scrapeProductData", () => {
    it("should throw error for invalid URL", async () => {
      const invalidUrl = "https://invalid-domain-that-does-not-exist-12345.com";
      
      await expect(scrapeProductData(invalidUrl)).rejects.toThrow();
    });

    // Note: Real scraping tests would require mocking axios or using a test server
    // This is a placeholder for the test structure
  });
});
