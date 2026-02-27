import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { lobsterSkins } from "./drizzle/schema.ts";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const skins = [
  {
    name: "Classic Red",
    slug: "classic-red",
    description: "The original lobster. Bold, classic, and battle-tested.",
    bodyColor: "#cc2200",
    headColor: "#dd3311",
    clawColor: "#ee4422",
    tailColor: "#bb2200",
    eyeColor: "#111111",
    glowColor: null,
    pattern: "solid",
    accessory: "none",
    rarity: "common",
    price: 0,
    isDefault: true,
  },
  {
    name: "Ocean Blue",
    slug: "ocean-blue",
    description: "Camouflaged in the deep blue. Perfect for stealth runs.",
    bodyColor: "#1155cc",
    headColor: "#2266dd",
    clawColor: "#3377ee",
    tailColor: "#0044bb",
    eyeColor: "#88ccff",
    glowColor: "#4488ff",
    pattern: "gradient",
    accessory: "none",
    rarity: "uncommon",
    price: 500,
    isDefault: false,
  },
  {
    name: "Solana Purple",
    slug: "solana-purple",
    description: "Powered by Solana. Glowing with blockchain energy.",
    bodyColor: "#9945ff",
    headColor: "#aa55ff",
    clawColor: "#bb66ff",
    tailColor: "#8833ee",
    eyeColor: "#14F195",
    glowColor: "#9945ff",
    pattern: "cosmic",
    accessory: "antenna",
    rarity: "rare",
    price: 1500,
    isDefault: false,
  },
  {
    name: "Golden King",
    slug: "golden-king",
    description: "The king of the reef. Adorned with a golden crown.",
    bodyColor: "#daa520",
    headColor: "#ffd700",
    clawColor: "#ffcc00",
    tailColor: "#cc9900",
    eyeColor: "#111111",
    glowColor: "#ffd700",
    pattern: "solid",
    accessory: "crown",
    rarity: "epic",
    price: 3000,
    isDefault: false,
  },
  {
    name: "Neon Racer",
    slug: "neon-racer",
    description: "Electric neon stripes for maximum speed vibes.",
    bodyColor: "#00ff88",
    headColor: "#00ffaa",
    clawColor: "#00ffcc",
    tailColor: "#00ff66",
    eyeColor: "#ff00ff",
    glowColor: "#00ff88",
    pattern: "striped",
    accessory: "sunglasses",
    rarity: "rare",
    price: 2000,
    isDefault: false,
  },
  {
    name: "Pirate Captain",
    slug: "pirate-captain",
    description: "Arr! A battle-scarred lobster with a pirate hat.",
    bodyColor: "#8b0000",
    headColor: "#a00000",
    clawColor: "#c00000",
    tailColor: "#700000",
    eyeColor: "#ffcc00",
    glowColor: null,
    pattern: "spotted",
    accessory: "pirate",
    rarity: "uncommon",
    price: 800,
    isDefault: false,
  },
  {
    name: "Phantom Ghost",
    slug: "phantom-ghost",
    description: "Ethereal and translucent. Inspired by Phantom wallet.",
    bodyColor: "#ab9ff2",
    headColor: "#bbb0ff",
    clawColor: "#ccbbff",
    tailColor: "#9988ee",
    eyeColor: "#ffffff",
    glowColor: "#ab9ff2",
    pattern: "cosmic",
    accessory: "cape",
    rarity: "epic",
    price: 4000,
    isDefault: false,
  },
  {
    name: "Lava Lord",
    slug: "lava-lord",
    description: "Forged in volcanic vents. Radiates molten heat.",
    bodyColor: "#ff4400",
    headColor: "#ff6600",
    clawColor: "#ff8800",
    tailColor: "#cc3300",
    eyeColor: "#ffff00",
    glowColor: "#ff4400",
    pattern: "gradient",
    accessory: "tophat",
    rarity: "legendary",
    price: 8000,
    isDefault: false,
  },
];

async function seed() {
  console.log("Seeding lobster skins...");
  for (const skin of skins) {
    try {
      await db.insert(lobsterSkins).values(skin).onConflictDoNothing();
      console.log(`  ✓ ${skin.name} (${skin.rarity})`);
    } catch (e) {
      console.log(`  ✗ ${skin.name}: ${e.message}`);
    }
  }
  console.log("Done!");
  await pool.end();
  process.exit(0);
}

seed();
