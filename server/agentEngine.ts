/**
 * Autonomous Agent Engine
 * Uses LLMs (Grok, OpenAI, Anthropic) to simulate gameplay decisions.
 * Each agent "sees" the game state and decides actions (lane switch, jump, collect).
 */
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";

// ─── Game Simulation Types ───
interface SimObstacle {
  lane: number;
  distance: number;
  type: string;
  height: number;
}

interface SimCoin {
  lane: number;
  distance: number;
}

interface SimPowerUp {
  lane: number;
  distance: number;
  type: "speed_boost" | "shield" | "coin_magnet";
}

interface SimState {
  distance: number;
  score: number;
  coins: number;
  speed: number;
  lane: number; // 0, 1, 2
  playerY: number;
  isJumping: boolean;
  hasShield: boolean;
  magnetActive: boolean;
  speedBoostActive: boolean;
  isAlive: boolean;
  obstacles: SimObstacle[];
  nearbyCoins: SimCoin[];
  nearbyPowerUps: SimPowerUp[];
  chaserDistance: number;
}

type AgentAction = "left" | "right" | "jump" | "none";

interface DecisionLogEntry {
  frame: number;
  distance: number;
  action: AgentAction;
  reasoning: string;
  state: { lane: number; speed: number; obstacles: number };
}

interface GhostFrame {
  distance: number;
  lane: number;
  playerY: number;
}

export interface AgentRunResult {
  score: number;
  distance: number;
  coinsCollected: number;
  survivalTimeMs: number;
  decisionLog: DecisionLogEntry[];
  ghostData: GhostFrame[];
  tokensUsed: number;
}

// ─── LLM Providers ───
async function callXAI(
  systemPrompt: string,
  userPrompt: string,
  modelName: string,
): Promise<{ action: AgentAction; reasoning: string; tokens: number }> {
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.xaiApiKey}`,
      },
      body: JSON.stringify({
        model: modelName || "grok-3-mini-fast",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 100,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "game_action",
            strict: true,
            schema: {
              type: "object",
              properties: {
                action: { type: "string", enum: ["left", "right", "jump", "none"] },
                reasoning: { type: "string" },
              },
              required: ["action", "reasoning"],
              additionalProperties: false,
            },
          },
        },
      }),
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '{"action":"none","reasoning":"fallback"}';
    const parsed = JSON.parse(content);
    const tokens = data.usage?.total_tokens || 0;
    return { action: parsed.action || "none", reasoning: parsed.reasoning || "", tokens };
  } catch {
    return { action: "none", reasoning: "API error", tokens: 0 };
  }
}

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  modelName: string,
): Promise<{ action: AgentAction; reasoning: string; tokens: number }> {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: modelName || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 100,
        response_format: { type: "json_object" },
      }),
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '{"action":"none","reasoning":"fallback"}';
    const parsed = JSON.parse(content);
    const tokens = data.usage?.total_tokens || 0;
    return { action: parsed.action || "none", reasoning: parsed.reasoning || "", tokens };
  } catch {
    return { action: "none", reasoning: "API error", tokens: 0 };
  }
}

async function callAnthropic(systemPrompt: string, userPrompt: string): Promise<{ action: AgentAction; reasoning: string; tokens: number }> {
  // Use the built-in LLM (which routes through the platform)
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt + '\n\nRespond with JSON: {"action": "left"|"right"|"jump"|"none", "reasoning": "brief reason"}' },
      ],
    });
    const rawContent = response.choices?.[0]?.message?.content || '{"action":"none","reasoning":"fallback"}';
    const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
    // Try to parse JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const tokens = response.usage?.total_tokens || 0;
      return { action: parsed.action || "none", reasoning: parsed.reasoning || "", tokens };
    }
    return { action: "none", reasoning: content.slice(0, 100), tokens: 0 };
  } catch {
    return { action: "none", reasoning: "API error", tokens: 0 };
  }
}

// ─── Game Simulation Engine ───
function generateObstacles(distance: number, count: number): SimObstacle[] {
  const obstacles: SimObstacle[] = [];
  const types = ["rock", "coral", "jellyfish", "seaweed"];
  const heights = { rock: 0.9, coral: 1.2, jellyfish: 1.6, seaweed: 1.0 };
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    obstacles.push({
      lane: Math.floor(Math.random() * 3),
      distance: distance + 10 + i * (6 + Math.random() * 6),
      type,
      height: heights[type as keyof typeof heights],
    });
  }
  return obstacles;
}

function generateCoins(distance: number, count: number): SimCoin[] {
  const coins: SimCoin[] = [];
  for (let i = 0; i < count; i++) {
    coins.push({
      lane: Math.floor(Math.random() * 3),
      distance: distance + 5 + i * (4 + Math.random() * 4),
    });
  }
  return coins;
}

function generatePowerUps(distance: number): SimPowerUp[] {
  const types: SimPowerUp["type"][] = ["speed_boost", "shield", "coin_magnet"];
  if (Math.random() < 0.3) {
    return [{
      lane: Math.floor(Math.random() * 3),
      distance: distance + 20 + Math.random() * 30,
      type: types[Math.floor(Math.random() * types.length)],
    }];
  }
  return [];
}

function buildAgentSystemPrompt(personality: string | null, difficulty: string): string {
  const base = `You are an autonomous AI agent playing a 3D underwater lobster runner game.
