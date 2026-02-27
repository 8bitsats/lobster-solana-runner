import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  InsertUser, users, wallets, gameSessions, leaderboard, aiAgents, rewards,
  matches, autonomousAgents, agentRuns, predictions, predictionMarkets, payouts,
  lobsterSkins, playerSkins, gameCharacters, playerProfiles, chatMessages, sharedReplays,
  credits, creditTransactions,
} from "../drizzle/schema";
import type {
  InsertWallet, InsertGameSession, InsertLeaderboardEntry, InsertAiAgent, InsertReward,
  InsertMatch, InsertAutonomousAgent, InsertAgentRun, InsertPrediction, InsertPredictionMarket,
  InsertPayout, InsertPlayerSkin, InsertPlayerProfile, InsertChatMessage, InsertSharedReplay,
  InsertCreditTransaction,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (process.env.VITEST && process.env.TEST_USE_DATABASE !== "1") {
    return null;
  }
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── USER HELPERS ───
export async function upsertUser(user: Partial<InsertUser> & { supabaseId: string }): Promise<void> {
  if (!user.supabaseId) throw new Error("User supabaseId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const existing = await db.select().from(users).where(eq(users.supabaseId, user.supabaseId)).limit(1);

    if (existing.length > 0) {
      const updateSet: Record<string, unknown> = {};
      if (user.name !== undefined) updateSet.name = user.name ?? null;
      if (user.email !== undefined) updateSet.email = user.email ?? null;
      if (user.loginMethod !== undefined) updateSet.loginMethod = user.loginMethod ?? null;
      if (user.lastSignedIn !== undefined) updateSet.lastSignedIn = user.lastSignedIn;
      if (user.role !== undefined) updateSet.role = user.role;
      updateSet.updatedAt = new Date();
      if (Object.keys(updateSet).length > 0) {
        await db.update(users).set(updateSet).where(eq(users.supabaseId, user.supabaseId));
      }
    } else {
      await db.insert(users).values({
        supabaseId: user.supabaseId,
        name: user.name ?? null,
        email: user.email ?? null,
        loginMethod: user.loginMethod ?? null,
        role: user.role ?? "user",
        lastSignedIn: user.lastSignedIn ?? new Date(),
      });
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserBySupabaseId(supabaseId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.supabaseId, supabaseId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── WALLET HELPERS ───
export async function linkWallet(userId: number, walletAddress: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(wallets).where(eq(wallets.walletAddress, walletAddress)).limit(1);
  if (existing.length > 0 && existing[0].userId !== userId) {
    throw new Error("Wallet already linked to another account");
  }
  if (existing.length > 0) return existing[0];

  const values: InsertWallet = { userId, walletAddress, isPrimary: true };
  await db.insert(wallets).values(values);
  const result = await db.select().from(wallets).where(eq(wallets.walletAddress, walletAddress)).limit(1);
  return result[0];
}

export async function getWalletByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(wallets).where(and(eq(wallets.userId, userId), eq(wallets.isPrimary, true))).limit(1);
  return result.length > 0 ? result[0] : null;
}

// ─── GAME SESSION HELPERS ───
export async function saveGameSession(session: InsertGameSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [inserted] = await db.insert(gameSessions).values(session).returning({ id: gameSessions.id });

  if (session.userId) {
    await updateLeaderboardForUser(session.userId, session.playerType ?? "human");
    await updateProfileStats(
      session.userId,
      session.score ?? 0,
      session.distance ?? 0,
      session.coinsCollected ?? 0,
      session.outcome ?? "fail",
    );
  } else if (session.aiAgentId) {
    await updateLeaderboardForAgent(session.aiAgentId);
  }

  return inserted;
}

export async function getUserGameHistory(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gameSessions).where(eq(gameSessions.userId, userId)).orderBy(desc(gameSessions.createdAt)).limit(limit);
}

export async function getRecentSessions(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gameSessions).orderBy(desc(gameSessions.createdAt)).limit(limit);
}

// ─── LEADERBOARD HELPERS ───
async function updateLeaderboardForUser(userId: number, playerType: "human" | "ai") {
  const db = await getDb();
  if (!db) return;

  const stats = await db.select({
    bestScore: sql<number>`MAX(${gameSessions.score})`,
    bestDistance: sql<number>`MAX(${gameSessions.distance})`,
    totalGames: sql<number>`COUNT(*)`,
    totalCoins: sql<number>`SUM(${gameSessions.coinsCollected})`,
    avgScore: sql<number>`AVG(${gameSessions.score})`,
  }).from(gameSessions).where(eq(gameSessions.userId, userId));

  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user[0] || !stats[0]) return;

  const wallet = await getWalletByUserId(userId);

  const existing = await db.select().from(leaderboard).where(and(eq(leaderboard.userId, userId), eq(leaderboard.playerType, "human"))).limit(1);

  const entry = {
    playerType: "human" as const,
    userId,
    playerName: user[0].name || `Player ${userId}`,
    walletAddress: wallet?.walletAddress || null,
    bestScore: stats[0].bestScore || 0,
    bestDistance: stats[0].bestDistance || 0,
    totalGames: stats[0].totalGames || 0,
    totalCoins: stats[0].totalCoins || 0,
    avgScore: Math.floor(stats[0].avgScore || 0),
  };

  if (existing.length > 0) {
    await db.update(leaderboard).set(entry).where(eq(leaderboard.id, existing[0].id));
  } else {
    await db.insert(leaderboard).values(entry);
  }
}

async function updateLeaderboardForAgent(agentId: number) {
  const db = await getDb();
  if (!db) return;

  const stats = await db.select({
    bestScore: sql<number>`MAX(${gameSessions.score})`,
    bestDistance: sql<number>`MAX(${gameSessions.distance})`,
    totalGames: sql<number>`COUNT(*)`,
    totalScore: sql<number>`SUM(${gameSessions.score})`,
    totalCoins: sql<number>`SUM(${gameSessions.coinsCollected})`,
    avgScore: sql<number>`AVG(${gameSessions.score})`,
  }).from(gameSessions).where(eq(gameSessions.aiAgentId, agentId));

  const agent = await db.select().from(aiAgents).where(eq(aiAgents.id, agentId)).limit(1);
  if (!agent[0] || !stats[0]) return;

  const existing = await db.select().from(leaderboard).where(and(eq(leaderboard.aiAgentId, agentId), eq(leaderboard.playerType, "ai"))).limit(1);

  const entry = {
    playerType: "ai" as const,
    aiAgentId: agentId,
    playerName: agent[0].name,
    walletAddress: agent[0].walletAddress,
    bestScore: stats[0].bestScore || 0,
    bestDistance: stats[0].bestDistance || 0,
    totalGames: stats[0].totalGames || 0,
    totalCoins: stats[0].totalCoins || 0,
    avgScore: Math.floor(stats[0].avgScore || 0),
  };

  if (existing.length > 0) {
    await db.update(leaderboard).set(entry).where(eq(leaderboard.id, existing[0].id));
  } else {
    await db.insert(leaderboard).values(entry);
  }

  await db.update(aiAgents).set({
    totalGames: stats[0].totalGames || 0,
    totalScore: stats[0].totalScore || 0,
    bestScore: stats[0].bestScore || 0,
  }).where(eq(aiAgents.id, agentId));
}

export async function getLeaderboardEntries(filter: "all" | "human" | "ai" = "all", limit = 50) {
  const db = await getDb();
  if (!db) return [];

  if (filter === "all") {
    return db.select().from(leaderboard).orderBy(desc(leaderboard.bestScore)).limit(limit);
  }
  return db.select().from(leaderboard).where(eq(leaderboard.playerType, filter)).orderBy(desc(leaderboard.bestScore)).limit(limit);
}

// ─── AI AGENT HELPERS ───
export async function createAiAgent(agent: InsertAiAgent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(aiAgents).values(agent);
  const result = await db.select().from(aiAgents).where(eq(aiAgents.walletAddress, agent.walletAddress)).limit(1);
  return result[0];
}

export async function getActiveAgents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiAgents).where(eq(aiAgents.isActive, true)).orderBy(desc(aiAgents.bestScore));
}

