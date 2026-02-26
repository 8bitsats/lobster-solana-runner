import { describe, expect, it } from "vitest";

describe("Birdeye API Key Validation", () => {
  it("should successfully call Birdeye trending tokens endpoint", async () => {
    const apiKey = process.env.BIRDEYE_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch(
      "https://public-api.birdeye.so/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=5",
      {
        headers: {
          accept: "application/json",
          "x-chain": "solana",
          "X-API-KEY": apiKey!,
        },
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.tokens).toBeDefined();
    expect(Array.isArray(data.data.tokens)).toBe(true);
  }, 15000);
});
