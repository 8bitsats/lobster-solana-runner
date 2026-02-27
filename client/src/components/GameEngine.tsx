import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";
import * as Sound from "./SoundManager";

// ─── GAME CONSTANTS ───
const LANE_COUNT = 3;
const LANE_WIDTH = 2.0;
const SEGMENT_LENGTH = 4.0;
const VISIBLE_SEGMENTS = 30;
const INITIAL_SPEED = 11;
const MAX_SPEED = 26;
const SPEED_INCREMENT = 0.002;
const JUMP_FORCE = 12.5;
const GRAVITY = -28;
const COIN_VALUE = 10;
const SOL_PER_COIN = 0.000005;

// Obstacle types
type ObstacleType = "rock" | "coral" | "jellyfish" | "seaweed";

// Power-up types
type PowerUpType = "speed_boost" | "shield" | "coin_magnet";

interface PowerUp {
  mesh: THREE.Group;
  lane: number;
  zPos: number;
  type: PowerUpType;
  collected: boolean;
}

interface ActivePowerUp {
  type: PowerUpType;
  remaining: number;
  duration: number;
}

interface Obstacle {
  mesh: THREE.Group;
  lane: number;
  zPos: number;
  type: ObstacleType;
  height: number;
}

interface Coin {
  mesh: THREE.Group;
  lane: number;
  zPos: number;
  collected: boolean;
}

// Ghost replay types
interface GhostFrame {
  distance: number;
  lane: number;
  playerY: number;
}

export type MapTheme = "deep_ocean" | "coral_reef" | "volcanic_vent" | "frozen_abyss";

export const MAP_THEMES: Record<MapTheme, { name: string; description: string; colors: { fog: number; floor: number; track: number; trackAlt: number; edge: number; ambient: number; sun: number; caustic1: number; caustic2: number } }> = {
  deep_ocean: {
    name: "Deep Ocean", description: "The classic underwater abyss",
    colors: { fog: 0x082848, floor: 0x143050, track: 0x253a50, trackAlt: 0x1e3345, edge: 0x9945ff, ambient: 0x4477cc, sun: 0xaaddff, caustic1: 0x14F195, caustic2: 0x9945ff },
  },
  coral_reef: {
    name: "Coral Reef", description: "Vibrant shallow waters teeming with life",
    colors: { fog: 0x0a3040, floor: 0x1a3a2a, track: 0x2a3a2a, trackAlt: 0x253525, edge: 0xff6644, ambient: 0x44aa88, sun: 0xffddaa, caustic1: 0x44ff88, caustic2: 0xff8844 },
  },
  volcanic_vent: {
    name: "Volcanic Vent", description: "Scorching deep-sea thermal vents",
    colors: { fog: 0x1a0808, floor: 0x1a0a0a, track: 0x2a1515, trackAlt: 0x251010, edge: 0xff4422, ambient: 0xaa4422, sun: 0xff6644, caustic1: 0xff4400, caustic2: 0xff2200 },
  },
  frozen_abyss: {
    name: "Frozen Abyss", description: "Ice-cold waters beneath the Arctic shelf",
    colors: { fog: 0x081828, floor: 0x0a2030, track: 0x1a3040, trackAlt: 0x152a38, edge: 0x44ccff, ambient: 0x4488cc, sun: 0xaaddff, caustic1: 0x44ddff, caustic2: 0x88aaff },
  },
};

// ─── PARTICLE EFFECT TYPES ───
interface BubbleTrailParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface SparkleParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  rotationSpeed: number;
}

interface ScreenShake {
  intensity: number;
  duration: number;
  elapsed: number;
  active: boolean;
}

interface GameState {
  running: boolean;
  score: number;
  distance: number;
  coins: number;
  solEarned: number;
  speed: number;
  lane: number;
  playerY: number;
  velocityY: number;
  isJumping: boolean;
  isDucking: boolean;
  isAlive: boolean;
  startTime: number;
  survivalTime: number;
  activePowerUps: ActivePowerUp[];
  hasShield: boolean;
  magnetActive: boolean;
  speedBoostActive: boolean;
}

export interface GameCallbacks {
  onScoreUpdate?: (score: number, coins: number, distance: number, solEarned: number, powerUps?: ActivePowerUp[]) => void;
  onGameOver?: (state: { score: number; distance: number; coins: number; solEarned: number; survivalTime: number; ghostFrames?: GhostFrame[] }) => void;
  onGameWin?: (state: { score: number; distance: number; coins: number; solEarned: number; survivalTime: number }) => void;
  onPowerUp?: (type: PowerUpType) => void;
}

