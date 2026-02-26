import { integer, pgEnum, pgTable, text, timestamp, varchar, bigint, boolean, json, serial } from "drizzle-orm/pg-core";

// ─── ENUMS ───
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const agentTypeEnum = pgEnum("agent_type", ["openclaw", "autonomous", "bot"]);
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard", "elite"]);
export const playerTypeEnum = pgEnum("player_type", ["human", "ai"]);
export const outcomeEnum = pgEnum("outcome", ["win", "fail", "abandoned"]);
export const rewardReasonEnum = pgEnum("reward_reason", ["game_win", "leaderboard_top", "daily_bonus", "referral"]);
export const rewardStatusEnum = pgEnum("reward_status", ["pending", "claimed", "failed"]);
export const skinPatternEnum = pgEnum("skin_pattern", ["solid", "striped", "spotted", "gradient", "cosmic"]);
export const skinAccessoryEnum = pgEnum("skin_accessory", ["none", "crown", "sunglasses", "tophat", "pirate", "antenna", "cape"]);
export const skinRarityEnum = pgEnum("skin_rarity", ["common", "uncommon", "rare", "epic", "legendary"]);
export const matchTypeEnum = pgEnum("match_type", ["human_vs_human", "agent_vs_agent", "human_vs_agent"]);
export const matchStatusEnum = pgEnum("match_status", ["waiting", "ready", "playing", "finished", "cancelled"]);
export const winnerTypeEnum = pgEnum("winner_type", ["player1", "player2", "draw"]);
export const modelProviderEnum = pgEnum("model_provider", ["xai", "openai", "anthropic"]);
export const agentDifficultyEnum = pgEnum("agent_difficulty", ["cautious", "balanced", "aggressive", "reckless"]);
export const runStatusEnum = pgEnum("run_status", ["pending", "running", "completed", "failed"]);
export const predictionTypeEnum = pgEnum("prediction_type", ["win", "score_over", "score_under", "survive_time"]);
export const predictionStatusEnum = pgEnum("prediction_status", ["open", "locked", "won", "lost", "cancelled", "refunded"]);
export const predictionResultEnum = pgEnum("prediction_result", ["pending", "correct", "incorrect"]);
export const marketTypeEnum = pgEnum("market_type", ["agent_win", "score_threshold", "head_to_head"]);
export const marketStatusEnum = pgEnum("market_status", ["open", "locked", "resolved", "cancelled"]);
export const marketOutcomeEnum = pgEnum("market_outcome", ["pending", "yes", "no"]);
export const characterRarityEnum = pgEnum("character_rarity", ["common", "uncommon", "rare", "epic", "legendary", "mythic"]);
export const messageTypeEnum = pgEnum("message_type", ["chat", "system", "cheer", "prediction"]);
export const payoutStatusEnum = pgEnum("payout_status", ["pending", "processing", "confirmed", "failed"]);
export const creditTxTypeEnum = pgEnum("credit_tx_type", ["deposit", "spend", "prize", "refund"]);