The game has 3 lanes (0=left, 1=center, 2=right). You must avoid obstacles and collect coins.
You can: move "left", move "right", "jump" over obstacles, or do "none" (stay).
Respond ONLY with JSON: {"action": "left"|"right"|"jump"|"none", "reasoning": "brief reason"}`;

  const difficultyHints: Record<string, string> = {
    cautious: "You play very carefully, always avoiding obstacles even if it means missing coins.",
    balanced: "You balance between collecting coins and avoiding obstacles efficiently.",
    aggressive: "You aggressively chase coins and power-ups, taking calculated risks.",
    reckless: "You go for maximum coins and distance, taking big risks for big rewards.",
  };

  return `${base}\nStrategy: ${difficultyHints[difficulty] || difficultyHints.balanced}\n${personality ? `Personality: ${personality}` : ""}`;
}

function buildStatePrompt(state: SimState): string {
  const nearObs = state.obstacles.filter(o => o.distance - state.distance < 20 && o.distance > state.distance);
  const nearCoins = state.nearbyCoins.filter(c => c.distance - state.distance < 15 && c.distance > state.distance);
  const nearPU = state.nearbyPowerUps.filter(p => p.distance - state.distance < 20 && p.distance > state.distance);

  return `GAME STATE:
Lane: ${state.lane} | Speed: ${state.speed.toFixed(1)} | Distance: ${state.distance} | Score: ${state.score} | Coins: ${state.coins}
Jumping: ${state.isJumping} | Shield: ${state.hasShield} | Magnet: ${state.magnetActive} | SpeedBoost: ${state.speedBoostActive}
Chaser distance behind: ${state.chaserDistance.toFixed(1)}m

OBSTACLES AHEAD (${nearObs.length}):
${nearObs.slice(0, 5).map(o => `  ${o.type} in lane ${o.lane} at +${(o.distance - state.distance).toFixed(0)}m (height: ${o.height})`).join("\n") || "  none nearby"}

COINS AHEAD (${nearCoins.length}):
${nearCoins.slice(0, 5).map(c => `  coin in lane ${c.lane} at +${(c.distance - state.distance).toFixed(0)}m`).join("\n") || "  none nearby"}

POWER-UPS AHEAD (${nearPU.length}):
${nearPU.slice(0, 3).map(p => `  ${p.type} in lane ${p.lane} at +${(p.distance - state.distance).toFixed(0)}m`).join("\n") || "  none nearby"}

