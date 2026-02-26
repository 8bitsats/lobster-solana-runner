import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    supabaseId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test Player ${userId}`,
    loginMethod: "email",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 99,
    supabaseId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "email",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("game.saveSession", () => {
  it("requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.game.saveSession({
        score: 100,
        distance: 200,
        coinsCollected: 10,
        survivalTimeMs: 5000,
        outcome: "fail",
      })
    ).rejects.toThrow();
  });

  it("accepts valid game session data from authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.game.saveSession({
      score: 500,
      distance: 300,
      coinsCollected: 25,
      survivalTimeMs: 15000,
      outcome: "fail",
      walletAddress: "TestWallet1111111111111111111111111111111111",
      solEarned: "0.000125",
    });

    expect(result).toEqual({ success: true });
  });

  it("validates score is non-negative", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.game.saveSession({
        score: -1,
        distance: 200,
        coinsCollected: 10,
        survivalTimeMs: 5000,
        outcome: "fail",
      })
    ).rejects.toThrow();
  });

  it("validates outcome enum", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.game.saveSession({
        score: 100,
        distance: 200,
        coinsCollected: 10,
        survivalTimeMs: 5000,
        outcome: "invalid" as any,
      })
    ).rejects.toThrow();
  });
});

describe("game.getHistory", () => {
  it("requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.game.getHistory()).rejects.toThrow();
  });

  it("returns array for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.game.getHistory();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("game.getLeaderboard", () => {
  it("works without authentication (public)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.game.getLeaderboard({ filter: "all" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("supports filter by human", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.game.getLeaderboard({ filter: "human" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("supports filter by ai", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.game.getLeaderboard({ filter: "ai" });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("game.getStats", () => {
  it("returns global stats (public)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.game.getStats();
    expect(result).toHaveProperty("totalGames");
    expect(result).toHaveProperty("totalPlayers");
    expect(result).toHaveProperty("totalAgents");
    expect(result).toHaveProperty("highScore");
    expect(typeof result.totalGames).toBe("number");
  });
});

describe("game.getRecent", () => {
  it("returns recent sessions (public)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.game.getRecent();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("agents.list", () => {
  it("returns active agents (public)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.agents.list();
    expect(Array.isArray(result)).toBe(true);
    // We seeded 5 agents
    expect(result.length).toBeGreaterThanOrEqual(5);
  });
});

describe("agents.create", () => {
  it("requires admin role", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.agents.create({
        name: "Test Agent",
        walletAddress: "Test6666666666666666666666666666666666666666",
        agentType: "bot",
        difficulty: "easy",
        avatarColor: "#ff0000",
      })
    ).rejects.toThrow();
  });
});

describe("agents.triggerRun", () => {
  it("runs an agent game and returns results (public)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Get first agent
    const agents = await caller.agents.list();
    if (agents.length > 0) {
      const result = await caller.agents.triggerRun({ agentId: agents[0].id });
      expect(result).toHaveProperty("agentName");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("distance");
      expect(result).toHaveProperty("coins");
      expect(typeof result.score).toBe("number");
      expect(result.score).toBeGreaterThan(0);
    }
  });

  it("throws for non-existent agent", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.agents.triggerRun({ agentId: 99999 })).rejects.toThrow();
  });
});

describe("wallet.link", () => {
  it("requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.wallet.link({ walletAddress: "TestWallet1111111111111111111111111111111111" })
    ).rejects.toThrow();
  });

  it("links wallet for authenticated user", async () => {
    const ctx = createAuthContext(2);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.wallet.link({
      walletAddress: "Link7777777777777777777777777777777777777777",
    });
    expect(result).toHaveProperty("walletAddress");
    expect(result.walletAddress).toBe("Link7777777777777777777777777777777777777777");
  });
});

describe("wallet.get", () => {
  it("requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.wallet.get()).rejects.toThrow();
  });
});

describe("rewards.myRewards", () => {
  it("requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.rewards.myRewards()).rejects.toThrow();
  });

  it("returns array for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.rewards.myRewards();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("rewards.claim", () => {
  it("requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.rewards.claim({
        walletAddress: "TestWallet1111111111111111111111111111111111",
        amount: "0.01",
        reason: "game_win",
      })
    ).rejects.toThrow();
  });

  it("creates reward claim for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.rewards.claim({
      walletAddress: "TestWallet1111111111111111111111111111111111",
      amount: "0.01",
      reason: "game_win",
    });
    expect(result).toEqual({ success: true, message: "Reward claim submitted" });
  });
});