// ─── TABLES ───

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  supabaseId: varchar("supabase_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Solana wallet addresses linked to users
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  walletAddress: varchar("wallet_address", { length: 64 }).notNull().unique(),
  isPrimary: boolean("is_primary").default(true).notNull(),
  verifiedAt: timestamp("verified_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = typeof wallets.$inferInsert;

// AI agents that can play the game
export const aiAgents = pgTable("ai_agents", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  walletAddress: varchar("wallet_address", { length: 64 }).notNull().unique(),
  agentType: agentTypeEnum("agent_type").default("openclaw").notNull(),
  difficulty: difficultyEnum("difficulty").default("medium").notNull(),
  avatarColor: varchar("avatar_color", { length: 7 }).default("#ff6b35").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  totalGames: integer("total_games").default(0).notNull(),
  totalScore: bigint("total_score", { mode: "number" }).default(0).notNull(),
  bestScore: integer("best_score").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AiAgent = typeof aiAgents.$inferSelect;
export type InsertAiAgent = typeof aiAgents.$inferInsert;

// Game sessions — each run by a human or AI
export const gameSessions = pgTable("game_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  aiAgentId: integer("ai_agent_id"),
  playerType: playerTypeEnum("player_type").notNull(),
  walletAddress: varchar("wallet_address", { length: 64 }),
  score: integer("score").default(0).notNull(),
  distance: integer("distance").default(0).notNull(),
  coinsCollected: integer("coins_collected").default(0).notNull(),
  survivalTimeMs: integer("survival_time_ms").default(0).notNull(),
  outcome: outcomeEnum("outcome").default("fail").notNull(),
  isPaidMode: boolean("is_paid_mode").default(false).notNull(),
  solEarned: varchar("sol_earned", { length: 32 }).default("0"),
  gameData: json("game_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type GameSession = typeof gameSessions.$inferSelect;
export type InsertGameSession = typeof gameSessions.$inferInsert;

// Leaderboard entries (aggregated best scores)
export const leaderboard = pgTable("leaderboard", {
  id: serial("id").primaryKey(),
  playerType: playerTypeEnum("player_type").notNull(),
  userId: integer("user_id"),
  aiAgentId: integer("ai_agent_id"),
  playerName: varchar("player_name", { length: 128 }).notNull(),
  walletAddress: varchar("wallet_address", { length: 64 }),
  bestScore: integer("best_score").default(0).notNull(),
  bestDistance: integer("best_distance").default(0).notNull(),
  totalGames: integer("total_games").default(0).notNull(),
  totalCoins: integer("total_coins").default(0).notNull(),
  avgScore: integer("avg_score").default(0).notNull(),
  rank: integer("rank").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type LeaderboardEntry = typeof leaderboard.$inferSelect;
export type InsertLeaderboardEntry = typeof leaderboard.$inferInsert;

// Reward claims
export const rewards = pgTable("rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  walletAddress: varchar("wallet_address", { length: 64 }).notNull(),
  amount: varchar("amount", { length: 32 }).notNull(),
  reason: rewardReasonEnum("reason").default("game_win").notNull(),
  status: rewardStatusEnum("status").default("pending").notNull(),
  txSignature: varchar("tx_signature", { length: 128 }),
  gameSessionId: integer("game_session_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  claimedAt: timestamp("claimed_at"),
});

export type Reward = typeof rewards.$inferSelect;
export type InsertReward = typeof rewards.$inferInsert;

// Lobster skins — customization options
export const lobsterSkins = pgTable("lobster_skins", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  description: text("description"),
  bodyColor: varchar("body_color", { length: 7 }).notNull(),
  headColor: varchar("head_color", { length: 7 }).notNull(),
  clawColor: varchar("claw_color", { length: 7 }).notNull(),
  tailColor: varchar("tail_color", { length: 7 }).notNull(),
  eyeColor: varchar("eye_color", { length: 7 }).default("#111111").notNull(),
  glowColor: varchar("glow_color", { length: 7 }),
  pattern: skinPatternEnum("pattern").default("solid").notNull(),
  accessory: skinAccessoryEnum("accessory").default("none").notNull(),
  rarity: skinRarityEnum("rarity").default("common").notNull(),
  price: integer("price").default(0).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type LobsterSkin = typeof lobsterSkins.$inferSelect;
export type InsertLobsterSkin = typeof lobsterSkins.$inferInsert;

// Player-owned skins
export const playerSkins = pgTable("player_skins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  skinId: integer("skin_id").notNull(),
  isEquipped: boolean("is_equipped").default(false).notNull(),
  purchasedAt: timestamp("purchased_at").defaultNow().notNull(),
});

export type PlayerSkin = typeof playerSkins.$inferSelect;
export type InsertPlayerSkin = typeof playerSkins.$inferInsert;

// Arena matches — human vs human or agent vs agent
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  matchType: matchTypeEnum("match_type").notNull(),
  status: matchStatusEnum("match_status").default("waiting").notNull(),
  player1UserId: integer("player1_user_id"),
  player1AgentId: integer("player1_agent_id"),
  player1Name: varchar("player1_name", { length: 128 }),
  player1WalletAddress: varchar("player1_wallet_address", { length: 64 }),
  player1Score: integer("player1_score").default(0).notNull(),
  player1Distance: integer("player1_distance").default(0).notNull(),
  player1Coins: integer("player1_coins").default(0).notNull(),
  player1Ready: boolean("player1_ready").default(false).notNull(),
  player2UserId: integer("player2_user_id"),
  player2AgentId: integer("player2_agent_id"),
  player2Name: varchar("player2_name", { length: 128 }),
  player2WalletAddress: varchar("player2_wallet_address", { length: 64 }),
  player2Score: integer("player2_score").default(0).notNull(),
  player2Distance: integer("player2_distance").default(0).notNull(),
  player2Coins: integer("player2_coins").default(0).notNull(),
  player2Ready: boolean("player2_ready").default(false).notNull(),
  winnerId: integer("winner_id"),
  winnerType: winnerTypeEnum("winner_type"),
  prizePool: varchar("prize_pool", { length: 32 }).default("0"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;

// Autonomous AI agents with LLM configuration
export const autonomousAgents = pgTable("autonomous_agents", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  description: text("description"),
  avatarEmoji: varchar("avatar_emoji", { length: 8 }).default("🦞").notNull(),
  avatarColor: varchar("avatar_color", { length: 7 }).default("#ff4422").notNull(),
  modelProvider: modelProviderEnum("model_provider").notNull(),
  modelName: varchar("model_name", { length: 128 }).notNull(),
  personality: text("personality"),
  difficulty: agentDifficultyEnum("agent_difficulty").default("balanced").notNull(),
  reactionSpeed: integer("reaction_speed").default(50).notNull(),
  riskTolerance: integer("risk_tolerance").default(50).notNull(),
  coinPriority: integer("coin_priority").default(50).notNull(),
  totalGames: integer("total_games").default(0).notNull(),
  totalScore: bigint("total_score", { mode: "number" }).default(0).notNull(),
  bestScore: integer("best_score").default(0).notNull(),
  winRate: integer("win_rate").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AutonomousAgent = typeof autonomousAgents.$inferSelect;
export type InsertAutonomousAgent = typeof autonomousAgents.$inferInsert;

// Agent game runs
export const agentRuns = pgTable("agent_runs", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  status: runStatusEnum("run_status").default("pending").notNull(),
  score: integer("score").default(0).notNull(),
  distance: integer("distance").default(0).notNull(),
  coinsCollected: integer("coins_collected").default(0).notNull(),
  survivalTimeMs: integer("survival_time_ms").default(0).notNull(),
  decisionLog: json("decision_log"),
  ghostData: json("ghost_data"),
  llmTokensUsed: integer("llm_tokens_used").default(0).notNull(),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AgentRun = typeof agentRuns.$inferSelect;
export type InsertAgentRun = typeof agentRuns.$inferInsert;

// Prediction market — bets on agent performance
export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id"),
  agentId: integer("agent_id"),
  predictionType: predictionTypeEnum("prediction_type").notNull(),
  targetValue: integer("target_value"),
  userId: integer("user_id").notNull(),
  walletAddress: varchar("wallet_address", { length: 64 }),
  betAmount: varchar("bet_amount", { length: 32 }).notNull(),
  odds: varchar("odds", { length: 16 }).default("2.0").notNull(),
  potentialPayout: varchar("potential_payout", { length: 32 }).notNull(),
  status: predictionStatusEnum("prediction_status").default("open").notNull(),
  result: predictionResultEnum("prediction_result").default("pending").notNull(),
  paidOut: boolean("paid_out").default(false).notNull(),
  txSignature: varchar("tx_signature", { length: 128 }),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Prediction = typeof predictions.$inferSelect;
export type InsertPrediction = typeof predictions.$inferInsert;

// Prediction markets — aggregate market for a specific event
export const predictionMarkets = pgTable("prediction_markets", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  agentId: integer("agent_id"),
  matchId: integer("match_id"),
  marketType: marketTypeEnum("market_type").notNull(),
  targetValue: integer("target_value"),
  status: marketStatusEnum("market_status").default("open").notNull(),
  totalPool: varchar("total_pool", { length: 32 }).default("0").notNull(),
  yesPool: varchar("yes_pool", { length: 32 }).default("0").notNull(),
  noPool: varchar("no_pool", { length: 32 }).default("0").notNull(),
  yesOdds: varchar("yes_odds", { length: 16 }).default("2.0").notNull(),
  noOdds: varchar("no_odds", { length: 16 }).default("2.0").notNull(),
  outcome: marketOutcomeEnum("market_outcome").default("pending").notNull(),
  resolvedAt: timestamp("resolved_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PredictionMarket = typeof predictionMarkets.$inferSelect;
export type InsertPredictionMarket = typeof predictionMarkets.$inferInsert;

// Game characters — playable characters with unique abilities
export const gameCharacters = pgTable("game_characters", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  description: text("description"),
  role: varchar("role", { length: 64 }).notNull(),
  characterClass: varchar("character_class", { length: 64 }).notNull(),
  rarity: characterRarityEnum("character_rarity").default("epic").notNull(),
  faction: varchar("faction", { length: 64 }).notNull(),
  spriteUrl: text("sprite_url"),
  primaryColor: varchar("primary_color", { length: 7 }).notNull(),
  secondaryColor: varchar("secondary_color", { length: 7 }).notNull(),
  glowColor: varchar("glow_color", { length: 7 }).notNull(),
  emoji: varchar("emoji", { length: 8 }).default("🦞").notNull(),
  abilities: json("abilities"),
  speed: integer("speed").default(50).notNull(),
  coinBonus: integer("coin_bonus").default(50).notNull(),
  survivability: integer("survivability").default(50).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type GameCharacter = typeof gameCharacters.$inferSelect;
export type InsertGameCharacter = typeof gameCharacters.$inferInsert;

// Player profiles — social features
export const playerProfiles = pgTable("player_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  displayName: varchar("display_name", { length: 64 }),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  selectedCharacterId: integer("selected_character_id"),
  totalWins: integer("total_wins").default(0).notNull(),
  totalGames: integer("total_games").default(0).notNull(),
  highScore: integer("high_score").default(0).notNull(),
  totalCoins: integer("total_coins").default(0).notNull(),
  totalDistance: integer("total_distance").default(0).notNull(),
  favoriteMap: varchar("favorite_map", { length: 32 }),
  xHandle: varchar("x_handle", { length: 64 }),
  isPublic: boolean("is_public").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PlayerProfile = typeof playerProfiles.$inferSelect;
export type InsertPlayerProfile = typeof playerProfiles.$inferInsert;

// Spectating chat messages
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  userName: varchar("user_name", { length: 128 }).notNull(),
  roomId: varchar("room_id", { length: 128 }).notNull(),
  message: text("message").notNull(),
  messageType: messageTypeEnum("message_type").default("chat").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// Shared replays for X (Twitter) sharing
export const sharedReplays = pgTable("shared_replays", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  gameSessionId: integer("game_session_id").notNull(),
  shareCode: varchar("share_code", { length: 32 }).notNull().unique(),
  characterSlug: varchar("character_slug", { length: 64 }),
  mapName: varchar("map_name", { length: 32 }),
  score: integer("score").default(0).notNull(),
  distance: integer("distance").default(0).notNull(),
  coinsCollected: integer("coins_collected").default(0).notNull(),
  ghostData: json("ghost_data"),
  xPostUrl: text("x_post_url"),
  viewCount: integer("view_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SharedReplay = typeof sharedReplays.$inferSelect;
export type InsertSharedReplay = typeof sharedReplays.$inferInsert;

// SOL payouts from treasury to winners
export const payouts = pgTable("payouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  walletAddress: varchar("wallet_address", { length: 64 }).notNull(),
  gameSessionId: integer("game_session_id"),
  amountLamports: bigint("amount_lamports", { mode: "number" }).notNull(),
  amountSol: varchar("amount_sol", { length: 20 }).notNull(),
  txSignature: varchar("tx_signature", { length: 128 }),
  status: payoutStatusEnum("payout_status").default("pending").notNull(),
  errorMessage: text("error_message"),
  claimedAt: timestamp("claimed_at").defaultNow().notNull(),
  confirmedAt: timestamp("confirmed_at"),
});

export type Payout = typeof payouts.$inferSelect;
export type InsertPayout = typeof payouts.$inferInsert;

// Player credit balances
export const credits = pgTable("credits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  balance: integer("balance").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Credit = typeof credits.$inferSelect;
export type InsertCredit = typeof credits.$inferInsert;

// Credit transaction history
export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: creditTxTypeEnum("type").notNull(),
  amount: integer("amount").notNull(),
  txSignature: varchar("tx_signature", { length: 128 }),
  gameSessionId: integer("game_session_id"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = typeof creditTransactions.$inferInsert;