export async function getAgentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(aiAgents).where(eq(aiAgents.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// ─── REWARD HELPERS ───
export async function createReward(reward: InsertReward) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(rewards).values(reward);
}

export async function getUserRewards(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rewards).where(eq(rewards.userId, userId)).orderBy(desc(rewards.createdAt));
}

export async function getPendingRewards(walletAddress: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rewards).where(and(eq(rewards.walletAddress, walletAddress), eq(rewards.status, "pending")));
}

// ─── STATS HELPERS ───
export async function getGlobalStats() {
  const db = await getDb();
  if (!db) return { totalGames: 0, totalPlayers: 0, totalAgents: 0, highScore: 0 };

  const gameStats = await db.select({
    totalGames: sql<number>`COUNT(*)`,
    highScore: sql<number>`MAX(${gameSessions.score})`,
  }).from(gameSessions);

  const playerCount = await db.select({
    count: sql<number>`COUNT(DISTINCT ${gameSessions.userId})`,
  }).from(gameSessions).where(eq(gameSessions.playerType, "human"));

  const agentCount = await db.select({
    count: sql<number>`COUNT(*)`,
  }).from(aiAgents).where(eq(aiAgents.isActive, true));

  return {
    totalGames: gameStats[0]?.totalGames || 0,
    totalPlayers: playerCount[0]?.count || 0,
    totalAgents: agentCount[0]?.count || 0,
    highScore: gameStats[0]?.highScore || 0,
  };
}