export function useGameEngine(canvasRef: React.RefObject<HTMLCanvasElement | null>, callbacks: GameCallbacks) {
  const stateRef = useRef<GameState>({
    running: false, score: 0, distance: 0, coins: 0, solEarned: 0,
    speed: INITIAL_SPEED, lane: 1, playerY: 0, velocityY: 0,
    isJumping: false, isDucking: false, isAlive: true, startTime: 0, survivalTime: 0,
    activePowerUps: [], hasShield: false, magnetActive: false, speedBoostActive: false,
  });
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerRef = useRef<THREE.Group | null>(null);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const trackRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const chaserRef = useRef<THREE.Group | null>(null);
  const chaserPosRef = useRef<number>(-20);
  const nextObstacleZ = useRef<number>(30);
  const nextCoinZ = useRef<number>(15);
  const totalDistRef = useRef<number>(0);
  const bubblesRef = useRef<THREE.Mesh[]>([]);
  const particlesRef = useRef<THREE.Points | null>(null);

  // ─── POWER-UP REFS ───
  const powerUpsRef = useRef<PowerUp[]>([]);
  const nextPowerUpZ = useRef<number>(-50);
  const shieldMeshRef = useRef<THREE.Mesh | null>(null);
  const magnetRingRef = useRef<THREE.Mesh | null>(null);

  // ─── GHOST REPLAY REFS ───
  const ghostFramesRef = useRef<GhostFrame[]>([]);
  const ghostRecordTimer = useRef<number>(0);
  const ghostPlayerRef = useRef<THREE.Group | null>(null);
  const ghostDataRef = useRef<GhostFrame[] | null>(null);
  const ghostIndexRef = useRef<number>(0);

  // ─── MAP THEME REF ───
  const mapThemeRef = useRef<MapTheme>("deep_ocean");

  // ─── PARTICLE EFFECT REFS ───
  const bubbleTrailRef = useRef<BubbleTrailParticle[]>([]);
  const sparklesRef = useRef<SparkleParticle[]>([]);
  const screenShakeRef = useRef<ScreenShake>({ intensity: 0, duration: 0, elapsed: 0, active: false });
  const bubbleTrailTimerRef = useRef<number>(0);
  const bubbleTrailGeoRef = useRef<THREE.SphereGeometry | null>(null);
  const sparkleGeoRef = useRef<THREE.BufferGeometry | null>(null);
  const bubbleTrailMatRef = useRef<THREE.MeshPhongMaterial | null>(null);

  const [gameReady, setGameReady] = useState(false);

  // ─── BUILD LOBSTER CHARACTER ───
  const buildLobster = useCallback((scene: THREE.Scene) => {
    const group = new THREE.Group();

    // Body (main shell)
    const bodyGeo = new THREE.CapsuleGeometry(0.4, 0.8, 8, 12);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0xcc2200, shininess: 80 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    body.position.y = 0.5;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const headMat = new THREE.MeshPhongMaterial({ color: 0xdd3311 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 0.55, 0.6);
    head.castShadow = true;
    group.add(head);

    // Eyes (stalks)
    const eyeStalkGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.25, 6);
    const eyeStalkMat = new THREE.MeshPhongMaterial({ color: 0xdd3311 });
    const eyeGeo = new THREE.SphereGeometry(0.08, 6, 6);
    const eyeMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
    const eyeWhiteMat = new THREE.MeshPhongMaterial({ color: 0xffffff });

    [-0.15, 0.15].forEach(x => {
      const stalk = new THREE.Mesh(eyeStalkGeo, eyeStalkMat);
      stalk.position.set(x, 0.85, 0.65);
      group.add(stalk);
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), eyeWhiteMat);
      eyeWhite.position.set(x, 0.98, 0.68);
      group.add(eyeWhite);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(x, 0.98, 0.73);
      group.add(eye);
    });

    // Claws
    const clawGeo = new THREE.BoxGeometry(0.25, 0.12, 0.4);
    const clawMat = new THREE.MeshPhongMaterial({ color: 0xee4422 });
    [-0.55, 0.55].forEach(x => {
      const claw = new THREE.Mesh(clawGeo, clawMat);
      claw.position.set(x, 0.35, 0.3);
      claw.castShadow = true;
      group.add(claw);
      // Claw pincer (upper)
      const pincerGeo = new THREE.BoxGeometry(0.18, 0.06, 0.2);
      const pincer = new THREE.Mesh(pincerGeo, clawMat);
      pincer.position.set(x, 0.42, 0.5);
      group.add(pincer);
    });

    // Tail segments
    const tailMat = new THREE.MeshPhongMaterial({ color: 0xbb2200 });
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.35 - i * 0.06, 0.15, 6, 8),
        tailMat
      );
      seg.rotation.x = Math.PI / 2;
      seg.position.set(0, 0.45 - i * 0.03, -0.5 - i * 0.2);
      seg.castShadow = true;
      group.add(seg);
    }

    // Tail fan
    const fanGeo = new THREE.CircleGeometry(0.25, 6);
    const fanMat = new THREE.MeshPhongMaterial({ color: 0xdd3311, side: THREE.DoubleSide });
    const fan = new THREE.Mesh(fanGeo, fanMat);
    fan.position.set(0, 0.4, -1.3);
    fan.rotation.x = -Math.PI / 6;
    group.add(fan);

    // Legs (small)
    const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4);
    const legMat = new THREE.MeshPhongMaterial({ color: 0xcc2200 });
    for (let i = 0; i < 4; i++) {
      [-0.25, 0.25].forEach(x => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(x, 0.15, 0.1 - i * 0.2);
        leg.rotation.z = x > 0 ? -0.3 : 0.3;
        group.add(leg);
      });
    }

    group.position.set(0, 0, 0);
    scene.add(group);
    return group;
  }, []);

  // ─── BUILD UNDERWATER ENVIRONMENT ───
  const buildEnvironment = useCallback((scene: THREE.Scene) => {
    // Water fog — lighter density so players can see further
    scene.fog = new THREE.FogExp2(0x082848, 0.012);
    scene.background = new THREE.Color(0x082848);

    // Ambient light (brighter underwater blue-green)
    const ambient = new THREE.AmbientLight(0x4477cc, 1.0);
    scene.add(ambient);

    // Directional light (sun through water — brighter)
    const sun = new THREE.DirectionalLight(0xaaddff, 1.2);
    sun.position.set(-5, 30, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    scene.add(sun);

    // Secondary fill light from the other side
    const fill = new THREE.DirectionalLight(0x6699cc, 0.4);
    fill.position.set(5, 15, -5);
    scene.add(fill);

    // Caustics light (moving green-blue patterns)
    const caustic1 = new THREE.PointLight(0x14F195, 1.5, 30);
    caustic1.position.set(0, 8, 5);
    scene.add(caustic1);

    const caustic2 = new THREE.PointLight(0x9945ff, 1.0, 25);
    caustic2.position.set(3, 6, -5);
    scene.add(caustic2);

    // Ocean floor — lighter
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshPhongMaterial({ color: 0x143050, shininess: 8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Floating particles (plankton/debris)
    const particleCount = 500;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = Math.random() * 15 - 2;
      positions[i * 3 + 2] = Math.random() * 100 - 50;
      const c = Math.random() > 0.5 ? new THREE.Color(0x14F195) : new THREE.Color(0x4488cc);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.08, vertexColors: true, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);
    particlesRef.current = particles;

    // Side coral/rock pillars
    const pillarGeo = new THREE.CylinderGeometry(0.3, 0.6, 8, 6);
    const pillarMats = [
      new THREE.MeshPhongMaterial({ color: 0x553344 }),
      new THREE.MeshPhongMaterial({ color: 0x334455 }),
      new THREE.MeshPhongMaterial({ color: 0x445533 }),
    ];
    for (let i = 0; i < 30; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const pillar = new THREE.Mesh(pillarGeo, pillarMats[i % 3]);
      pillar.position.set(
        side * (4 + Math.random() * 3),
        -2 + Math.random() * 2,
        -i * 8 + Math.random() * 4
      );
      pillar.scale.y = 0.5 + Math.random() * 1.5;
      pillar.castShadow = true;
      scene.add(pillar);
    }

    // Bubbles
    const bubbleGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const bubbleMat = new THREE.MeshPhongMaterial({
      color: 0x88ccff, transparent: true, opacity: 0.4, shininess: 100,
    });
    const bubbles: THREE.Mesh[] = [];
    for (let i = 0; i < 40; i++) {
      const bubble = new THREE.Mesh(bubbleGeo, bubbleMat.clone());
      bubble.position.set(
        (Math.random() - 0.5) * 12,
        Math.random() * 10 - 2,
        Math.random() * 60 - 30
      );
      bubble.scale.setScalar(0.5 + Math.random() * 2);
      scene.add(bubble);
      bubbles.push(bubble);
    }
    bubblesRef.current = bubbles;
  }, []);

  // ─── PARTICLE HELPERS ───
  const initParticleGeometries = useCallback(() => {
    // Shared geometry for bubble trail particles
    bubbleTrailGeoRef.current = new THREE.SphereGeometry(0.06, 6, 6);
    // Shared geometry for sparkle particles (diamond shape)
    const sparkleShape = new THREE.BufferGeometry();
    const sparkleVerts = new Float32Array([
      0, 0.08, 0,  -0.05, 0, 0,  0, -0.08, 0,
      0, 0.08, 0,  0, -0.08, 0,  0.05, 0, 0,
      0, 0, 0.05,  -0.05, 0, 0,  0, 0, -0.05,
      0, 0, 0.05,  0, 0, -0.05,  0.05, 0, 0,
    ]);
    sparkleShape.setAttribute("position", new THREE.BufferAttribute(sparkleVerts, 3));
    sparkleShape.computeVertexNormals();
    sparkleGeoRef.current = sparkleShape;
    // Shared material for bubble trail
    bubbleTrailMatRef.current = new THREE.MeshPhongMaterial({
      color: 0x88ddff, transparent: true, opacity: 0.5,
      shininess: 100, blending: THREE.AdditiveBlending, depthWrite: false,
    });
  }, []);

  const spawnBubbleTrail = useCallback((scene: THREE.Scene, position: THREE.Vector3, count: number = 3) => {
    if (!bubbleTrailGeoRef.current || !bubbleTrailMatRef.current) return;
    for (let i = 0; i < count; i++) {
      const mat = bubbleTrailMatRef.current.clone();
      const bubble = new THREE.Mesh(bubbleTrailGeoRef.current, mat);
      const scale = 0.3 + Math.random() * 0.8;
      bubble.scale.setScalar(scale);
      bubble.position.copy(position);
      bubble.position.x += (Math.random() - 0.5) * 0.4;
      bubble.position.y += Math.random() * 0.2;
      bubble.position.z += 0.3 + Math.random() * 0.5; // behind the lobster
      scene.add(bubble);
      bubbleTrailRef.current.push({
        mesh: bubble,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          1.5 + Math.random() * 2.0,
          (Math.random() - 0.5) * 0.3
        ),
        life: 0,
        maxLife: 0.8 + Math.random() * 1.2,
      });
    }
  }, []);

  const spawnCoinSparkles = useCallback((scene: THREE.Scene, position: THREE.Vector3) => {
    if (!sparkleGeoRef.current) return;
    const sparkleColors = [0xFFD700, 0xFFF8DC, 0x14F195, 0xFFE066, 0xFFFFFF];
    for (let i = 0; i < 12; i++) {
      const color = sparkleColors[Math.floor(Math.random() * sparkleColors.length)];
      const mat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 1.0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      });
      const sparkle = new THREE.Mesh(sparkleGeoRef.current, mat);
      const scale = 0.6 + Math.random() * 1.2;
      sparkle.scale.setScalar(scale);
      sparkle.position.copy(position);
      scene.add(sparkle);
      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.5;
      const upAngle = -0.3 + Math.random() * 1.2;
      const speed = 3 + Math.random() * 4;
      sparklesRef.current.push({
        mesh: sparkle,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(upAngle) * speed + 2,
          Math.sin(angle) * speed
        ),
        life: 0,
        maxLife: 0.4 + Math.random() * 0.5,
        rotationSpeed: (Math.random() - 0.5) * 15,
      });
    }
  }, []);

  const triggerScreenShake = useCallback((intensity: number = 0.3, duration: number = 0.3) => {
    screenShakeRef.current = { intensity, duration, elapsed: 0, active: true };
  }, []);

  const updateParticles = useCallback((scene: THREE.Scene, delta: number) => {
    // Update bubble trail particles
    bubbleTrailRef.current = bubbleTrailRef.current.filter(p => {
      p.life += delta;
      if (p.life >= p.maxLife) {
        scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        return false;
      }
      const t = p.life / p.maxLife;
      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
      // Bubbles float up and slow down
      p.velocity.y *= 0.98;
      p.velocity.x *= 0.95;
      // Fade out and grow slightly
      const mat = p.mesh.material as THREE.MeshPhongMaterial;
      mat.opacity = 0.5 * (1 - t * t);
      p.mesh.scale.setScalar(p.mesh.scale.x * (1 + delta * 0.5));
      // Wobble
      p.mesh.position.x += Math.sin(p.life * 8) * 0.002;
      return true;
    });

    // Update sparkle particles
    sparklesRef.current = sparklesRef.current.filter(p => {
      p.life += delta;
      if (p.life >= p.maxLife) {
        scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        return false;
      }
      const t = p.life / p.maxLife;
      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
      // Gravity on sparkles
      p.velocity.y -= 8 * delta;
      // Spin
      p.mesh.rotation.x += p.rotationSpeed * delta;
      p.mesh.rotation.z += p.rotationSpeed * delta * 0.7;
      // Fade out and shrink
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 1.0 * (1 - t);
      p.mesh.scale.setScalar(p.mesh.scale.x * (1 - delta * 0.8));
      return true;
    });
  }, []);

  const applyScreenShake = useCallback((camera: THREE.PerspectiveCamera, delta: number): void => {
    const shake = screenShakeRef.current;
    if (!shake.active) return;
    shake.elapsed += delta;
    if (shake.elapsed >= shake.duration) {
      shake.active = false;
      return;
    }
    const progress = shake.elapsed / shake.duration;
    const decay = 1 - progress;
    const shakeX = (Math.random() - 0.5) * 2 * shake.intensity * decay;
    const shakeY = (Math.random() - 0.5) * 2 * shake.intensity * decay;
    camera.position.x += shakeX;
    camera.position.y += shakeY;
  }, []);

  const cleanupParticles = useCallback((scene: THREE.Scene) => {
    bubbleTrailRef.current.forEach(p => {
      scene.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
    });
    bubbleTrailRef.current = [];
    sparklesRef.current.forEach(p => {
      scene.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
    });
    sparklesRef.current = [];
    screenShakeRef.current = { intensity: 0, duration: 0, elapsed: 0, active: false };
  }, []);

  // ─── CREATE POWER-UP ───
  const createPowerUp = useCallback((scene: THREE.Scene, lane: number, zPos: number): PowerUp => {
    const group = new THREE.Group();
    const types: PowerUpType[] = ["speed_boost", "shield", "coin_magnet"];
    const type = types[Math.floor(Math.random() * types.length)];

    // Floating base platform
    const baseGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 16);
    const baseMat = new THREE.MeshPhongMaterial({ color: 0x222244, transparent: true, opacity: 0.6 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.6;
    group.add(base);

    switch (type) {
      case "speed_boost": {
        // Lightning bolt shape (yellow)
        const boltGeo = new THREE.ConeGeometry(0.15, 0.5, 4);
        const boltMat = new THREE.MeshPhongMaterial({ color: 0xffdd00, emissive: 0xffaa00, emissiveIntensity: 0.8 });
        const bolt = new THREE.Mesh(boltGeo, boltMat);
        bolt.position.y = 1.0;
        group.add(bolt);
        const glow = new THREE.PointLight(0xffdd00, 1.5, 5);
        glow.position.set(0, 1.0, 0);
        group.add(glow);
        break;
      }
      case "shield": {
        // Blue sphere shield icon
        const shieldGeo = new THREE.SphereGeometry(0.25, 12, 12);
        const shieldMat = new THREE.MeshPhongMaterial({ color: 0x4488ff, emissive: 0x2244aa, emissiveIntensity: 0.6, transparent: true, opacity: 0.8 });
        const shield = new THREE.Mesh(shieldGeo, shieldMat);
        shield.position.y = 1.0;
        group.add(shield);
        const glow = new THREE.PointLight(0x4488ff, 1.5, 5);
        glow.position.set(0, 1.0, 0);
        group.add(glow);
        break;
      }
      case "coin_magnet": {
        // Magnet shape (red horseshoe)
        const magnetGeo = new THREE.TorusGeometry(0.2, 0.06, 8, 16, Math.PI);
        const magnetMat = new THREE.MeshPhongMaterial({ color: 0xff4444, emissive: 0xaa2222, emissiveIntensity: 0.6 });
        const magnet = new THREE.Mesh(magnetGeo, magnetMat);
        magnet.position.y = 1.0;
        magnet.rotation.z = Math.PI;
        group.add(magnet);
        const glow = new THREE.PointLight(0xff4444, 1.5, 5);
        glow.position.set(0, 1.0, 0);
        group.add(glow);
        break;
      }
    }

    // Outer ring indicator
    const ringGeo = new THREE.TorusGeometry(0.4, 0.03, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.8;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    const x = (lane - 1) * LANE_WIDTH;
    group.position.set(x, 0, zPos);
    scene.add(group);
    return { mesh: group, lane, zPos, type, collected: false };
  }, []);

  // ─── BUILD GHOST LOBSTER ───
  const buildGhostLobster = useCallback((scene: THREE.Scene) => {
    const group = new THREE.Group();
    const ghostMat = new THREE.MeshPhongMaterial({ color: 0x88ccff, transparent: true, opacity: 0.3, emissive: 0x4488cc, emissiveIntensity: 0.3 });
    // Simplified ghost body
    const bodyGeo = new THREE.CapsuleGeometry(0.35, 0.7, 6, 8);
    const body = new THREE.Mesh(bodyGeo, ghostMat);
    body.rotation.x = Math.PI / 2;
    body.position.y = 0.5;
    group.add(body);
    const headGeo = new THREE.SphereGeometry(0.25, 6, 6);
    const head = new THREE.Mesh(headGeo, ghostMat);
    head.position.set(0, 0.55, 0.5);
    group.add(head);
    // Ghost claws
    const clawGeo = new THREE.BoxGeometry(0.2, 0.1, 0.3);
    [-0.45, 0.45].forEach(x => {
      const claw = new THREE.Mesh(clawGeo, ghostMat);
      claw.position.set(x, 0.35, 0.2);
      group.add(claw);
    });
    // Tail
    for (let i = 0; i < 3; i++) {
      const seg = new THREE.Mesh(new THREE.CapsuleGeometry(0.3 - i * 0.06, 0.12, 4, 6), ghostMat);
      seg.rotation.x = Math.PI / 2;
      seg.position.set(0, 0.4, -0.4 - i * 0.18);
      group.add(seg);
    }
    group.visible = false;
    scene.add(group);
    return group;
  }, []);

  // ─── BUILD SHIELD VISUAL ───
  const buildShieldVisual = useCallback((scene: THREE.Scene) => {
    const geo = new THREE.SphereGeometry(0.8, 16, 16);
    const mat = new THREE.MeshPhongMaterial({ color: 0x4488ff, transparent: true, opacity: 0.2, emissive: 0x2244aa, emissiveIntensity: 0.4, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  }, []);

  // ─── BUILD MAGNET RING VISUAL ───
  const buildMagnetRing = useCallback((scene: THREE.Scene) => {
    const geo = new THREE.TorusGeometry(1.5, 0.03, 8, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.3 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  }, []);

  // ─── BUILD TRACK ───
  const buildTrack = useCallback((scene: THREE.Scene) => {
    const group = new THREE.Group();

    // Track base (3 lanes)
    const trackMat = new THREE.MeshPhongMaterial({ color: 0x253a50, shininess: 25 });
    const trackAltMat = new THREE.MeshPhongMaterial({ color: 0x1e3345 });
    const edgeMat = new THREE.MeshPhongMaterial({ color: 0xaa55ff, emissive: 0x442288, emissiveIntensity: 0.4 });

    for (let seg = 0; seg < VISIBLE_SEGMENTS * 2; seg++) {
      const z = -seg * SEGMENT_LENGTH;
      for (let lane = 0; lane < LANE_COUNT; lane++) {
        const x = (lane - 1) * LANE_WIDTH;
        const tileGeo = new THREE.BoxGeometry(LANE_WIDTH - 0.05, 0.3, SEGMENT_LENGTH - 0.05);
        const mat = (seg + lane) % 2 === 0 ? trackMat : trackAltMat;
        const tile = new THREE.Mesh(tileGeo, mat);
        tile.position.set(x, -0.15, z);
        tile.receiveShadow = true;
        group.add(tile);
      }

      // Edge glow strips
      if (seg % 3 === 0) {
        [-1, 1].forEach(side => {
          const edgeGeo = new THREE.BoxGeometry(0.08, 0.35, SEGMENT_LENGTH * 0.8);
          const edge = new THREE.Mesh(edgeGeo, edgeMat);
          edge.position.set(side * (LANE_WIDTH * 1.5 + 0.1), -0.1, z);
          group.add(edge);
        });
      }
    }

    // Side walls (transparent coral walls)
    const wallMat = new THREE.MeshPhongMaterial({
      color: 0x223344, transparent: true, opacity: 0.3, side: THREE.DoubleSide,
    });
    [-1, 1].forEach(side => {
      const wallGeo = new THREE.PlaneGeometry(0.1, 5, 1, 1);
      for (let i = 0; i < VISIBLE_SEGMENTS; i++) {
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(side * (LANE_WIDTH * 1.5 + 0.5), 1, -i * SEGMENT_LENGTH);
        wall.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        group.add(wall);
      }
    });

    scene.add(group);
    return group;
  }, []);

  // ─── CREATE OBSTACLE ───
  const createObstacle = useCallback((scene: THREE.Scene, lane: number, zPos: number): Obstacle => {
    const group = new THREE.Group();
    const types: ObstacleType[] = ["rock", "coral", "jellyfish", "seaweed"];
    const type = types[Math.floor(Math.random() * types.length)];
    let height = 1;

    switch (type) {
      case "rock": {
        const geo = new THREE.DodecahedronGeometry(0.6, 1);
        const mat = new THREE.MeshPhongMaterial({ color: 0x445566, flatShading: true });
        const rock = new THREE.Mesh(geo, mat);
        rock.position.y = 0.3;
        rock.castShadow = true;
        group.add(rock);
        height = 0.9;
        break;
      }
      case "coral": {
        const colors = [0xff4466, 0xff6644, 0xee5533, 0xcc3355];
        for (let i = 0; i < 3; i++) {
          const geo = new THREE.ConeGeometry(0.15 + Math.random() * 0.15, 0.8 + Math.random() * 0.6, 5);
          const mat = new THREE.MeshPhongMaterial({ color: colors[Math.floor(Math.random() * colors.length)] });
          const branch = new THREE.Mesh(geo, mat);
          branch.position.set((Math.random() - 0.5) * 0.4, 0.4 + Math.random() * 0.3, (Math.random() - 0.5) * 0.3);
          branch.rotation.z = (Math.random() - 0.5) * 0.4;
          branch.castShadow = true;
          group.add(branch);
        }
        height = 1.2;
        break;
      }
      case "jellyfish": {
        const bellGeo = new THREE.SphereGeometry(0.4, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        const bellMat = new THREE.MeshPhongMaterial({
          color: 0xaa44ff, transparent: true, opacity: 0.7, emissive: 0x6622aa, emissiveIntensity: 0.4,
        });
        const bell = new THREE.Mesh(bellGeo, bellMat);
        bell.position.y = 1.2;
        group.add(bell);
        // Tentacles
        const tentMat = new THREE.MeshPhongMaterial({
          color: 0xbb66ff, transparent: true, opacity: 0.5,
        });
        for (let i = 0; i < 5; i++) {
          const tentGeo = new THREE.CylinderGeometry(0.02, 0.01, 0.8, 4);
          const tent = new THREE.Mesh(tentGeo, tentMat);
          tent.position.set((Math.random() - 0.5) * 0.3, 0.7, (Math.random() - 0.5) * 0.3);
          group.add(tent);
        }
        height = 1.6;
        break;
      }
      case "seaweed": {
        const swMat = new THREE.MeshPhongMaterial({ color: 0x22aa44, side: THREE.DoubleSide });
        for (let i = 0; i < 3; i++) {
          const swGeo = new THREE.PlaneGeometry(0.2, 1.2 + Math.random() * 0.5);
          const sw = new THREE.Mesh(swGeo, swMat);
          sw.position.set((Math.random() - 0.5) * 0.4, 0.6, 0);
          sw.rotation.y = Math.random() * Math.PI;
          sw.rotation.z = (Math.random() - 0.5) * 0.3;
          group.add(sw);
        }
        height = 1.0;
        break;
      }
    }

    const x = (lane - 1) * LANE_WIDTH;
    group.position.set(x, 0, zPos);
    scene.add(group);

    return { mesh: group, lane, zPos, type, height };
  }, []);

  // ─── CREATE COIN ───
  const createCoin = useCallback((scene: THREE.Scene, lane: number, zPos: number): Coin => {
    const group = new THREE.Group();

    // Pearl/coin
    const coinGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const coinMat = new THREE.MeshPhongMaterial({
      color: 0xffd700, emissive: 0x886600, emissiveIntensity: 0.3, shininess: 100,
    });
    const coin = new THREE.Mesh(coinGeo, coinMat);
    coin.position.y = 0.8;
    group.add(coin);

    // Glow ring
    const ringGeo = new THREE.TorusGeometry(0.3, 0.03, 8, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x14F195, transparent: true, opacity: 0.5,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.8;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    const x = (lane - 1) * LANE_WIDTH;
    group.position.set(x, 0, zPos);
    scene.add(group);

    return { mesh: group, lane, zPos, collected: false };
  }, []);

  // ─── BUILD CHASER (Predator fish) ───
  const buildChaser = useCallback((scene: THREE.Scene) => {
    const group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.ConeGeometry(0.6, 2.0, 6);
    const bodyMat = new THREE.MeshPhongMaterial({
      color: 0x220044, emissive: 0x440022, emissiveIntensity: 0.5,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = -Math.PI / 2;
    body.position.y = 0.6;
    group.add(body);

    // Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2244 });
    [-0.25, 0.25].forEach(x => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), eyeMat);
      eye.position.set(x, 0.8, 0.6);
      group.add(eye);
    });

    // Red glow
    const light = new THREE.PointLight(0xff2244, 2, 8);
    light.position.set(0, 0.6, 0);
    group.add(light);

    group.position.set(0, 0, 20);
    group.visible = false;
    scene.add(group);
    return group;
  }, []);

  // ─── INIT ───
  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 200);
    camera.position.set(0, 5, 8);
    camera.lookAt(0, 1, -10);
    cameraRef.current = camera;

    // Build everything
    buildEnvironment(scene);
    trackRef.current = buildTrack(scene);
    playerRef.current = buildLobster(scene);
    chaserRef.current = buildChaser(scene);
    ghostPlayerRef.current = buildGhostLobster(scene);
    shieldMeshRef.current = buildShieldVisual(scene);
    magnetRingRef.current = buildMagnetRing(scene);

    // Initial power-ups
    for (let i = 0; i < 3; i++) {
      const z = -(40 + i * 30 + Math.random() * 15);
      const lane = Math.floor(Math.random() * 3);
      powerUpsRef.current.push(createPowerUp(scene, lane, z));
    }
    nextPowerUpZ.current = -140;

    // Initial obstacles and coins
    for (let i = 0; i < 15; i++) {
      const z = -(20 + i * 8 + Math.random() * 4);
      const lane = Math.floor(Math.random() * 3);
      obstaclesRef.current.push(createObstacle(scene, lane, z));
    }
    for (let i = 0; i < 20; i++) {
      const z = -(10 + i * 6 + Math.random() * 3);
      const lane = Math.floor(Math.random() * 3);
      coinsRef.current.push(createCoin(scene, lane, z));
    }

    nextObstacleZ.current = -150;
    nextCoinZ.current = -140;

    // Initialize particle effect geometries
    initParticleGeometries();

    setGameReady(true);

    // Resize handler
    const handleResize = () => {
      if (!canvas || !renderer || !camera) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    // Render title scene
    const renderTitle = () => {
      if (!stateRef.current.running) {
        const t = performance.now() * 0.001;
        camera.position.set(Math.sin(t * 0.2) * 3, 5 + Math.sin(t * 0.3) * 0.5, 8);
        camera.lookAt(0, 1, -10);

        // Animate bubbles
        bubblesRef.current.forEach((b, i) => {
          b.position.y += 0.01 + i * 0.001;
          if (b.position.y > 10) b.position.y = -2;
        });

        renderer.render(scene, camera);
        animFrameRef.current = requestAnimationFrame(renderTitle);
      }
    };
    renderTitle();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
    };
  }, [canvasRef, buildEnvironment, buildTrack, buildLobster, buildChaser, buildGhostLobster, buildShieldVisual, buildMagnetRing, createObstacle, createCoin, createPowerUp, initParticleGeometries]);

  // ─── GAME LOOP ───
  const gameLoop = useCallback((timestamp: number) => {
    const state = stateRef.current;
    if (!state.running || !state.isAlive) return;

    const delta = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = timestamp;

    const scene = sceneRef.current!;
    const camera = cameraRef.current!;
    const renderer = rendererRef.current!;
    const player = playerRef.current!;
    const chaser = chaserRef.current!;

    // ─── Update power-ups timers ───
    state.activePowerUps = state.activePowerUps.filter(p => {
      p.remaining -= delta;
      if (p.remaining <= 0) {
        if (p.type === "shield") state.hasShield = false;
        if (p.type === "coin_magnet") state.magnetActive = false;
        if (p.type === "speed_boost") state.speedBoostActive = false;
        return false;
      }
      return true;
    });

    // ─── Speed up over time ───
    const baseSpeed = Math.min(MAX_SPEED, state.speed + SPEED_INCREMENT);
    state.speed = baseSpeed;
    const effectiveSpeed = state.speedBoostActive ? state.speed * 1.8 : state.speed;
    const moveZ = effectiveSpeed * delta;
    totalDistRef.current += moveZ;
    state.distance = Math.round(totalDistRef.current * 10) / 10;
    state.score = Math.floor(state.distance) + state.coins * COIN_VALUE;

    // ─── Ghost recording ───
    ghostRecordTimer.current += delta;
    if (ghostRecordTimer.current > 0.1) {
      ghostRecordTimer.current = 0;
      ghostFramesRef.current.push({ distance: state.distance, lane: state.lane, playerY: state.playerY });
    }

    // ─── Ghost playback ───
    if (ghostPlayerRef.current && ghostDataRef.current && ghostDataRef.current.length > 0) {
      ghostPlayerRef.current.visible = true;
      // Find the frame closest to current distance
      while (ghostIndexRef.current < ghostDataRef.current.length - 1 && ghostDataRef.current[ghostIndexRef.current].distance < state.distance) {
        ghostIndexRef.current++;
      }
      const gf = ghostDataRef.current[ghostIndexRef.current];
      if (gf) {
        const gx = (gf.lane - 1) * LANE_WIDTH;
        ghostPlayerRef.current.position.x += (gx - ghostPlayerRef.current.position.x) * 8 * delta;
        ghostPlayerRef.current.position.y = gf.playerY;
        ghostPlayerRef.current.position.z = 3; // behind the player, away from collision zone
      }
    } else if (ghostPlayerRef.current) {
      ghostPlayerRef.current.visible = false;
    }

    // ─── Lane switching ───
    const keys = keysRef.current;
    const targetX = (state.lane - 1) * LANE_WIDTH;
    const lerpSpeed = 12 * delta;

    if (keys.has("left") && state.lane > 0) {
      state.lane--;
      keys.delete("left");
      Sound.playLaneSwitch();
    }
    if (keys.has("right") && state.lane < 2) {
      state.lane++;
      keys.delete("right");
      Sound.playLaneSwitch();
    }

    // ─── Jump ───
    if (keys.has("jump") && !state.isJumping) {
      state.velocityY = JUMP_FORCE;
      state.isJumping = true;
      keys.delete("jump");
      Sound.playJump();
    }

    // ─── Gravity ───
    state.velocityY += GRAVITY * delta;
    state.playerY += state.velocityY * delta;
    if (state.playerY <= 0) {
      state.playerY = 0;
      state.velocityY = 0;
      state.isJumping = false;
    }

    // ─── Move player ───
    const newX = (state.lane - 1) * LANE_WIDTH;
    player.position.x += (newX - player.position.x) * lerpSpeed;
    player.position.y = state.playerY;

    // Bob animation when running
    const t = timestamp * 0.001;
    const bob = Math.sin(t * 12) * 0.04;
    player.position.y += bob;

    // Leg animation
    player.children.forEach((child, i) => {
      if (i > 10 && child instanceof THREE.Mesh) {
        child.rotation.x = Math.sin(t * 14 + i) * 0.4;
      }
    });

    // Claw animation
    if (player.children[5] instanceof THREE.Mesh) {
      player.children[5].rotation.z = Math.sin(t * 3) * 0.15;
    }
    if (player.children[7] instanceof THREE.Mesh) {
      player.children[7].rotation.z = -Math.sin(t * 3) * 0.15;
    }

    // ─── Bubble Trail ───
    bubbleTrailTimerRef.current += delta;
    if (bubbleTrailTimerRef.current > 0.06) {
      bubbleTrailTimerRef.current = 0;
      const trailPos = player.position.clone();
      trailPos.y += 0.3;
      spawnBubbleTrail(scene, trailPos, state.speed > 20 ? 4 : 2);
    }

    // ─── Move track ───
    if (trackRef.current) {
      trackRef.current.position.z += moveZ;
      if (trackRef.current.position.z > SEGMENT_LENGTH * VISIBLE_SEGMENTS) {
        trackRef.current.position.z -= SEGMENT_LENGTH * VISIBLE_SEGMENTS;
      }
    }

    // ─── Move obstacles ───
    obstaclesRef.current.forEach(obs => {
      obs.mesh.position.z += moveZ;
      // Animate jellyfish
      if (obs.type === "jellyfish") {
        obs.mesh.position.y = Math.sin(t * 2 + obs.zPos) * 0.3;
      }
      // Animate seaweed
      if (obs.type === "seaweed") {
        obs.mesh.children.forEach((c, i) => {
          c.rotation.z = Math.sin(t * 1.5 + i) * 0.2;
        });
      }
    });

    // Remove passed obstacles, add new ones
    obstaclesRef.current = obstaclesRef.current.filter(obs => {
      if (obs.mesh.position.z > 10) {
        scene.remove(obs.mesh);
        return false;
      }
      return true;
    });

    while (obstaclesRef.current.length < 15) {
      const z = nextObstacleZ.current;
      const lane = Math.floor(Math.random() * 3);
      obstaclesRef.current.push(createObstacle(scene, lane, z));
      nextObstacleZ.current -= (8 + Math.random() * 6);
    }

    // ─── Move coins ───
    coinsRef.current.forEach(coin => {
      coin.mesh.position.z += moveZ;
      // Spin
      coin.mesh.children[0].rotation.y += 2 * delta;
      coin.mesh.children[1].rotation.z += 1.5 * delta;
    });

    coinsRef.current = coinsRef.current.filter(coin => {
      if (coin.mesh.position.z > 10) {
        scene.remove(coin.mesh);
        return false;
      }
      return true;
    });

    while (coinsRef.current.length < 20) {
      const z = nextCoinZ.current;
      const lane = Math.floor(Math.random() * 3);
      coinsRef.current.push(createCoin(scene, lane, z));
      nextCoinZ.current -= (4 + Math.random() * 4);
    }

    // ─── Move power-ups ───
    powerUpsRef.current.forEach(pu => {
      pu.mesh.position.z += moveZ;
      // Rotate and bob
      const t2 = timestamp * 0.001;
      pu.mesh.children.forEach((c, i) => {
        if (i > 0 && i < pu.mesh.children.length - 1) c.rotation.y += 2 * delta;
      });
      pu.mesh.position.y = Math.sin(t2 * 2 + pu.zPos) * 0.15;
    });
    powerUpsRef.current = powerUpsRef.current.filter(pu => {
      if (pu.mesh.position.z > 10) { scene.remove(pu.mesh); return false; }
      return true;
    });
    // Spawn new power-ups
    while (powerUpsRef.current.length < 3) {
      const z = nextPowerUpZ.current;
      const lane = Math.floor(Math.random() * 3);
      powerUpsRef.current.push(createPowerUp(scene, lane, z));
      nextPowerUpZ.current -= (25 + Math.random() * 25);
    }

    // ─── Shield visual ───
    if (shieldMeshRef.current && playerRef.current) {
      shieldMeshRef.current.visible = state.hasShield;
      if (state.hasShield) {
        shieldMeshRef.current.position.copy(playerRef.current.position);
        shieldMeshRef.current.position.y += 0.5;
        const shieldMat = shieldMeshRef.current.material as THREE.MeshPhongMaterial;
        shieldMat.opacity = 0.15 + Math.sin(timestamp * 0.005) * 0.1;
      }
    }
    // ─── Magnet ring visual ───
    if (magnetRingRef.current && playerRef.current) {
      magnetRingRef.current.visible = state.magnetActive;
      if (state.magnetActive) {
        magnetRingRef.current.position.copy(playerRef.current.position);
        magnetRingRef.current.position.y += 0.5;
        magnetRingRef.current.rotation.z += 2 * delta;
        const scale = 1.0 + Math.sin(timestamp * 0.008) * 0.2;
        magnetRingRef.current.scale.setScalar(scale);
      }
    }

    // ─── Coin magnet attraction ───
    if (state.magnetActive) {
      for (const coin of coinsRef.current) {
        if (!coin.collected) {
          const dx = player.position.x - coin.mesh.position.x;
          const dz = -coin.mesh.position.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < 6) {
            coin.mesh.position.x += dx * 3 * delta;
            coin.mesh.position.z += dz * 3 * delta;
          }
        }
      }
    }

    // ─── Collision detection ───
    const playerLane = state.lane;
    const playerZ = 0; // player is always at z=0 relative

    // Power-up collection
    for (const pu of powerUpsRef.current) {
      if (!pu.collected && pu.lane === playerLane && Math.abs(pu.mesh.position.z) < 1.5) {
        pu.collected = true;
        pu.mesh.visible = false;
        // Activate power-up
        const durations: Record<PowerUpType, number> = { speed_boost: 5, shield: 999, coin_magnet: 8 };
        const dur = durations[pu.type];
        state.activePowerUps.push({ type: pu.type, remaining: dur, duration: dur });
        if (pu.type === "shield") state.hasShield = true;
        if (pu.type === "coin_magnet") state.magnetActive = true;
        if (pu.type === "speed_boost") state.speedBoostActive = true;
        callbacks.onPowerUp?.(pu.type);
        // Sparkle effect
        spawnCoinSparkles(scene, pu.mesh.position.clone());
        Sound.playCoinPickup();
      }
    }

    // Obstacles — tighter collision box for fair gameplay
    for (const obs of obstaclesRef.current) {
      const obsZ = obs.mesh.position.z;
      if (obs.lane === playerLane && Math.abs(obsZ) < 0.9 && state.playerY < obs.height * 0.85) {
        if (state.hasShield) {
          // Shield absorbs hit
          state.hasShield = false;
          state.activePowerUps = state.activePowerUps.filter(p => p.type !== "shield");
          triggerScreenShake(0.3, 0.2);
          Sound.playCollision();
          spawnBubbleTrail(scene, obs.mesh.position.clone(), 10);
          // Remove the obstacle
          scene.remove(obs.mesh);
          obs.mesh.position.z = 999;
          continue;
        }
        // Hit! Screen shake + collision effects
        triggerScreenShake(0.5, 0.4);
        Sound.playCollision();
        Sound.playGameOver();
        Sound.stopAmbient();
        // Spawn impact bubbles at collision point
        spawnBubbleTrail(scene, obs.mesh.position.clone(), 15);
        state.isAlive = false;
        state.survivalTime = (performance.now() - state.startTime) / 1000;
        callbacks.onGameOver?.({
          score: state.score, distance: state.distance,
          coins: state.coins, solEarned: state.solEarned,
          survivalTime: state.survivalTime,
          ghostFrames: ghostFramesRef.current,
        });
        return;
      }
    }

    // Coins
    const coinCollectRange = state.magnetActive ? 2.0 : 1.0;
    for (const coin of coinsRef.current) {
      if (!coin.collected) {
        const dx = Math.abs(coin.mesh.position.x - player.position.x);
        const dz = Math.abs(coin.mesh.position.z);
        if ((coin.lane === playerLane && dz < 1.0) || (state.magnetActive && dx < 2.0 && dz < 2.0)) {
          coin.collected = true;
          coin.mesh.visible = false;
          state.coins++;
          state.solEarned = state.coins * SOL_PER_COIN;
          Sound.playCoinPickup();
          // Spawn sparkle burst at coin position
          spawnCoinSparkles(scene, coin.mesh.position.clone());
        }
      }
    }

    // ─── Chaser ───
    chaser.visible = true;
    chaserPosRef.current += (state.speed * 0.7 + 2) * delta;
    const chaserZ = 20 - chaserPosRef.current;
    chaser.position.set(
      Math.sin(t * 2) * 0.5,
      0.6 + Math.sin(t * 3) * 0.2,
      Math.max(chaserZ, 3)
    );
    chaser.rotation.y = Math.sin(t * 4) * 0.1;

    // Chaser catches player
    if (chaserZ <= 1) {
      triggerScreenShake(0.7, 0.5);
      Sound.playCollision();
      Sound.playGameOver();
      Sound.stopAmbient();
      state.isAlive = false;
      state.survivalTime = (performance.now() - state.startTime) / 1000;
      callbacks.onGameOver?.({
        score: state.score, distance: state.distance,
        coins: state.coins, solEarned: state.solEarned,
        survivalTime: state.survivalTime,
        ghostFrames: ghostFramesRef.current,
      });
      return;
    }

    // ─── Camera follow — smooth cinematic ───
    const camTarget = new THREE.Vector3(player.position.x * 0.25, 3.8 + state.playerY * 0.4, 6.5);
    camera.position.lerp(camTarget, 0.07);
    camera.lookAt(player.position.x * 0.4, 1.2 + state.playerY * 0.25, -12);

    // ─── Screen Shake ───
    applyScreenShake(camera, delta);

    // ─── Update Particle Effects ───
    updateParticles(scene, delta);

    // ─── Animate environment ───
    bubblesRef.current.forEach((b, i) => {
      b.position.y += (0.01 + i * 0.001) * state.speed * 0.1;
      b.position.z += moveZ * 0.3;
      if (b.position.y > 10) { b.position.y = -2; b.position.z = Math.random() * 60 - 30; }
    });

    if (particlesRef.current) {
      const pos = particlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i);
        y += Math.sin(t + i) * 0.005;
        if (y > 15) y = -2;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    // ─── HUD callback ───
    callbacks.onScoreUpdate?.(state.score, state.coins, state.distance, state.solEarned, state.activePowerUps);

    // ─── Render ───
    renderer.render(scene, camera);
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [callbacks, createObstacle, createCoin, createPowerUp, spawnBubbleTrail, spawnCoinSparkles, triggerScreenShake, applyScreenShake, updateParticles]);

  // ─── START GAME ───
  const startGame = useCallback(() => {
    const state = stateRef.current;
    state.running = true;
    state.isAlive = true;
    state.score = 0;
    state.distance = 0;
    state.coins = 0;
    state.solEarned = 0;
    state.speed = INITIAL_SPEED;
    state.lane = 1;
    state.playerY = 0;
    state.velocityY = 0;
    state.isJumping = false;
    state.isDucking = false;
    state.startTime = performance.now();
    state.activePowerUps = [];
    state.hasShield = false;
    state.magnetActive = false;
    state.speedBoostActive = false;
    totalDistRef.current = 0;
    chaserPosRef.current = -20;

    // Reset ghost recording
    ghostFramesRef.current = [];
    ghostRecordTimer.current = 0;
    ghostIndexRef.current = 0;

    // Hide ghost and shield visuals
    if (ghostPlayerRef.current) ghostPlayerRef.current.visible = false;
    if (shieldMeshRef.current) shieldMeshRef.current.visible = false;
    if (magnetRingRef.current) magnetRingRef.current.visible = false;

    if (playerRef.current) {
      playerRef.current.position.set(0, 0, 0);
      playerRef.current.rotation.set(0, 0, 0);
      playerRef.current.visible = true;
    }

    if (chaserRef.current) {
      chaserRef.current.visible = false;
    }

    // Clean up any leftover particles from previous game
    if (sceneRef.current) cleanupParticles(sceneRef.current);
    bubbleTrailTimerRef.current = 0;

    cancelAnimationFrame(animFrameRef.current);
    lastTimeRef.current = performance.now();
    Sound.playGameStart();
    Sound.startAmbient();
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop, cleanupParticles]);

  // ─── STOP GAME ───
  const stopGame = useCallback(() => {
    stateRef.current.running = false;
    cancelAnimationFrame(animFrameRef.current);
    Sound.stopAmbient();
    // Clean up particles
    if (sceneRef.current) cleanupParticles(sceneRef.current);

    // Restart title animation
    const renderTitle = () => {
      if (!stateRef.current.running && rendererRef.current && sceneRef.current && cameraRef.current) {
        const t = performance.now() * 0.001;
        cameraRef.current.position.set(Math.sin(t * 0.2) * 3, 5 + Math.sin(t * 0.3) * 0.5, 8);
        cameraRef.current.lookAt(0, 1, -10);
        bubblesRef.current.forEach((b, i) => {
          b.position.y += 0.01 + i * 0.001;
          if (b.position.y > 10) b.position.y = -2;
        });
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        animFrameRef.current = requestAnimationFrame(renderTitle);
      }
    };
    renderTitle();
  }, [cleanupParticles]);

  // ─── INPUT HANDLING ───
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!stateRef.current.running) return;
      if (e.code === "ArrowLeft" || e.code === "KeyA") { keysRef.current.add("left"); e.preventDefault(); }
      if (e.code === "ArrowRight" || e.code === "KeyD") { keysRef.current.add("right"); e.preventDefault(); }
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") { keysRef.current.add("jump"); e.preventDefault(); }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") keysRef.current.delete("left");
      if (e.code === "ArrowRight" || e.code === "KeyD") keysRef.current.delete("right");
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") keysRef.current.delete("jump");
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Touch handling for mobile
  const handleTouchLeft = useCallback(() => { keysRef.current.add("left"); setTimeout(() => keysRef.current.delete("left"), 100); }, []);
  const handleTouchRight = useCallback(() => { keysRef.current.add("right"); setTimeout(() => keysRef.current.delete("right"), 100); }, []);
  const handleTouchJump = useCallback(() => { keysRef.current.add("jump"); setTimeout(() => keysRef.current.delete("jump"), 100); }, []);

  // Swipe handling
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (!stateRef.current.running) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 30) handleTouchRight();
        else if (dx < -30) handleTouchLeft();
      } else {
        if (dy < -30) handleTouchJump();
      }
    };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: true });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, [canvasRef, handleTouchLeft, handleTouchRight, handleTouchJump]);

  return {
    init, startGame, stopGame, gameReady,
    handleTouchLeft, handleTouchRight, handleTouchJump,
    getState: () => stateRef.current,
    getChaserProgress: () => Math.max(0, Math.min(1, 1 - (20 - chaserPosRef.current) / 20)),
    setGhostData: (data: GhostFrame[] | null) => { ghostDataRef.current = data; },
    setMapTheme: (theme: MapTheme) => { mapThemeRef.current = theme; },
  };
}
