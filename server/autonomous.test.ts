import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  };
}

function createAuthContext(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      supabaseId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "email",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  };
}

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      supabaseId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "email",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  };
}

describe("autonomous agents", () => {
  it("lists all autonomous agents", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const agents = await caller.autonomous.list();
    expect(Array.isArray(agents)).toBe(true);
    expect(agents.length).toBeGreaterThanOrEqual(5);
    expect(agents[0]).toHaveProperty("name");
    expect(agents[0]).toHaveProperty("modelProvider");
    expect(agents[0]).toHaveProperty("avatarEmoji");
  });

  it("gets a single agent by id", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const agents = await caller.autonomous.list();
    if (agents.length > 0) {
      const agent = await caller.autonomous.get({ id: agents[0].id });
      expect(agent).toBeDefined();
      expect(agent!.name).toBe(agents[0].name);
    }
  });

  it("creates an autonomous agent (authenticated)", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const agent = await caller.autonomous.create({
      name: "Test Bot",
      slug: `test-bot-${Date.now()}`,
      modelProvider: "openai",
      modelName: "gpt-4o",
      personality: "Test personality",
      difficulty: "balanced",
      avatarEmoji: "🧪",
      avatarColor: "#FF0000",
      reactionSpeed: 50,
      riskTolerance: 50,
      coinPriority: 50,
    });
    expect(agent).toBeDefined();
  });

  it("rejects unauthenticated agent creation", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.autonomous.create({
        name: "Fail Bot",
        slug: `fail-bot-${Date.now()}`,
        modelProvider: "openai",
        modelName: "gpt-4o",
        difficulty: "balanced",
        avatarEmoji: "❌",
        avatarColor: "#000000",
        reactionSpeed: 50,
        riskTolerance: 50,
        coinPriority: 50,
      })
    ).rejects.toThrow();
  });
});

describe("prediction market", () => {
  it("lists prediction markets", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const markets = await caller.predictions.markets({ status: "open" });
    expect(Array.isArray(markets)).toBe(true);
  });

  it("creates a prediction market (authenticated)", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const market = await caller.predictions.createMarket({
      title: "Test Market",
      marketType: "head_to_head",
    });
    expect(market).toBeDefined();
  });

  it("rejects unauthenticated market creation", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.predictions.createMarket({
        title: "Fail Market",
        marketType: "agent_win",
      })
    ).rejects.toThrow();
  });

  it("gets market details", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const market = await caller.predictions.createMarket({
      title: "Detail Test Market",
      marketType: "score_threshold",
      targetValue: 100000,
    });
    if (market) {
      const detail = await caller.predictions.market({ id: (market as any).id || 1 });
      expect(detail).toHaveProperty("market");
      expect(detail).toHaveProperty("bets");
    }
  });

  it("lists user predictions (authenticated)", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const bets = await caller.predictions.myBets();
    expect(Array.isArray(bets)).toBe(true);
  });
});