// ─── SKIN HELPERS ───
export async function getAllSkins() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lobsterSkins).orderBy(lobsterSkins.price);
}

export async function getSkinById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(lobsterSkins).where(eq(lobsterSkins.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getUserSkins(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    playerSkin: playerSkins,
    skin: lobsterSkins,
  }).from(playerSkins)
    .innerJoin(lobsterSkins, eq(playerSkins.skinId, lobsterSkins.id))
    .where(eq(playerSkins.userId, userId));
}

export async function getEquippedSkin(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({
    playerSkin: playerSkins,
    skin: lobsterSkins,
  }).from(playerSkins)
    .innerJoin(lobsterSkins, eq(playerSkins.skinId, lobsterSkins.id))
    .where(and(eq(playerSkins.userId, userId), eq(playerSkins.isEquipped, true)))
    .limit(1);
  return result.length > 0 ? result[0].skin : null;
}

export async function purchaseSkin(userId: number, skinId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(playerSkins)
    .where(and(eq(playerSkins.userId, userId), eq(playerSkins.skinId, skinId)))
    .limit(1);
  if (existing.length > 0) throw new Error("Skin already owned");

  const skin = await getSkinById(skinId);
  if (!skin) throw new Error("Skin not found");

  const lb = await db.select().from(leaderboard)
    .where(and(eq(leaderboard.userId, userId), eq(leaderboard.playerType, "human")))
    .limit(1);
  const totalCoins = lb[0]?.totalCoins || 0;

  const ownedSkins = await getUserSkins(userId);
  let totalSpent = 0;
  for (const os of ownedSkins) {
    totalSpent += os.skin.price;
  }
  const availableCoins = totalCoins - totalSpent;

  if (availableCoins < skin.price) throw new Error("Not enough coins");

  await db.insert(playerSkins).values({ userId, skinId });
  return skin;
}

export async function equipSkin(userId: number, skinId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const owned = await db.select().from(playerSkins)
    .where(and(eq(playerSkins.userId, userId), eq(playerSkins.skinId, skinId)))
    .limit(1);
  if (owned.length === 0) throw new Error("Skin not owned");

  await db.update(playerSkins).set({ isEquipped: false }).where(eq(playerSkins.userId, userId));
  await db.update(playerSkins).set({ isEquipped: true })
    .where(and(eq(playerSkins.userId, userId), eq(playerSkins.skinId, skinId)));
}

export async function grantDefaultSkin(userId: number) {
  const db = await getDb();
  if (!db) return;

  const existing = await db.select().from(playerSkins).where(eq(playerSkins.userId, userId)).limit(1);
  if (existing.length > 0) return;

  const defaultSkin = await db.select().from(lobsterSkins).where(eq(lobsterSkins.isDefault, true)).limit(1);
  if (defaultSkin.length === 0) return;

  await db.insert(playerSkins).values({ userId, skinId: defaultSkin[0].id, isEquipped: true });
}

// ─── ARENA / MATCH HELPERS ───

export async function createMatch(match: InsertMatch) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(matches).values(match).returning({ id: matches.id });
  const id = result[0].id;
  const created = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
  return created[0];
}

