import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  linkWallet, getWalletByUserId,
  saveGameSession, getUserGameHistory, getRecentSessions,
  getLeaderboardEntries,
  createAiAgent, getActiveAgents,
  getUserRewards, getPendingRewards, createReward,
  getGlobalStats,
  getAllSkins, getSkinById, getUserSkins, getEquippedSkin,
  purchaseSkin, equipSkin, grantDefaultSkin,
  createMatch, getWaitingMatches, getMatchById, joinMatch,
  readyUp, submitMatchScore, getRecentMatches, getActiveMatches, cancelMatch,
  getAgentById,
  createAutonomousAgent, getAutonomousAgents, getAutonomousAgentById,
  updateAgentStats, createAgentRun, updateAgentRun, getAgentRuns, getLatestAgentRun,
  createPredictionMarket, getPredictionMarkets, getPredictionMarketById,
  updatePredictionMarket, createPrediction, getUserPredictions,
  getPredictionsForMarket, resolvePredictions,
  getAllCharacters, getCharacterById, getCharacterBySlug,
  getOrCreateProfile, updateProfile, getProfileByUserId, getPublicProfiles, updateProfileStats,
  sendChatMessage, getChatMessages,
  createSharedReplay, getReplayByShareCode, getUserReplays,
} from "./db";
import { runAutonomousAgent } from "./agentEngine";
import { ENV } from "./_core/env";
import {
  getTreasuryBalance, getWalletBalance, getWalletAssets,
  sendSolToWinner, calculatePrize, getTreasuryAddress,
  getTreasuryTransactions, verifyTransaction, verifyTransferToTreasury,
} from "./solana";
import {
  createPayout, updatePayoutStatus, getPayoutsByUser,
  getRecentPayouts, getPendingPayoutForSession, getPayoutStats,
  getCredits, addCredits, spendCredit, getCreditHistory, getCreditTransactionBySignature,
  getPaidGamesInWindow, getPaidGameStats,
} from "./db";

