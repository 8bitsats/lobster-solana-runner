/**
 * SoundManager — Web Audio API synthesizer for game sound effects.
 * No external audio files needed; all sounds are procedurally generated.
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let _muted = false;
let _volume = 0.5;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = _volume;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return { ctx: audioCtx, master: masterGain! };
}

export function setVolume(v: number) {
  _volume = Math.max(0, Math.min(1, v));
  if (masterGain) masterGain.gain.value = _muted ? 0 : _volume;
}

export function setMuted(m: boolean) {
  _muted = m;
  if (masterGain) masterGain.gain.value = m ? 0 : _volume;
}

export function isMuted() { return _muted; }
export function getVolume() { return _volume; }

// ─── COIN PICKUP — bright ascending chime ───
export function playCoinPickup() {
  const { ctx, master } = getCtx();
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = "sine";
  osc1.frequency.setValueAtTime(880, now);
  osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.08);

  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1320, now + 0.05);
  osc2.frequency.exponentialRampToValueAtTime(2640, now + 0.12);

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(master);

  osc1.start(now);
  osc2.start(now + 0.05);
  osc1.stop(now + 0.2);
  osc2.stop(now + 0.2);
}

// ─── COLLISION — low crunch/thud ───
export function playCollision() {
  const { ctx, master } = getCtx();
  const now = ctx.currentTime;

  // Noise burst
  const bufferSize = ctx.sampleRate * 0.15;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  // Low thud
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 400;

  noise.connect(filter);
  osc.connect(gain);
  filter.connect(gain);
  gain.connect(master);

  noise.start(now);
  osc.start(now);
  noise.stop(now + 0.2);
  osc.stop(now + 0.2);
}

// ─── JUMP — whoosh upward ───
export function playJump() {
  const { ctx, master } = getCtx();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.2);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

  osc.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + 0.25);
}

// ─── LANE SWITCH — quick lateral swoosh ───
export function playLaneSwitch() {
  const { ctx, master } = getCtx();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(500, now + 0.06);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

  osc.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + 0.12);
}

// ─── GAME OVER — descending doom tone ───
export function playGameOver() {
  const { ctx, master } = getCtx();
  const now = ctx.currentTime;

  [440, 370, 311, 261].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, now + i * 0.15);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.2);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800 - i * 150;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(now + i * 0.15);
    osc.stop(now + i * 0.15 + 0.25);
  });
}

// ─── GAME START — ascending fanfare ───
export function playGameStart() {
  const { ctx, master } = getCtx();
  const now = ctx.currentTime;

  [261, 330, 392, 523].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.15);

    osc.connect(gain);
    gain.connect(master);
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.2);
  });
}

// ─── AMBIENT UNDERWATER — continuous low drone with bubbles ───
let ambientOsc: OscillatorNode | null = null;
let ambientGain: GainNode | null = null;
let ambientLfo: OscillatorNode | null = null;
let bubbleInterval: ReturnType<typeof setInterval> | null = null;

export function startAmbient() {
  const { ctx, master } = getCtx();

  // Deep ocean drone
  ambientOsc = ctx.createOscillator();
  ambientOsc.type = "sine";
  ambientOsc.frequency.value = 60;

  ambientGain = ctx.createGain();
  ambientGain.gain.value = 0.06;

  // LFO for slow wavering
  ambientLfo = ctx.createOscillator();
  ambientLfo.type = "sine";
  ambientLfo.frequency.value = 0.3;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 8;
  ambientLfo.connect(lfoGain);
  lfoGain.connect(ambientOsc.frequency);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 200;

  ambientOsc.connect(filter);
  filter.connect(ambientGain);
  ambientGain.connect(master);

  ambientOsc.start();
  ambientLfo.start();

  // Random bubble sounds
  bubbleInterval = setInterval(() => {
    if (_muted) return;
    const bCtx = getCtx().ctx;
    const bNow = bCtx.currentTime;
    const bOsc = bCtx.createOscillator();
    bOsc.type = "sine";
    const baseFreq = 400 + Math.random() * 600;
    bOsc.frequency.setValueAtTime(baseFreq, bNow);
    bOsc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, bNow + 0.08);

    const bGain = bCtx.createGain();
    bGain.gain.setValueAtTime(0.03 + Math.random() * 0.03, bNow);
    bGain.gain.exponentialRampToValueAtTime(0.001, bNow + 0.12);

    bOsc.connect(bGain);
    bGain.connect(master);
    bOsc.start(bNow);
    bOsc.stop(bNow + 0.15);
  }, 800 + Math.random() * 1500);
}

export function stopAmbient() {
  try {
    ambientOsc?.stop();
    ambientLfo?.stop();
  } catch {}
  ambientOsc = null;
  ambientGain = null;
  ambientLfo = null;
  if (bubbleInterval) {
    clearInterval(bubbleInterval);
    bubbleInterval = null;
  }
}

// ─── SPEED UP — quick ascending sweep ───
export function playSpeedUp() {
  const { ctx, master } = getCtx();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(500, now);
  filter.frequency.exponentialRampToValueAtTime(3000, now + 0.3);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + 0.4);
}