export async function getWaitingMatches(matchType: "human_vs_human" | "agent_vs_agent" | "human_vs_agent") {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matches)
    .where(and(eq(matches.matchType, matchType), eq(matches.status, "waiting")))
    .orderBy(desc(matches.createdAt))
    .limit(20);
}

export async function getMatchById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function joinMatch(matchId: number, player: {
  userId?: number;
  agentId?: number;
  name: string;
  walletAddress?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const match = await getMatchById(matchId);
  if (!match) throw new Error("Match not found");
  if (match.status !== "waiting") throw new Error("Match is no longer available");

  await db.update(matches).set({
    player2UserId: player.userId ?? null,
    player2AgentId: player.agentId ?? null,
    player2Name: player.name,
    player2WalletAddress: player.walletAddress ?? null,
    status: "ready",
  }).where(eq(matches.id, matchId));

  return getMatchById(matchId);
}

export async function readyUp(matchId: number, playerSlot: "player1" | "player2") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (playerSlot === "player1") {
    await db.update(matches).set({ player1Ready: true }).where(eq(matches.id, matchId));
  } else {
    await db.update(matches).set({ player2Ready: true }).where(eq(matches.id, matchId));
  }

  const match = await getMatchById(matchId);
  if (match && match.player1Ready && match.player2Ready) {
    await db.update(matches).set({ status: "playing", startedAt: new Date() }).where(eq(matches.id, matchId));
  }
  return getMatchById(matchId);
}

export async function submitMatchScore(matchId: number, playerSlot: "player1" | "player2", score: number, distance: number, coins: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (playerSlot === "player1") {
    await db.update(matches).set({ player1Score: score, player1Distance: distance, player1Coins: coins }).where(eq(matches.id, matchId));
  } else {
    await db.update(matches).set({ player2Score: score, player2Distance: distance, player2Coins: coins }).where(eq(matches.id, matchId));
  }

  const match = await getMatchById(matchId);
  if (!match) return null;

  const p1Done = playerSlot === "player1" ? score > 0 : match.player1Score > 0;
  const p2Done = playerSlot === "player2" ? score > 0 : match.player2Score > 0;

  if (p1Done && p2Done) {
    const p1Score = playerSlot === "player1" ? score : match.player1Score;
    const p2Score = playerSlot === "player2" ? score : match.player2Score;
    const winnerType = p1Score > p2Score ? "player1" : p2Score > p1Score ? "player2" : "draw";

    await db.update(matches).set({
      status: "finished",
      winnerType,
      finishedAt: new Date(),
    }).where(eq(matches.id, matchId));
  }

  return getMatchById(matchId);
}

export async function getRecentMatches(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matches)
    .where(eq(matches.status, "finished"))
    .orderBy(desc(matches.finishedAt))
    .limit(limit);
}

export async function getActiveMatches() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matches)
    .where(sql`${matches.status} IN ('waiting', 'ready', 'playing')`)
    .orderBy(desc(matches.createdAt))
    .limit(50);
}

export async function cancelMatch(matchId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(matches).set({ status: "cancelled" }).where(eq(matches.id, matchId));
}

// ─── AUTONOMOUS AGENT HELPERS ───
export async function createAutonomousAgent(agent: InsertAutonomousAgent) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(autonomousAgents).values(agent).returning({ id: autonomousAgents.id });
  const rows = await db.select().from(autonomousAgents).where(eq(autonomousAgents.id, result[0].id)).limit(1);
  return rows[0] || null;
}

export async function getAutonomousAgents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(autonomousAgents).where(eq(autonomousAgents.isActive, true)).orderBy(desc(autonomousAgents.bestScore));
}

export async function getAutonomousAgentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(autonomousAgents).where(eq(autonomousAgents.id, id)).limit(1);
  return result[0] || null;
}

export async function updateAgentStats(agentId: number, score: number, distance: number) {
  const db = await getDb();
  if (!db) return;
  const agent = await getAutonomousAgentById(agentId);
  if (!agent) return;
  await db.update(autonomousAgents).set({
    totalGames: agent.totalGames + 1,
    totalScore: agent.totalScore + score,
    bestScore: Math.max(agent.bestScore, score),
  }).where(eq(autonomousAgents.id, agentId));
}