// ─── Tunable Constants ───
export const CREDIT_CONSTANTS = {
  ENTRY_FEE_SOL: 0.01,       // SOL per credit
  PRIZE_SOL: 0.1,            // Max SOL prize per paid game
  SCORE_THRESHOLD: 500,      // Min score to win prize
  DAILY_PAID_GAME_LIMIT: 10, // Max paid games per 24h rolling window
};

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
  }),

  // ─── WALLET ───
  wallet: router({
    link: protectedProcedure
      .input(z.object({ walletAddress: z.string().min(32).max(64) }))
      .mutation(async ({ ctx, input }) => {
        const wallet = await linkWallet(ctx.user.id, input.walletAddress);
        return wallet;
      }),

    get: protectedProcedure.query(async ({ ctx }) => {
      return getWalletByUserId(ctx.user.id);
    }),
  }),

  // ─── GAME ───
  game: router({
    saveSession: protectedProcedure
      .input(z.object({
        score: z.number().int().min(0),
        distance: z.number().int().min(0),
        coinsCollected: z.number().int().min(0),
        survivalTimeMs: z.number().int().min(0),
        outcome: z.enum(["win", "fail", "abandoned"]),
        isPaidMode: z.boolean().optional(),
        walletAddress: z.string().optional(),
        solEarned: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await saveGameSession({
          userId: ctx.user.id,
          playerType: "human",
          walletAddress: input.walletAddress ?? null,
          score: input.score,
          distance: input.distance,
          coinsCollected: input.coinsCollected,
          survivalTimeMs: input.survivalTimeMs,
          outcome: input.outcome,
          isPaidMode: input.isPaidMode ?? false,
          solEarned: input.solEarned ?? "0",
        });
        return { success: true, id: result?.id };
      }),

    // AI agent plays a game (simulated)
    agentPlay: publicProcedure
      .input(z.object({ agentId: z.number().int() }))
      .mutation(async ({ input }) => {
        const { getAgentById } = await import("./db");
        const agent = await getAgentById(input.agentId);
        if (!agent) throw new Error("Agent not found");

        // Simulate AI game based on difficulty
        const difficultyMultiplier = { easy: 0.5, medium: 1.0, hard: 1.5, elite: 2.0 };
        const mult = difficultyMultiplier[agent.difficulty] || 1.0;

        const baseScore = 200 + Math.floor(Math.random() * 800);
        const score = Math.floor(baseScore * mult);
        const distance = Math.floor(score * 0.8 + Math.random() * 200);
        const coins = Math.floor(score * 0.05 + Math.random() * 20);
        const survivalTime = Math.floor(distance / 12 * 1000);

        await saveGameSession({
          aiAgentId: agent.id,
          playerType: "ai",
          walletAddress: agent.walletAddress,
          score,
          distance,
          coinsCollected: coins,
          survivalTimeMs: survivalTime,
          outcome: Math.random() > 0.3 ? "fail" : "win",
          solEarned: (coins * 0.000005).toFixed(6),
        });

        return { score, distance, coins, survivalTime };
      }),

    getHistory: protectedProcedure.query(async ({ ctx }) => {
      return getUserGameHistory(ctx.user.id);
    }),

    getRecent: publicProcedure.query(async () => {
      return getRecentSessions(20);
    }),

    getLeaderboard: publicProcedure
      .input(z.object({ filter: z.enum(["all", "human", "ai"]).default("all") }))
      .query(async ({ input }) => {
        return getLeaderboardEntries(input.filter);
      }),

    getStats: publicProcedure.query(async () => {
      return getGlobalStats();
    }),
  }),

  // ─── AI AGENTS ───
  agents: router({
    list: publicProcedure.query(async () => {
      return getActiveAgents();
    }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(128),
        walletAddress: z.string().min(32).max(64),
        agentType: z.enum(["openclaw", "autonomous", "bot"]).default("openclaw"),
        difficulty: z.enum(["easy", "medium", "hard", "elite"]).default("medium"),
        avatarColor: z.string().default("#ff6b35"),
      }))
      .mutation(async ({ input }) => {
        return createAiAgent(input);
      }),

    // Trigger an AI agent to play a game
    triggerRun: publicProcedure
      .input(z.object({ agentId: z.number().int() }))
      .mutation(async ({ input }) => {
        const { getAgentById } = await import("./db");
        const agent = await getAgentById(input.agentId);
        if (!agent) throw new Error("Agent not found");

        const difficultyMultiplier = { easy: 0.5, medium: 1.0, hard: 1.5, elite: 2.0 };
        const mult = difficultyMultiplier[agent.difficulty] || 1.0;

        const baseScore = 200 + Math.floor(Math.random() * 800);
        const score = Math.floor(baseScore * mult);
        const distance = Math.floor(score * 0.8 + Math.random() * 200);
        const coins = Math.floor(score * 0.05 + Math.random() * 20);
        const survivalTime = Math.floor(distance / 12 * 1000);

        await saveGameSession({
          aiAgentId: agent.id,
          playerType: "ai",
          walletAddress: agent.walletAddress,
          score,
          distance,
          coinsCollected: coins,
          survivalTimeMs: survivalTime,
          outcome: Math.random() > 0.3 ? "fail" : "win",
          solEarned: (coins * 0.000005).toFixed(6),
        });

        return { agentName: agent.name, score, distance, coins };
      }),
  }),

  // ─── SKINS ───
  skins: router({
    list: publicProcedure.query(async () => {
      return getAllSkins();
    }),

    mySkins: protectedProcedure.query(async ({ ctx }) => {
      await grantDefaultSkin(ctx.user.id);
      return getUserSkins(ctx.user.id);
    }),

    equipped: protectedProcedure.query(async ({ ctx }) => {
      return getEquippedSkin(ctx.user.id);
    }),

    purchase: protectedProcedure
      .input(z.object({ skinId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        return purchaseSkin(ctx.user.id, input.skinId);
      }),

    equip: protectedProcedure
      .input(z.object({ skinId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await equipSkin(ctx.user.id, input.skinId);
        return { success: true };
      }),
  }),

  // ─── BIRDEYE TOKENS ───
  tokens: router({
    trending: publicProcedure
      .input(z.object({
        sortBy: z.enum(["rank", "volumeUSD", "liquidity"]).default("rank"),
        interval: z.enum(["1h", "4h", "24h"]).default("24h"),
        limit: z.number().int().min(1).max(20).default(20),
      }))
      .query(async ({ input }) => {
        const apiKey = ENV.birdeyeApiKey;
        if (!apiKey) return { tokens: [], error: "Birdeye API key not configured" };

        try {
          const url = `https://public-api.birdeye.so/defi/token_trending?sort_by=${input.sortBy}&sort_type=asc&offset=0&limit=${input.limit}&interval=${input.interval}`;
          const res = await fetch(url, {
            headers: { accept: "application/json", "x-chain": "solana", "X-API-KEY": apiKey },
          });
          if (!res.ok) return { tokens: [], error: `Birdeye API error: ${res.status}` };
          const data = await res.json();
          return { tokens: data.data?.tokens || [], error: null };
        } catch (e: any) {
          return { tokens: [], error: e.message };
        }
      }),

    overview: publicProcedure
      .input(z.object({ address: z.string().min(20) }))
      .query(async ({ input }) => {
        const apiKey = ENV.birdeyeApiKey;
        if (!apiKey) return { data: null, error: "Birdeye API key not configured" };

        try {
          const url = `https://public-api.birdeye.so/defi/token_overview?address=${input.address}`;
          const res = await fetch(url, {
            headers: { accept: "application/json", "x-chain": "solana", "X-API-KEY": apiKey },
          });
          if (!res.ok) return { data: null, error: `Birdeye API error: ${res.status}` };
          const data = await res.json();
          return { data: data.data || null, error: null };
        } catch (e: any) {
          return { data: null, error: e.message };
        }
      }),

    search: publicProcedure
      .input(z.object({ keyword: z.string().min(1) }))
      .query(async ({ input }) => {
        const apiKey = ENV.birdeyeApiKey;
        if (!apiKey) return { tokens: [], error: "Birdeye API key not configured" };

        try {
          const url = `https://public-api.birdeye.so/defi/v3/search?keyword=${encodeURIComponent(input.keyword)}&chain=solana&target=token&sort_by=volume_24h_usd&sort_type=desc&offset=0&limit=10`;
          const res = await fetch(url, {
            headers: { accept: "application/json", "x-chain": "solana", "X-API-KEY": apiKey },
          });
          if (!res.ok) return { tokens: [], error: `Birdeye API error: ${res.status}` };
          const data = await res.json();
          return { tokens: data.data?.items || [], error: null };
        } catch (e: any) {
          return { tokens: [], error: e.message };
        }
      }),

    marketData: publicProcedure
      .input(z.object({ address: z.string().min(20) }))
      .query(async ({ input }) => {
        const apiKey = ENV.birdeyeApiKey;
        if (!apiKey) return { data: null, error: "Birdeye API key not configured" };

        try {
          const url = `https://public-api.birdeye.so/defi/v3/token/market-data?address=${input.address}`;
          const res = await fetch(url, {
            headers: { accept: "application/json", "x-chain": "solana", "X-API-KEY": apiKey },
          });
          if (!res.ok) return { data: null, error: `Birdeye API error: ${res.status}` };
          const data = await res.json();
          return { data: data.data || null, error: null };
        } catch (e: any) {
          return { data: null, error: e.message };
        }
      }),
  }),

  // ─── REWARDS ───
  rewards: router({
    myRewards: protectedProcedure.query(async ({ ctx }) => {
      return getUserRewards(ctx.user.id);
    }),

    pending: protectedProcedure
      .input(z.object({ walletAddress: z.string() }))
      .query(async ({ input }) => {
        return getPendingRewards(input.walletAddress);
      }),

    claim: protectedProcedure
      .input(z.object({
        walletAddress: z.string(),
        amount: z.string(),
        reason: z.enum(["game_win", "leaderboard_top", "daily_bonus", "referral"]).default("game_win"),
      }))
      .mutation(async ({ ctx, input }) => {
        await createReward({
          userId: ctx.user.id,
          walletAddress: input.walletAddress,
          amount: input.amount,
          reason: input.reason,
          status: "pending",
        });
        return { success: true, message: "Reward claim submitted" };
      }),
  }),

  // ─── ARENA (Multiplayer Matches) ───
  arena: router({
    // Create a new match lobby
    create: protectedProcedure
      .input(z.object({
        matchType: z.enum(["human_vs_human", "agent_vs_agent", "human_vs_agent"]),
        walletAddress: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createMatch({
          matchType: input.matchType,
          player1UserId: ctx.user.id,
          player1Name: ctx.user.name || `Player ${ctx.user.id}`,
          player1WalletAddress: input.walletAddress ?? null,
          status: "waiting",
        });
      }),

    // Create an agent vs agent match
    createAgentMatch: publicProcedure
      .input(z.object({
        agent1Id: z.number().int(),
      }))
      .mutation(async ({ input }) => {
        const agent = await getAgentById(input.agent1Id);
        if (!agent) throw new Error("Agent not found");
        return createMatch({
          matchType: "agent_vs_agent",
          player1AgentId: agent.id,
          player1Name: agent.name,
          player1WalletAddress: agent.walletAddress,
          status: "waiting",
        });
      }),

    // List waiting matches
    waiting: publicProcedure
      .input(z.object({
        matchType: z.enum(["human_vs_human", "agent_vs_agent", "human_vs_agent"]),
      }))
      .query(async ({ input }) => {
        return getWaitingMatches(input.matchType);
      }),

    // Get active matches
    active: publicProcedure.query(async () => {
      return getActiveMatches();
    }),

    // Get match details
    get: publicProcedure
      .input(z.object({ matchId: z.number().int() }))
      .query(async ({ input }) => {
        return getMatchById(input.matchId);
      }),

    // Join a waiting match
    join: protectedProcedure
      .input(z.object({
        matchId: z.number().int(),
        walletAddress: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return joinMatch(input.matchId, {
          userId: ctx.user.id,
          name: ctx.user.name || `Player ${ctx.user.id}`,
          walletAddress: input.walletAddress,
        });
      }),

    // Join match as agent
    joinAsAgent: publicProcedure
      .input(z.object({
        matchId: z.number().int(),
        agentId: z.number().int(),
      }))
      .mutation(async ({ input }) => {
        const agent = await getAgentById(input.agentId);
        if (!agent) throw new Error("Agent not found");
        return joinMatch(input.matchId, {
          agentId: agent.id,
          name: agent.name,
          walletAddress: agent.walletAddress,
        });
      }),

    // Ready up
    ready: publicProcedure
      .input(z.object({
        matchId: z.number().int(),
        playerSlot: z.enum(["player1", "player2"]),
      }))
      .mutation(async ({ input }) => {
        return readyUp(input.matchId, input.playerSlot);
      }),

    // Submit score
    submitScore: publicProcedure
      .input(z.object({
        matchId: z.number().int(),
        playerSlot: z.enum(["player1", "player2"]),
        score: z.number().int().min(0),
        distance: z.number().int().min(0),
        coins: z.number().int().min(0),
      }))
      .mutation(async ({ input }) => {
        return submitMatchScore(input.matchId, input.playerSlot, input.score, input.distance, input.coins);
      }),

    // Simulate agent match (both agents play)
    simulateAgentMatch: publicProcedure
      .input(z.object({ matchId: z.number().int() }))
      .mutation(async ({ input }) => {
        const match = await getMatchById(input.matchId);
        if (!match) throw new Error("Match not found");
        if (match.matchType !== "agent_vs_agent") throw new Error("Not an agent match");

        // Simulate both agents
        const simulate = async (agentId: number | null) => {
          if (!agentId) return { score: 0, distance: 0, coins: 0 };
          const agent = await getAgentById(agentId);
          if (!agent) return { score: 0, distance: 0, coins: 0 };
          const mult = { easy: 0.5, medium: 1.0, hard: 1.5, elite: 2.0 }[agent.difficulty] || 1.0;
          const base = 200 + Math.floor(Math.random() * 800);
          const score = Math.floor(base * mult);
          return { score, distance: Math.floor(score * 0.8 + Math.random() * 200), coins: Math.floor(score * 0.05 + Math.random() * 20) };
        };

        const p1 = await simulate(match.player1AgentId);
        const p2 = await simulate(match.player2AgentId);

        await readyUp(input.matchId, "player1");
        await readyUp(input.matchId, "player2");
        await submitMatchScore(input.matchId, "player1", p1.score, p1.distance, p1.coins);
        const result = await submitMatchScore(input.matchId, "player2", p2.score, p2.distance, p2.coins);

        return result;
      }),

    // Cancel match
    cancel: protectedProcedure
      .input(z.object({ matchId: z.number().int() }))
      .mutation(async ({ input }) => {
        await cancelMatch(input.matchId);
        return { success: true };
      }),

    // Recent finished matches
    recent: publicProcedure.query(async () => {
      return getRecentMatches(20);
    }),
  }),

  // ─── AUTONOMOUS AGENTS ───
  autonomous: router({
    list: publicProcedure.query(async () => {
      return getAutonomousAgents();
    }),

    get: publicProcedure
      .input(z.object({ id: z.number().int() }))
      .query(async ({ input }) => {
        return getAutonomousAgentById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(128),
        slug: z.string().min(1).max(64),
        description: z.string().optional(),
        avatarEmoji: z.string().default("\uD83E\uDD9E"),
        avatarColor: z.string().default("#ff4422"),
        modelProvider: z.enum(["xai", "openai", "anthropic"]),
        modelName: z.string(),
        personality: z.string().optional(),
        difficulty: z.enum(["cautious", "balanced", "aggressive", "reckless"]).default("balanced"),
        reactionSpeed: z.number().int().min(0).max(100).default(50),
        riskTolerance: z.number().int().min(0).max(100).default(50),
        coinPriority: z.number().int().min(0).max(100).default(50),
      }))
      .mutation(async ({ ctx, input }) => {
        return createAutonomousAgent({
          ...input,
          personality: input.personality ?? null,
          createdBy: ctx.user.id,
        });
      }),

    // Trigger an autonomous agent run
    run: publicProcedure
      .input(z.object({ agentId: z.number().int() }))
      .mutation(async ({ input }) => {
        const agent = await getAutonomousAgentById(input.agentId);
        if (!agent) throw new Error("Agent not found");

        // Create run record
        const run = await createAgentRun({
          agentId: agent.id,
          status: "running",
          startedAt: new Date(),
        });
        if (!run) throw new Error("Failed to create run");

        try {
          const result = await runAutonomousAgent({
            modelProvider: agent.modelProvider,
            modelName: agent.modelName,
            personality: agent.personality,
            difficulty: agent.difficulty,
            reactionSpeed: agent.reactionSpeed,
            riskTolerance: agent.riskTolerance,
            coinPriority: agent.coinPriority,
          });

          // Update run record
          await updateAgentRun(run.id, {
            status: "completed",
            score: result.score,
            distance: result.distance,
            coinsCollected: result.coinsCollected,
            survivalTimeMs: result.survivalTimeMs,
            decisionLog: result.decisionLog as any,
            ghostData: result.ghostData as any,
            llmTokensUsed: result.tokensUsed,
            completedAt: new Date(),
          });

          // Update agent stats
          await updateAgentStats(agent.id, result.score, result.distance);

          // Also save as game session for leaderboard
          await saveGameSession({
            aiAgentId: agent.id,
            playerType: "ai",
            score: result.score,
            distance: result.distance,
            coinsCollected: result.coinsCollected,
            survivalTimeMs: result.survivalTimeMs,
            outcome: "fail",
            solEarned: (result.coinsCollected * 0.000005).toFixed(6),
            gameData: { decisionCount: result.decisionLog.length, tokensUsed: result.tokensUsed } as any,
          });

          return {
            runId: run.id,
            score: result.score,
            distance: result.distance,
            coinsCollected: result.coinsCollected,
            survivalTimeMs: result.survivalTimeMs,
            decisionsCount: result.decisionLog.length,
            tokensUsed: result.tokensUsed,
            ghostData: result.ghostData,
          };
        } catch (e: any) {
          await updateAgentRun(run.id, {
            status: "failed",
            errorMessage: e.message,
            completedAt: new Date(),
          });
          throw e;
        }
      }),

    // Get agent run history
    runs: publicProcedure
      .input(z.object({ agentId: z.number().int(), limit: z.number().int().default(20) }))
      .query(async ({ input }) => {
        return getAgentRuns(input.agentId, input.limit);
      }),

    // Get best run ghost data
    bestGhost: publicProcedure
      .input(z.object({ agentId: z.number().int() }))
      .query(async ({ input }) => {
        const run = await getLatestAgentRun(input.agentId);
        if (!run) return null;
        return { ghostData: run.ghostData, score: run.score, distance: run.distance };
      }),
  }),

  // ─── CHARACTERS ───
  characters: router({
    list: publicProcedure.query(async () => {
      return getAllCharacters();
    }),

    get: publicProcedure
      .input(z.object({ id: z.number().int() }))
      .query(async ({ input }) => {
        return getCharacterById(input.id);
      }),

    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return getCharacterBySlug(input.slug);
      }),
  }),

  // ─── PLAYER PROFILES ───
  profile: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      return getOrCreateProfile(ctx.user.id, ctx.user.name);
    }),

    get: publicProcedure
      .input(z.object({ userId: z.number().int() }))
      .query(async ({ input }) => {
        return getProfileByUserId(input.userId);
      }),

    update: protectedProcedure
      .input(z.object({
        displayName: z.string().max(64).optional(),
        bio: z.string().max(500).optional(),
        avatarUrl: z.string().optional(),
        selectedCharacterId: z.number().int().optional(),
        xHandle: z.string().max(64).optional(),
        favoriteMap: z.string().optional(),
        isPublic: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return updateProfile(ctx.user.id, input);
      }),

    leaderboard: publicProcedure.query(async () => {
      return getPublicProfiles(50);
    }),
  }),

  // ─── CHAT ───
  chat: router({
    send: protectedProcedure
      .input(z.object({
        roomId: z.string().min(1).max(128),
        message: z.string().min(1).max(500),
        messageType: z.enum(["chat", "cheer", "prediction"]).default("chat"),
      }))
      .mutation(async ({ ctx, input }) => {
        return sendChatMessage({
          userId: ctx.user.id,
          userName: ctx.user.name || `Player ${ctx.user.id}`,
          roomId: input.roomId,
          message: input.message,
          messageType: input.messageType,
        });
      }),

    messages: publicProcedure
      .input(z.object({ roomId: z.string(), limit: z.number().int().default(100) }))
      .query(async ({ input }) => {
        return getChatMessages(input.roomId, input.limit);
      }),
  }),

  // ─── SHARED REPLAYS ───
  replays: router({
    share: protectedProcedure
      .input(z.object({
        gameSessionId: z.number().int(),
        characterSlug: z.string().optional(),
        mapName: z.string().optional(),
        score: z.number().int(),
        distance: z.number().int(),
        coinsCollected: z.number().int(),
        ghostData: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const shareCode = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        return createSharedReplay({
          userId: ctx.user.id,
          gameSessionId: input.gameSessionId,
          shareCode,
          characterSlug: input.characterSlug ?? null,
          mapName: input.mapName ?? null,
          score: input.score,
          distance: input.distance,
          coinsCollected: input.coinsCollected,
          ghostData: input.ghostData ?? null,
        });
      }),

    get: publicProcedure
      .input(z.object({ shareCode: z.string() }))
      .query(async ({ input }) => {
        return getReplayByShareCode(input.shareCode);
      }),

    myReplays: protectedProcedure.query(async ({ ctx }) => {
      return getUserReplays(ctx.user.id);
    }),

    // Generate X (Twitter) share URL
    xShareUrl: publicProcedure
      .input(z.object({
        score: z.number().int(),
        distance: z.number().int(),
        coins: z.number().int(),
        characterName: z.string().optional(),
        shareCode: z.string(),
      }))
      .query(({ input }) => {
        const text = `🦞 I just scored ${input.score.toLocaleString()} in Lobster Solana Runner!\n\n📏 Distance: ${input.distance}m\n🪙 Coins: ${input.coins}\n${input.characterName ? `🎮 Playing as: ${input.characterName}\n` : ""}\nCan you beat my score? 🏆`;
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        return { url, text };
      }),
  }),

  // ─── PREDICTION MARKET ───
  predictions: router({
    // List markets
    markets: publicProcedure
      .input(z.object({ status: z.string().optional() }))
      .query(async ({ input }) => {
        return getPredictionMarkets(input.status);
      }),

    // Get market details
    market: publicProcedure
      .input(z.object({ id: z.number().int() }))
      .query(async ({ input }) => {
        const market = await getPredictionMarketById(input.id);
        const bets = await getPredictionsForMarket(input.id);
        return { market, bets };
      }),

    // Create a prediction market
    createMarket: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(256),
        description: z.string().optional(),
        agentId: z.number().int().optional(),
        matchId: z.number().int().optional(),
        marketType: z.enum(["agent_win", "score_threshold", "head_to_head"]),
        targetValue: z.number().int().optional(),
      }))
      .mutation(async ({ input }) => {
        return createPredictionMarket({
          title: input.title,
          description: input.description ?? null,
          agentId: input.agentId ?? null,
          matchId: input.matchId ?? null,
          marketType: input.marketType,
          targetValue: input.targetValue ?? null,
        });
      }),

    // Place a bet
    placeBet: protectedProcedure
      .input(z.object({
        marketId: z.number().int(),
        agentId: z.number().int().optional(),
        predictionType: z.enum(["win", "score_over", "score_under", "survive_time"]),
        targetValue: z.number().int().optional(),
        betAmount: z.string(),
        walletAddress: z.string().optional(),
        side: z.enum(["yes", "no"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const market = await getPredictionMarketById(input.marketId);
        if (!market || market.status !== "open") throw new Error("Market not available");

        const betAmt = parseFloat(input.betAmount);
        const odds = input.side === "yes" ? parseFloat(market.yesOdds) : parseFloat(market.noOdds);
        const payout = (betAmt * odds).toFixed(6);

        const prediction = await createPrediction({
          matchId: input.marketId,
          agentId: input.agentId ?? null,
          predictionType: input.predictionType,
          targetValue: input.targetValue ?? null,
          userId: ctx.user.id,
          walletAddress: input.walletAddress ?? null,
          betAmount: input.betAmount,
          odds: odds.toString(),
          potentialPayout: payout,
        });

        // Update market pools
        const currentPool = parseFloat(market.totalPool);
        const yesPool = parseFloat(market.yesPool);
        const noPool = parseFloat(market.noPool);

        if (input.side === "yes") {
          await updatePredictionMarket(input.marketId, {
            totalPool: (currentPool + betAmt).toFixed(6),
            yesPool: (yesPool + betAmt).toFixed(6),
          });
        } else {
          await updatePredictionMarket(input.marketId, {
            totalPool: (currentPool + betAmt).toFixed(6),
            noPool: (noPool + betAmt).toFixed(6),
          });
        }

        // Recalculate odds
        const newYes = input.side === "yes" ? yesPool + betAmt : yesPool;
        const newNo = input.side === "no" ? noPool + betAmt : noPool;
        const total = newYes + newNo;
        if (total > 0) {
          await updatePredictionMarket(input.marketId, {
            yesOdds: (total / Math.max(newYes, 0.001)).toFixed(2),
            noOdds: (total / Math.max(newNo, 0.001)).toFixed(2),
          });
        }

        return prediction;
      }),

    // My predictions
    myBets: protectedProcedure.query(async ({ ctx }) => {
      return getUserPredictions(ctx.user.id);
    }),

    // Resolve a market (admin)
    resolve: adminProcedure
      .input(z.object({
        marketId: z.number().int(),
        outcome: z.enum(["yes", "no"]),
      }))
      .mutation(async ({ input }) => {
        await updatePredictionMarket(input.marketId, {
          status: "resolved",
          outcome: input.outcome,
          resolvedAt: new Date(),
        });
        // Resolve all predictions
        await resolvePredictions(input.marketId, input.outcome === "yes" ? "correct" : "incorrect");
        return { success: true };
      }),
  }),

  // ─── CREDITS (Pay-to-Play) ───
  credits: router({
    // Get user credit balance
    balance: protectedProcedure.query(async ({ ctx }) => {
      const balance = await getCredits(ctx.user.id);
      const gamesPlayed = await getPaidGamesInWindow(ctx.user.id);
      return {
        balance,
        paidGamesToday: gamesPlayed,
        dailyLimit: CREDIT_CONSTANTS.DAILY_PAID_GAME_LIMIT,
        remainingToday: Math.max(0, CREDIT_CONSTANTS.DAILY_PAID_GAME_LIMIT - gamesPlayed),
        entryFee: CREDIT_CONSTANTS.ENTRY_FEE_SOL,
        prizeAmount: CREDIT_CONSTANTS.PRIZE_SOL,
        scoreThreshold: CREDIT_CONSTANTS.SCORE_THRESHOLD,
      };
    }),

    // Create a deposit transaction for the user to sign via Phantom
    deposit: protectedProcedure
      .input(z.object({
        creditsToBuy: z.number().int().min(1).max(50),
        walletAddress: z.string().min(32).max(64),
      }))
      .mutation(async ({ ctx, input }) => {
        const wallet = await getWalletByUserId(ctx.user.id);
        if (!wallet || wallet.walletAddress !== input.walletAddress) {
          throw new Error("Wallet not linked to your account. Please connect your wallet first.");
        }

        // Check treasury is configured
        if (!ENV.treasuryWalletAddress && !ENV.treasuryPrivateKey) {
          throw new Error("Treasury wallet not configured. Contact the admin to set TREASURY_WALLET_ADDRESS.");
        }

        const totalSol = input.creditsToBuy * CREDIT_CONSTANTS.ENTRY_FEE_SOL;
        const lamports = Math.floor(totalSol * 1e9);
        const treasuryAddress = getTreasuryAddress();

        // Return the transaction details for Phantom to sign client-side
        return {
          treasuryAddress,
          lamports,
          totalSol,
          creditsToBuy: input.creditsToBuy,
          pricePerCredit: CREDIT_CONSTANTS.ENTRY_FEE_SOL,
        };
      }),

    // Verify on-chain deposit and add credits
    verifyDeposit: protectedProcedure
      .input(z.object({
        txSignature: z.string().min(64).max(128),
        creditsToBuy: z.number().int().min(1).max(50),
        walletAddress: z.string().min(32).max(64),
      }))
      .mutation(async ({ ctx, input }) => {
        const expectedSol = input.creditsToBuy * CREDIT_CONSTANTS.ENTRY_FEE_SOL;
        const expectedLamports = Math.floor(expectedSol * 1e9);

        const wallet = await getWalletByUserId(ctx.user.id);
        if (!wallet || wallet.walletAddress !== input.walletAddress) {
          throw new Error("Wallet not linked to your account");
        }

        const usedTx = await getCreditTransactionBySignature(input.txSignature);
        if (usedTx) {
          throw new Error("This transaction signature has already been used for a credit deposit.");
        }

        // Poll for tx confirmation (Phantom may return before confirmation)
        let confirmed = false;
        for (let attempt = 0; attempt < 10; attempt++) {
          const status = await verifyTransaction(input.txSignature);
          if (status.confirmed) { confirmed = true; break; }
          await new Promise(r => setTimeout(r, 2000));
        }

        if (!confirmed) {
          throw new Error("Transaction not confirmed after polling. Please try again shortly.");
        }

        const transferCheck = await verifyTransferToTreasury(
          input.txSignature,
          input.walletAddress,
          expectedLamports,
        );
        if (!transferCheck.valid) {
          throw new Error(transferCheck.reason || "Transaction did not transfer the expected amount to treasury.");
        }

        // Add credits to user balance
        const newBalance = await addCredits(
          ctx.user.id,
          input.creditsToBuy,
          input.txSignature,
          `Deposited ${expectedSol} SOL for ${input.creditsToBuy} credits`,
        );

        return {
          success: true,
          creditsAdded: input.creditsToBuy,
          newBalance,
          txSignature: input.txSignature,
        };
      }),

    // Spend 1 credit to start a paid game
    spend: protectedProcedure.mutation(async ({ ctx }) => {
      // Check daily cooldown
      const gamesPlayed = await getPaidGamesInWindow(ctx.user.id);
      if (gamesPlayed >= CREDIT_CONSTANTS.DAILY_PAID_GAME_LIMIT) {
        throw new Error(`Daily limit reached (${CREDIT_CONSTANTS.DAILY_PAID_GAME_LIMIT} paid games per 24h). Try again later.`);
      }

      const newBalance = await spendCredit(ctx.user.id);
      return {
        success: true,
        newBalance,
        paidGamesToday: gamesPlayed + 1,
        remainingToday: CREDIT_CONSTANTS.DAILY_PAID_GAME_LIMIT - gamesPlayed - 1,
      };
    }),

    // Credit transaction history
    history: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }).optional())
      .query(async ({ ctx, input }) => {
        return getCreditHistory(ctx.user.id, input?.limit ?? 50);
      }),

    // Paid game stats (win/loss record, net P&L)
    paidStats: protectedProcedure.query(async ({ ctx }) => {
      const stats = await getPaidGameStats(ctx.user.id);
      return {
        ...stats,
        entryFeeSol: CREDIT_CONSTANTS.ENTRY_FEE_SOL,
        prizeSol: CREDIT_CONSTANTS.PRIZE_SOL,
        netPLSol: stats.totalPayoutSol - (stats.totalSpent * CREDIT_CONSTANTS.ENTRY_FEE_SOL),
      };
    }),
  }),

  // ─── TREASURY ───
  treasury: router({
    balance: publicProcedure.query(async () => {
      const balance = await getTreasuryBalance();
      return {
        address: getTreasuryAddress(),
        ...balance,
      };
    }),

    walletBalance: publicProcedure
      .input(z.object({ address: z.string().min(32).max(64) }))
      .query(async ({ input }) => {
        return getWalletBalance(input.address);
      }),

    walletAssets: publicProcedure
      .input(z.object({ address: z.string().min(32).max(64) }))
      .query(async ({ input }) => {
        return getWalletAssets(input.address);
      }),

    recentTransactions: publicProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional())
      .query(async ({ input }) => {
        return getTreasuryTransactions(input?.limit ?? 20);
      }),

    stats: publicProcedure.query(async () => {
      const balance = await getTreasuryBalance();
      const payoutStatsData = await getPayoutStats();
      return {
        address: getTreasuryAddress(),
        balance,
        payouts: payoutStatsData,
      };
    }),

    claimPrize: protectedProcedure
      .input(z.object({
        gameSessionId: z.number().int(),
        walletAddress: z.string().min(32).max(64),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify user owns this wallet
        const wallet = await getWalletByUserId(ctx.user.id);
        if (!wallet || wallet.walletAddress !== input.walletAddress) {
          throw new Error("Wallet not linked to your account");
        }

        // Check if already claimed
        const existing = await getPendingPayoutForSession(input.gameSessionId);
        if (existing) {
          throw new Error("Prize already claimed for this session");
        }

        // Get game session score
        const sessions = await getUserGameHistory(ctx.user.id, 100);
        const session = sessions.find((s: any) => s.id === input.gameSessionId);
        if (!session) {
          throw new Error("Game session not found");
        }

        const score = session.score ?? 0;
        const prizeSOL = calculatePrize(score);
        const lamports = Math.floor(prizeSOL * 1e9);

        // Create pending payout record
        const payoutId = await createPayout({
          userId: ctx.user.id,
          walletAddress: input.walletAddress,
          gameSessionId: input.gameSessionId,
          amountLamports: lamports,
          amountSol: prizeSOL.toFixed(9),
          status: "pending",
        });

        if (!payoutId) throw new Error("Failed to create payout record");

        // Attempt to send SOL
        try {
          await updatePayoutStatus(payoutId, "processing");
          const { signature } = await sendSolToWinner(input.walletAddress, prizeSOL);
          await updatePayoutStatus(payoutId, "confirmed", signature);
          return {
            success: true,
            payoutId,
            signature,
            amountSol: prizeSOL,
            lamports,
          };
        } catch (err: any) {
          await updatePayoutStatus(payoutId, "failed", undefined, err.message);
          throw new Error(`Payout failed: ${err.message}`);
        }
      }),

    myPayouts: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getPayoutsByUser(ctx.user.id, input?.limit ?? 20);
      }),

    allPayouts: publicProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional())
      .query(async ({ input }) => {
        return getRecentPayouts(input?.limit ?? 50);
      }),

    verifyTx: publicProcedure
      .input(z.object({ signature: z.string().min(64).max(128) }))
      .query(async ({ input }) => {
        return verifyTransaction(input.signature);
      }),
  }),
});

export type AppRouter = typeof appRouter;
