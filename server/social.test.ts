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
      name: `TestUser${userId}`,
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

describe("characters", () => {
  it("lists all characters", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const characters = await caller.characters.list();
    expect(Array.isArray(characters)).toBe(true);
  });

  it("gets a character by slug", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const characters = await caller.characters.list();
    if (characters.length > 0) {
      const char = await caller.characters.getBySlug({ slug: characters[0].slug });
      expect(char).toBeDefined();
      expect(char?.name).toBe(characters[0].name);
    }
  });
});

describe("profile", () => {
  it("requires auth to get own profile", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.profile.me()).rejects.toThrow();
  });

  it("requires auth to update profile", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.profile.update({ displayName: "Test" })
    ).rejects.toThrow();
  });

  it("gets profile leaderboard publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const profiles = await caller.profile.leaderboard();
    expect(Array.isArray(profiles)).toBe(true);
  });
});

describe("chat", () => {
  it("gets messages for a room", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const messages = await caller.chat.messages({ roomId: "game-spectate", limit: 10 });
    expect(Array.isArray(messages)).toBe(true);
  });

  it("requires auth to send messages", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.chat.send({ roomId: "test-room", message: "Hello", messageType: "chat" })
    ).rejects.toThrow();
  });
});

describe("replays", () => {
  it("gets a replay by share code (returns null for non-existent)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const replay = await caller.replays.get({ shareCode: "nonexistent123" });
    expect(replay === null || replay === undefined).toBe(true);
  });

  it("requires auth to share a replay", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.replays.share({
        gameSessionId: 1,
        score: 100,
        distance: 50,
        coinsCollected: 10,
      })
    ).rejects.toThrow();
  });

  it("generates X share URL", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.replays.xShareUrl({
      score: 5000,
      distance: 200,
      coins: 50,
      shareCode: "test123",
    });
    expect(result.url).toContain("twitter.com/intent/tweet");
  });
});
