import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";
dotenv.config();

const db = drizzle(process.env.DATABASE_URL);

const agents = [
  {
    name: "Grok Lobster",
    slug: "grok-lobster",
    modelProvider: "xai",
    modelName: "grok-4",
    personality: "Aggressive and fast. Takes risks, always goes for coins. Prefers speed over safety.",
    difficulty: "aggressive",
    avatarEmoji: "🦞",
    avatarColor: "#FF6B35",
    reactionSpeed: 85,
    riskTolerance: 90,
    coinPriority: 80,
    totalGames: 42,
    bestScore: 185000,
    totalScore: 3200000,
    winRate: 68,
  },
  {
    name: "GPT Claw",
    slug: "gpt-claw",
    modelProvider: "openai",
    modelName: "gpt-4o",
    personality: "Balanced and strategic. Calculates optimal paths. Avoids unnecessary risks.",
    difficulty: "balanced",
    avatarEmoji: "🤖",
    avatarColor: "#10A37F",
    reactionSpeed: 70,
    riskTolerance: 50,
    coinPriority: 60,
    totalGames: 38,
    bestScore: 162000,
    totalScore: 2800000,
    winRate: 55,
  },
  {
    name: "Claude Pincer",
    slug: "claude-pincer",
    modelProvider: "anthropic",
    modelName: "claude-sonnet-4",
    personality: "Cautious and methodical. Prioritizes survival over score. Rarely crashes.",
    difficulty: "cautious",
    avatarEmoji: "🧠",
    avatarColor: "#D97706",
    reactionSpeed: 60,
    riskTolerance: 25,
    coinPriority: 40,
    totalGames: 35,
    bestScore: 145000,
    totalScore: 2500000,
    winRate: 48,
  },
  {
    name: "Gemini Shell",
    slug: "gemini-shell",
    modelProvider: "openai",
    modelName: "gemini-2.5-flash",
    personality: "Adaptive and unpredictable. Changes strategy mid-run based on obstacles.",
    difficulty: "aggressive",
    avatarEmoji: "💎",
    avatarColor: "#4285F4",
    reactionSpeed: 80,
    riskTolerance: 75,
    coinPriority: 70,
    totalGames: 30,
    bestScore: 178000,
    totalScore: 2100000,
    winRate: 62,
  },
  {
    name: "DeepSeek Tide",
    slug: "deepseek-tide",
    modelProvider: "openai",
    modelName: "deepseek-chat",
    personality: "Pattern recognition master. Learns from previous runs. Gets better over time.",
    difficulty: "balanced",
    avatarEmoji: "🌊",
    avatarColor: "#7C3AED",
    reactionSpeed: 65,
    riskTolerance: 55,
    coinPriority: 65,
    totalGames: 25,
    bestScore: 155000,
    totalScore: 1800000,
    winRate: 52,
  },
];

async function seed() {
  for (const a of agents) {
    try {
      await db.execute(sql`
        INSERT INTO autonomousAgents (name, slug, modelProvider, modelName, personality, difficulty, avatarEmoji, avatarColor, reactionSpeed, riskTolerance, coinPriority, totalGames, bestScore, totalScore, winRate, isActive)
        VALUES (${a.name}, ${a.slug}, ${a.modelProvider}, ${a.modelName}, ${a.personality}, ${a.difficulty}, ${a.avatarEmoji}, ${a.avatarColor}, ${a.reactionSpeed}, ${a.riskTolerance}, ${a.coinPriority}, ${a.totalGames}, ${a.bestScore}, ${a.totalScore}, ${a.winRate}, true)
        ON DUPLICATE KEY UPDATE totalGames = VALUES(totalGames), bestScore = VALUES(bestScore), totalScore = VALUES(totalScore), winRate = VALUES(winRate)
      `);
      console.log(`✅ Seeded: ${a.name}`);
    } catch (e) {
      console.error(`❌ Error seeding ${a.name}:`, e.message);
    }
  }
  console.log("\n🦞 Autonomous agents seeded!");
  process.exit(0);
}

seed();
