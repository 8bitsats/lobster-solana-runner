import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function createAuthContext(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      supabaseId: `test-user-${userId}`,
      email: `test${userId}@example.com`,
      name: `Test Player ${userId}`,
      loginMethod: "email",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("arena routes", () => {
  it("waiting query returns an array", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.arena.waiting({ matchType: "human_vs_human" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("active query returns an array", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.arena.active();
    expect(Array.isArray(result)).toBe(true);
  });

  it("recent query returns an array", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.arena.recent();
    expect(Array.isArray(result)).toBe(true);
  });

  it("create match requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.arena.create({ matchType: "human_vs_human" })
    ).rejects.toThrow();
  });

  it("create match succeeds with auth", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    const match = await caller.arena.create({ matchType: "human_vs_human" });
    expect(match).toBeDefined();
    expect(match.matchType).toBe("human_vs_human");
    expect(match.status).toBe("waiting");
    expect(match.player1Name).toBe("Test Player 1");
  });

  it("join match requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.arena.join({ matchId: 99999 })
    ).rejects.toThrow();
  });

  it("cancel match requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.arena.cancel({ matchId: 99999 })
    ).rejects.toThrow();
  });

  it("submit score validates input", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.arena.submitScore({ matchId: 99999, playerSlot: "player1", score: -1, distance: 0, coins: 0 })
    ).rejects.toThrow();
  });
});

describe("skins routes", () => {
  it("list returns an array of skins", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.skins.list();
    expect(Array.isArray(result)).toBe(true);
    // Should have seeded skins
    expect(result.length).toBeGreaterThan(0);
  });

  it("mySkins requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.skins.mySkins()).rejects.toThrow();
  });

  it("equip requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.skins.equip({ skinId: 1 })).rejects.toThrow();
  });

  it("purchase requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.skins.purchase({ skinId: 1 })).rejects.toThrow();
  });
});

describe("tokens routes", () => {
  it("trending returns tokens data", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.tokens.trending({ sortBy: "rank", interval: "24h", limit: 5 });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("tokens");
    expect(Array.isArray(result.tokens)).toBe(true);
  }, 15000);

  it("search validates input", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.tokens.search({ keyword: "SOL" });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("tokens");
  }, 15000);
});
