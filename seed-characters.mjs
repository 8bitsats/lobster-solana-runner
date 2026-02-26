import { drizzle } from "drizzle-orm/mysql2";
import { gameCharacters } from "./drizzle/schema.ts";
import dotenv from "dotenv";
dotenv.config();

const db = drizzle(process.env.DATABASE_URL);

const characters = [
  {
    name: "Solana Lobster",
    slug: "solana-lobster",
    description: "The Speedster — Red glossy shell with SOLANA cap, blue visor shades, sleeveless Solana jersey, and neon edge glow trail while running. High mobility, high coin yield. Best for leaderboard grinders.",
    role: "Main Runner",
    characterClass: "Agile Collector",
    rarity: "epic",
    faction: "Solana Core",
    spriteUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/102392112/kttHnXDpoKaCpYKM.png",
    primaryColor: "#ff3322",
    secondaryColor: "#1a1aff",
    glowColor: "#9945ff",
    emoji: "🦞",
    abilities: JSON.stringify({
      passive: { name: "Coin Magnet", description: "Automatically attracts nearby Solana coins", icon: "🧲" },
      active: { name: "Claw Dash", description: "Short burst speed boost. Leaves purple-green neon streak.", cooldown: 8, duration: 2, icon: "⚡" },
      ultimate: { name: "Antenna Radar", description: "Highlights all coins and power-ups on screen for 5 seconds.", cooldown: 30, duration: 5, icon: "📡" }
    }),
    speed: 85,
    coinBonus: 80,
    survivability: 50,
    isDefault: true,
  },
  {
    name: "Solana OS Bot",
    slug: "solana-os-bot",
    description: "The Builder — Square head with gradient Solana eyes, compact mechanical limbs, tank-style feet, holographic status panel. Balanced survivability + passive farming.",
    role: "Utility / Support Runner",
    characterClass: "Tech Controller",
    rarity: "legendary",
    faction: "Solana OS",
    spriteUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/102392112/kttHnXDpoKaCpYKM.png",
    primaryColor: "#333344",
    secondaryColor: "#00ffaa",
    glowColor: "#00ccff",
    emoji: "🤖",
    abilities: JSON.stringify({
      passive: { name: "Auto-Optimize", description: "Reduces obstacle speed slightly", icon: "⚙️" },
      active: { name: "RPC Shield", description: "Temporary invincibility bubble.", cooldown: 12, duration: 3, icon: "🛡️" },
      ultimate: { name: "Deploy Agent", description: "Spawns a mini-bot that auto-collects coins ahead.", cooldown: 35, duration: 6, icon: "🤖" }
    }),
    speed: 60,
    coinBonus: 70,
    survivability: 85,
    isDefault: false,
  },
  {
    name: "Hooded Frog",
    slug: "hooded-frog",
    description: "The Hacker — Purple skin, black hoodie, smirk expression, neon sole trail effect. High skill ceiling, high scoring potential. Risk/reward gameplay.",
    role: "Risk/Reward Runner",
    characterClass: "Stealth Runner",
    rarity: "mythic",
    faction: "Darkpool Dev",
    spriteUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/102392112/kttHnXDpoKaCpYKM.png",
    primaryColor: "#9933ff",
    secondaryColor: "#222222",
    glowColor: "#ff00ff",
    emoji: "🐸",
    abilities: JSON.stringify({
      passive: { name: "Shadow Slide", description: "Can pass through one obstacle every few seconds", icon: "👻" },
      active: { name: "Glitch Phase", description: "Temporarily phases through walls and hazards.", cooldown: 10, duration: 2.5, icon: "🌀" },
      ultimate: { name: "Exploit Chain", description: "Multiplies coin value x2 for 4 seconds.", cooldown: 25, duration: 4, icon: "💰" }
    }),
    speed: 75,
    coinBonus: 90,
    survivability: 40,
    isDefault: false,
  },
];

async function seed() {
  for (const char of characters) {
    await db.insert(gameCharacters).values(char).onDuplicateKeyUpdate({ set: { name: char.name } });
    console.log(`Seeded character: ${char.name}`);
  }
  console.log("Done seeding characters!");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
