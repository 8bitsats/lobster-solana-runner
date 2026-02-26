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

describe("treasury routes", () => {
  it("treasury.balance returns address and balance", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.treasury.balance();
    expect(result).toHaveProperty("address");
    expect(result).toHaveProperty("sol");
    expect(result).toHaveProperty("lamports");
    expect(typeof result.address).toBe("string");
    expect(result.address.length).toBeGreaterThan(20);
    expect(typeof result.sol).toBe("number");
    expect(result.sol).toBeGreaterThanOrEqual(0);
  });

  it("treasury.stats returns balance and payout stats", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.treasury.stats();
    expect(result).toHaveProperty("address");
    expect(result).toHaveProperty("balance");
    expect(result).toHaveProperty("payouts");
    expect(result.payouts).toHaveProperty("totalPayouts");
    expect(result.payouts).toHaveProperty("totalSolPaid");
    expect(result.payouts).toHaveProperty("pendingCount");
  });

  it("treasury.walletBalance returns balance for a valid address", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    // Use the treasury address itself as a test
    const stats = await caller.treasury.stats();
    const result = await caller.treasury.walletBalance({ address: stats.address });
    expect(result).toHaveProperty("sol");
    expect(result).toHaveProperty("lamports");
    expect(typeof result.sol).toBe("number");
  });

  it("treasury.allPayouts returns an array", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.treasury.allPayouts({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("treasury.myPayouts requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.treasury.myPayouts({ limit: 10 })).rejects.toThrow();
  });

  it("treasury.myPayouts returns array for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.treasury.myPayouts({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("treasury.claimPrize requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.treasury.claimPrize({ gameSessionId: 1, walletAddress: "test" })
    ).rejects.toThrow();
  });

  it("treasury.recentTransactions returns an array", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.treasury.recentTransactions({ limit: 5 });
    expect(Array.isArray(result)).toBe(true);
  });
});
