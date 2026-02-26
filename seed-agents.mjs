import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { aiAgents } from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

const agents = [
  {
    name: "OpenClaw Alpha",
    walletAddress: "Claw1111111111111111111111111111111111111111",
    agentType: "openclaw",
    difficulty: "medium",
    avatarColor: "#9945ff",
  },
  {
    name: "DeepSea Bot",
    walletAddress: "Deep2222222222222222222222222222222222222222",
    agentType: "autonomous",
    difficulty: "hard",
    avatarColor: "#14F195",
  },
  {
    name: "Coral Crusher",
    walletAddress: "Cora3333333333333333333333333333333333333333",
    agentType: "bot",
    difficulty: "easy",
    avatarColor: "#ff6b35",
  },
  {
    name: "Neptune AI",
    walletAddress: "Nept4444444444444444444444444444444444444444",
    agentType: "openclaw",
    difficulty: "elite",
    avatarColor: "#ff2244",
  },
  {
    name: "Tidal Agent",
    walletAddress: "Tida5555555555555555555555555555555555555555",
    agentType: "autonomous",
    difficulty: "medium",
    avatarColor: "#4488cc",
  },
];

async function seed() {
  for (const agent of agents) {
    try {
      await db.insert(aiAgents).values(agent);
      console.log(`Created agent: ${agent.name}`);
    } catch (e) {
      console.log(`Agent ${agent.name} already exists or error: ${e.message}`);
    }
  }
  console.log("Done seeding agents!");
  process.exit(0);
}

seed();