// ─── AGENT RUN HELPERS ───
export async function createAgentRun(run: InsertAgentRun) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(agentRuns).values(run).returning({ id: agentRuns.id });
  const rows = await db.select().from(agentRuns).where(eq(agentRuns.id, result[0].id)).limit(1);
  return rows[0] || null;
}

export async function updateAgentRun(id: number, data: Partial<InsertAgentRun>) {
  const db = await getDb();
  if (!db) return;
  await db.update(agentRuns).set(data).where(eq(agentRuns.id, id));
}

export async function getAgentRuns(agentId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentRuns).where(eq(agentRuns.agentId, agentId)).orderBy(desc(agentRuns.createdAt)).limit(limit);
}

export async function getLatestAgentRun(agentId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(agentRuns).where(and(eq(agentRuns.agentId, agentId), eq(agentRuns.status, "completed"))).orderBy(desc(agentRuns.score)).limit(1);
  return result[0] || null;
}

// ─── PREDICTION MARKET HELPERS ───
export async function createPredictionMarket(market: InsertPredictionMarket) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(predictionMarkets).values(market).returning({ id: predictionMarkets.id });
  const rows = await db.select().from(predictionMarkets).where(eq(predictionMarkets.id, result[0].id)).limit(1);
  return rows[0] || null;
}

export async function getPredictionMarkets(status?: string) {
  const db = await getDb();
  if (!db) return [];
  if (status) {
    return db.select().from(predictionMarkets)
      .where(eq(predictionMarkets.status, status as any))
      .orderBy(desc(predictionMarkets.createdAt)).limit(50);
  }
  return db.select().from(predictionMarkets).orderBy(desc(predictionMarkets.createdAt)).limit(50);
}

export async function getPredictionMarketById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(predictionMarkets).where(eq(predictionMarkets.id, id)).limit(1);
  return result[0] || null;
}

export async function updatePredictionMarket(id: number, data: Partial<InsertPredictionMarket>) {
  const db = await getDb();
  if (!db) return;
  await db.update(predictionMarkets).set(data).where(eq(predictionMarkets.id, id));
}

export async function createPrediction(prediction: InsertPrediction) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(predictions).values(prediction).returning({ id: predictions.id });
  const rows = await db.select().from(predictions).where(eq(predictions.id, result[0].id)).limit(1);
  return rows[0] || null;
}

export async function getUserPredictions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(predictions).where(eq(predictions.userId, userId)).orderBy(desc(predictions.createdAt)).limit(50);
}

export async function getPredictionsForMarket(marketId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(predictions).where(eq(predictions.matchId, marketId)).orderBy(desc(predictions.createdAt));
}

export async function resolvePredictions(marketId: number, outcome: "correct" | "incorrect") {
  const db = await getDb();
  if (!db) return;
  const status = outcome === "correct" ? "won" : "lost";
  await db.update(predictions).set({ status: status as any, result: outcome, resolvedAt: new Date() }).where(eq(predictions.matchId, marketId));
}

// ─── CHARACTER HELPERS ───
export async function getAllCharacters() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gameCharacters).orderBy(gameCharacters.id);
}

export async function getCharacterById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(gameCharacters).where(eq(gameCharacters.id, id)).limit(1);
  return result[0] || null;
}

export async function getCharacterBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(gameCharacters).where(eq(gameCharacters.slug, slug)).limit(1);
  return result[0] || null;
}

// ─── PLAYER PROFILE HELPERS ───
export async function getOrCreateProfile(userId: number, name?: string | null) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId)).limit(1);
  if (existing.length > 0) return existing[0];

  await db.insert(playerProfiles).values({
    userId,
    displayName: name || `Player ${userId}`,
    isPublic: true,
  });
  const result = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId)).limit(1);
  return result[0] || null;
}

export async function updateProfile(userId: number, data: Partial<InsertPlayerProfile>) {
  const db = await getDb();
  if (!db) return null;
  await db.update(playerProfiles).set(data).where(eq(playerProfiles.userId, userId));
  const result = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId)).limit(1);
  return result[0] || null;
}

export async function getProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId)).limit(1);
  return result[0] || null;
}

export async function getPublicProfiles(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(playerProfiles)
    .where(eq(playerProfiles.isPublic, true))
    .orderBy(desc(playerProfiles.highScore))
    .limit(limit);
}