Choose your action:`;
}

function hasProviderCredentials(provider: "xai" | "openai" | "anthropic"): boolean {
  if (provider === "xai") return Boolean(ENV.xaiApiKey);
  if (provider === "openai") return Boolean(ENV.openaiApiKey);
  return Boolean(ENV.forgeApiKey || ENV.openaiApiKey);
}

function chooseHeuristicAction(
  state: SimState,
  riskTolerance: number,
  coinPriority: number,
): { action: AgentAction; reasoning: string } {
  const upcomingObstacles = state.obstacles
    .map(o => ({ ...o, delta: o.distance - state.distance }))
    .filter(o => o.delta > 0 && o.delta < 10)
    .sort((a, b) => a.delta - b.delta);

  const immediateInLane = upcomingObstacles.find(o => o.lane === state.lane && o.delta < 6);
  const laneClear = (targetLane: number) => !upcomingObstacles.some(o => o.lane === targetLane && o.delta < 5);

  if (immediateInLane && !state.isJumping) {
    if (state.lane > 0 && laneClear(state.lane - 1)) {
      return { action: "left", reasoning: "Heuristic: dodge immediate obstacle to the left lane." };
    }
    if (state.lane < 2 && laneClear(state.lane + 1)) {
      return { action: "right", reasoning: "Heuristic: dodge immediate obstacle to the right lane." };
    }
    return { action: "jump", reasoning: "Heuristic: jump over immediate obstacle in current lane." };
  }

  const upcomingCoins = state.nearbyCoins
    .map(c => ({ ...c, delta: c.distance - state.distance }))
    .filter(c => c.delta > 0 && c.delta < 12)
    .sort((a, b) => a.delta - b.delta);

  if (coinPriority >= 40 && upcomingCoins.length > 0) {
    const targetCoin = upcomingCoins[0];
    if (targetCoin.lane < state.lane) {
      return { action: "left", reasoning: "Heuristic: shift toward nearest coin." };
    }
    if (targetCoin.lane > state.lane) {
      return { action: "right", reasoning: "Heuristic: shift toward nearest coin." };
    }
  }

  if (
    riskTolerance > 70 &&
    !state.isJumping &&
    upcomingObstacles.some(o => o.lane === state.lane && o.delta < 8)
  ) {
    return { action: "jump", reasoning: "Heuristic: aggressive jump to maintain pace." };
  }

  return { action: "none", reasoning: "Heuristic: hold current line." };
}

// ─── Main Agent Run ───
export async function runAutonomousAgent(config: {
  modelProvider: "xai" | "openai" | "anthropic";
  modelName: string;
  personality: string | null;
  difficulty: string;
  reactionSpeed: number;
  riskTolerance: number;
  coinPriority: number;
}): Promise<AgentRunResult> {
  const systemPrompt = buildAgentSystemPrompt(config.personality, config.difficulty);
  const canUseProvider = hasProviderCredentials(config.modelProvider);

  // Simulation state
  let distance = 0;
  let score = 0;
  let coins = 0;
  let speed = 12;
  let lane = 1;
  let playerY = 0;
  let velocityY = 0;
  let isJumping = false;
  let hasShield = false;
  let magnetActive = false;
  let speedBoostActive = false;
  let isAlive = true;
  let chaserPos = -20;
  let frame = 0;
  let totalTokens = 0;
  let magnetUntilFrame = -1;
  let speedBoostUntilFrame = -1;

  const decisionLog: DecisionLogEntry[] = [];
  const ghostData: GhostFrame[] = [];
  let obstacles = generateObstacles(0, 20);
  let allCoins = generateCoins(0, 30);
  let powerUps = generatePowerUps(0);

  const startTime = Date.now();
  const TICK_DELTA = 0.1; // 100ms per tick
  const LLM_INTERVAL = 5; // Call LLM every 5 ticks (500ms)
  const MAX_FRAMES = 2000; // Max ~200 seconds of gameplay

  let pendingAction: AgentAction = "none";

  while (isAlive && frame < MAX_FRAMES) {
    // Speed increases
    if (frame > magnetUntilFrame) magnetActive = false;
    if (frame > speedBoostUntilFrame) speedBoostActive = false;

    speed = Math.min(28, speed + 0.003);
    const effectiveSpeed = speedBoostActive ? speed * 1.8 : speed;
    const moveZ = effectiveSpeed * TICK_DELTA;
    distance += moveZ;
    score = Math.floor(distance) + coins * 10;

    // Record ghost frame
    if (frame % 2 === 0) {
      ghostData.push({ distance: Math.floor(distance), lane, playerY });
    }

    // Physics
    if (isJumping) {
      velocityY += -32 * TICK_DELTA;
      playerY += velocityY * TICK_DELTA;
      if (playerY <= 0) {
        playerY = 0;
        velocityY = 0;
        isJumping = false;
      }
    }

    // Call LLM for decision
    if (frame % LLM_INTERVAL === 0) {
      const simState: SimState = {
        distance: Math.floor(distance),
        score, coins, speed, lane, playerY, isJumping,
        hasShield, magnetActive, speedBoostActive, isAlive,
        obstacles,
        nearbyCoins: allCoins,
        nearbyPowerUps: powerUps,
        chaserDistance: distance - chaserPos,
      };

      const statePrompt = buildStatePrompt(simState);
      let action: AgentAction = "none";
      let reasoning = "Heuristic fallback";
      let tokens = 0;

      if (canUseProvider) {
        const llmResult = config.modelProvider === "xai"
          ? await callXAI(systemPrompt, statePrompt, config.modelName)
          : config.modelProvider === "openai"
            ? await callOpenAI(systemPrompt, statePrompt, config.modelName)
            : await callAnthropic(systemPrompt, statePrompt);
        action = llmResult.action;
        reasoning = llmResult.reasoning;
        tokens = llmResult.tokens;
      }

      if (!canUseProvider || (tokens === 0 && reasoning === "API error")) {
        const fallback = chooseHeuristicAction(simState, config.riskTolerance, config.coinPriority);
        action = fallback.action;
        reasoning = fallback.reasoning;
      }

      totalTokens += tokens;
      pendingAction = action;

      decisionLog.push({
        frame, distance: Math.floor(distance), action, reasoning,
        state: { lane, speed: Math.round(speed), obstacles: obstacles.filter(o => o.distance - distance < 20 && o.distance > distance).length },
      });
    }

    // Apply action with reaction speed modifier
    const reactionChance = config.reactionSpeed / 100;
    if (Math.random() < reactionChance) {
      switch (pendingAction) {
        case "left": if (lane > 0) lane--; break;
        case "right": if (lane < 2) lane++; break;
        case "jump": if (!isJumping) { velocityY = 14; isJumping = true; } break;
      }
      pendingAction = "none";
    }

    // Collision detection
    for (const obs of obstacles) {
      const obsDist = obs.distance - distance;
      if (obs.lane === lane && Math.abs(obsDist) < 1.2 && playerY < obs.height) {
        if (hasShield) {
          hasShield = false;
          obs.distance = -999; // remove
        } else {
          isAlive = false;
        }
      }
    }

    // Coin collection
    const collectRange = magnetActive ? 3.0 : 1.0;
    for (const coin of allCoins) {
      const coinDist = coin.distance - distance;
      if (Math.abs(coinDist) < collectRange && (coin.lane === lane || (magnetActive && Math.abs(coin.lane - lane) <= 1))) {
        coins++;
        coin.distance = -999; // collected
      }
    }

    // Power-up collection
    for (const pu of powerUps) {
      const puDist = pu.distance - distance;
      if (pu.lane === lane && Math.abs(puDist) < 1.2) {
        switch (pu.type) {
          case "shield": hasShield = true; break;
          case "coin_magnet":
            magnetActive = true;
            magnetUntilFrame = frame + 80; // ~8s
            break;
          case "speed_boost":
            speedBoostActive = true;
            speedBoostUntilFrame = frame + 50; // ~5s
            break;
        }
        pu.distance = -999;
      }
    }

    // Chaser
    chaserPos += (speed * 0.7 + 2) * TICK_DELTA;
    if (chaserPos >= distance - 1) {
      isAlive = false;
    }

    // Generate more obstacles/coins as we progress
    if (frame % 50 === 0) {
      obstacles = [...obstacles.filter(o => o.distance > distance - 5), ...generateObstacles(distance, 10)];
      allCoins = [...allCoins.filter(c => c.distance > distance - 5), ...generateCoins(distance, 15)];
      powerUps = [...powerUps.filter(p => p.distance > distance - 5), ...generatePowerUps(distance)];
    }

    frame++;
  }

  const survivalTimeMs = Date.now() - startTime;
  score = Math.floor(distance) + coins * 10;

  return {
    score,
    distance: Math.floor(distance),
    coinsCollected: coins,
    survivalTimeMs,
    decisionLog,
    ghostData,
    tokensUsed: totalTokens,
  };
}
