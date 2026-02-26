import { describe, expect, it } from "vitest";

describe("API Key Validation", () => {
  it("XAI_API_KEY should be set and call xAI models endpoint", async () => {
    const key = process.env.XAI_API_KEY;
    expect(key).toBeTruthy();
    // Call xAI models list endpoint to validate key
    const res = await fetch("https://api.x.ai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toBeDefined();
  }, 15000);

  it("OPENAI_API_KEY should be set and call OpenAI models endpoint", async () => {
    const key = process.env.OPENAI_API_KEY;
    expect(key).toBeTruthy();
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toBeDefined();
  }, 15000);

  it("SCRAPYBARA_API_KEY should be set", () => {
    const key = process.env.SCRAPYBARA_API_KEY;
    expect(key).toBeTruthy();
  });
});