export async function updateProfileStats(
  userId: number,
  score: number,
  distance: number,
  coins: number,
  outcome: "win" | "fail" | "abandoned" = "fail",
) {
  const db = await getDb();
  if (!db) return;
  const profile = await getProfileByUserId(userId);
  if (!profile) {
    await getOrCreateProfile(userId);
    return updateProfileStats(userId, score, distance, coins, outcome);
  }
  await db.update(playerProfiles).set({
    totalGames: profile.totalGames + 1,
    highScore: Math.max(profile.highScore, score),
    totalCoins: profile.totalCoins + coins,
    totalDistance: profile.totalDistance + distance,
    totalWins: outcome === "win" ? profile.totalWins + 1 : profile.totalWins,
  }).where(eq(playerProfiles.userId, userId));
}

// ─── CHAT HELPERS ───
export async function sendChatMessage(msg: InsertChatMessage) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(chatMessages).values(msg).returning({ id: chatMessages.id });
  const rows = await db.select().from(chatMessages).where(eq(chatMessages.id, result[0].id)).limit(1);
  return rows[0] || null;
}

export async function getChatMessages(roomId: string, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMessages)
    .where(eq(chatMessages.roomId, roomId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
}

// ─── SHARED REPLAY HELPERS ───
export async function createSharedReplay(replay: InsertSharedReplay) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(sharedReplays).values(replay).returning({ id: sharedReplays.id });
  const rows = await db.select().from(sharedReplays).where(eq(sharedReplays.id, result[0].id)).limit(1);
  return rows[0] || null;
}

export async function getReplayByShareCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(sharedReplays).where(eq(sharedReplays.shareCode, code)).limit(1);
  if (result.length === 0) return null;
  await db.update(sharedReplays).set({ viewCount: result[0].viewCount + 1 }).where(eq(sharedReplays.id, result[0].id));
  return result[0];
}

export async function getUserReplays(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sharedReplays)
    .where(eq(sharedReplays.userId, userId))
    .orderBy(desc(sharedReplays.createdAt))
    .limit(limit);
}

// ─── PAYOUT HELPERS ───

export async function createPayout(data: InsertPayout) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(payouts).values(data).returning({ id: payouts.id });
  return result[0].id;
}

export async function updatePayoutStatus(
  payoutId: number,
  status: "pending" | "processing" | "confirmed" | "failed",
  txSignature?: string,
  errorMessage?: string
) {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, unknown> = { status };
  if (txSignature) updateData.txSignature = txSignature;
  if (errorMessage) updateData.errorMessage = errorMessage;
  if (status === "confirmed") updateData.confirmedAt = new Date();
  await db.update(payouts).set(updateData).where(eq(payouts.id, payoutId));
}

export async function getPayoutsByUser(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payouts).where(eq(payouts.userId, userId)).orderBy(desc(payouts.claimedAt)).limit(limit);
}

export async function getRecentPayouts(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payouts).orderBy(desc(payouts.claimedAt)).limit(limit);
}

export async function getPendingPayoutForSession(gameSessionId: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(payouts)
    .where(and(
      eq(payouts.gameSessionId, gameSessionId),
      inArray(payouts.status, ["pending", "processing", "confirmed"]),
    ))
    .limit(1);
  return results.length > 0 ? results[0] : null;
}

export async function getPayoutStats() {
  const db = await getDb();
  if (!db) return { totalPayouts: 0, totalSolPaid: 0, pendingCount: 0 };
  const [stats] = await db.select({
    totalPayouts: sql<number>`COUNT(*)`,
    totalSolPaid: sql<string>`COALESCE(SUM(CAST(amount_sol AS DECIMAL(20,9))), 0)`,
    pendingCount: sql<number>`SUM(CASE WHEN payout_status = 'pending' THEN 1 ELSE 0 END)`,
  }).from(payouts);
  return {
    totalPayouts: Number(stats?.totalPayouts ?? 0),
    totalSolPaid: Number(stats?.totalSolPaid ?? 0),
    pendingCount: Number(stats?.pendingCount ?? 0),
  };
}

// ─── CREDIT HELPERS ───

export async function getCredits(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(credits).where(eq(credits.userId, userId)).limit(1);
  return result.length > 0 ? result[0].balance : 0;
}

