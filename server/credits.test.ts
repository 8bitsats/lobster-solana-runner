import { describe, expect, it } from "vitest";
import { appRouter, CREDIT_CONSTANTS } from "./routers";
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
      supabaseId: "test-credit-user",
      email: "credit-test@example.com",
      name: "Credit Test User",
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

describe("credit system routes", () => {
  it("credits.balance requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.credits.balance()).rejects.toThrow();
  });

  it("credits.balance returns balance and cooldown info for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.credits.balance();
    expect(result).toHaveProperty("balance");
    expect(result).toHaveProperty("paidGamesToday");
    expect(result).toHaveProperty("dailyLimit");
    expect(result).toHaveProperty("remainingToday");
    expect(result).toHaveProperty("entryFee");
    expect(result).toHaveProperty("prizeAmount");
    expect(result).toHaveProperty("scoreThreshold");
    expect(typeof result.balance).toBe("number");
    expect(result.balance).toBeGreaterThanOrEqual(0);
    expect(result.dailyLimit).toBe(CREDIT_CONSTANTS.DAILY_PAID_GAME_LIMIT);
    expect(result.entryFee).toBe(CREDIT_CONSTANTS.ENTRY_FEE_SOL);
  });

  it("credits.spend requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.credits.spend()).rejects.toThrow();
  });

  it("credits.spend fails with insufficient credits or no db", async () => {
    const caller = appRouter.createCaller(createAuthContext(9999));
    await expect(caller.credits.spend()).rejects.toThrow();
  });

  it("credits.history requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.credits.history()).rejects.toThrow();
  });

  it("credits.history returns an array for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.credits.history();
    expect(Array.isArray(result)).toBe(true);
  });

  it("credits.paidStats requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.credits.paidStats()).rejects.toThrow();
  });

  it("credits.paidStats returns stats for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.credits.paidStats();
    expect(result).toHaveProperty("totalPaidGames");
    expect(result).toHaveProperty("wins");
    expect(result).toHaveProperty("losses");
    expect(result).toHaveProperty("totalSpent");
    expect(result).toHaveProperty("totalWon");
    expect(result).toHaveProperty("entryFeeSol");
    expect(result).toHaveProperty("prizeSol");
    expect(result).toHaveProperty("netPLSol");
    expect(typeof result.totalPaidGames).toBe("number");
  });

  it("credits.deposit requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.credits.deposit({ creditsToBuy: 1, walletAddress: "test-wallet-address-000000000000000" })
    ).rejects.toThrow();
  });

  it("credits.verifyDeposit requires authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.credits.verifyDeposit({
        txSignature: "0".repeat(88),
        creditsToBuy: 1,
        walletAddress: "test-wallet-address-000000000000000",
      })
    ).rejects.toThrow();
  });

  it("CREDIT_CONSTANTS has expected values", () => {
    expect(CREDIT_CONSTANTS.ENTRY_FEE_SOL).toBe(0.01);
    expect(CREDIT_CONSTANTS.PRIZE_SOL).toBe(0.1);
    expect(CREDIT_CONSTANTS.SCORE_THRESHOLD).toBe(500);
    expect(CREDIT_CONSTANTS.DAILY_PAID_GAME_LIMIT).toBe(10);
  });
});