export async function addCredits(userId: number, amount: number, txSignature?: string, note?: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(credits).where(eq(credits.userId, userId)).limit(1);
  let newBalance: number;

  if (existing.length > 0) {
    newBalance = existing[0].balance + amount;
    await db.update(credits).set({ balance: newBalance, updatedAt: new Date() }).where(eq(credits.userId, userId));
  } else {
    newBalance = amount;
    await db.insert(credits).values({ userId, balance: amount });
  }

  await db.insert(creditTransactions).values({
    userId,
    type: "deposit",
    amount,
    txSignature: txSignature ?? null,
    note: note ?? null,
  });

  return newBalance;
}

export async function spendCredit(userId: number, gameSessionId?: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(credits).where(eq(credits.userId, userId)).limit(1);
  if (existing.length === 0 || existing[0].balance < 1) {
    throw new Error("Insufficient credits");
  }

  const newBalance = existing[0].balance - 1;
  await db.update(credits).set({ balance: newBalance, updatedAt: new Date() }).where(eq(credits.userId, userId));

  await db.insert(creditTransactions).values({
    userId,
    type: "spend",
    amount: -1,
    gameSessionId: gameSessionId ?? null,
    note: "Paid game entry",
  });

  return newBalance;
}

export async function addPrizeCredits(userId: number, amount: number, gameSessionId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(credits).where(eq(credits.userId, userId)).limit(1);
  let newBalance: number;

  if (existing.length > 0) {
    newBalance = existing[0].balance + amount;
    await db.update(credits).set({ balance: newBalance, updatedAt: new Date() }).where(eq(credits.userId, userId));
  } else {
    newBalance = amount;
    await db.insert(credits).values({ userId, balance: amount });
  }

  await db.insert(creditTransactions).values({
    userId,
    type: "prize",
    amount,
    gameSessionId,
    note: `Prize: +${amount} credits`,
  });

  return newBalance;
}

export async function getCreditHistory(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit);
}

export async function getCreditTransactionBySignature(txSignature: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(creditTransactions)
    .where(eq(creditTransactions.txSignature, txSignature))
    .limit(1);
  return result[0] || null;
}

export async function getPaidGamesInWindow(userId: number, windowMs = 24 * 60 * 60 * 1000): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const since = new Date(Date.now() - windowMs);
  const result = await db.select({
    count: sql<number>`COUNT(*)`,
  }).from(creditTransactions)
    .where(and(
      eq(creditTransactions.userId, userId),
      eq(creditTransactions.type, "spend"),
      sql`${creditTransactions.createdAt} >= ${since}`,
    ));
  return Number(result[0]?.count ?? 0);
}

export async function getPaidGameStats(userId: number) {
  const db = await getDb();
  if (!db) {
    return {
      totalPaidGames: 0,
      wins: 0,
      losses: 0,
      totalSpent: 0,
      totalWon: 0,
      totalPayoutSol: 0,
      netPL: 0,
    };
  }

  const paidGamesResult = await db.select({
    count: sql<number>`COUNT(*)`,
  }).from(gameSessions)
    .where(and(eq(gameSessions.userId, userId), eq(gameSessions.isPaidMode, true)));

  const payoutResult = await db.select({
    wins: sql<number>`COUNT(*)`,
    totalSol: sql<string>`COALESCE(SUM(CAST(${payouts.amountSol} AS DECIMAL(20,9))), 0)`,
  }).from(payouts)
    .innerJoin(gameSessions, eq(gameSessions.id, payouts.gameSessionId))
    .where(and(
      eq(payouts.userId, userId),
      eq(payouts.status, "confirmed"),
      eq(gameSessions.isPaidMode, true),
    ));

  const totalPaidGames = Number(paidGamesResult[0]?.count ?? 0);
  const wins = Number(payoutResult[0]?.wins ?? 0);
  const totalPayoutSol = Number(payoutResult[0]?.totalSol ?? 0);
  const totalSpent = totalPaidGames;
  const totalWon = wins;

  return {
    totalPaidGames,
    wins,
    losses: Math.max(totalPaidGames - wins, 0),
    totalSpent,
    totalWon,
    totalPayoutSol,
    netPL: totalPayoutSol - totalSpent,
  };
}
