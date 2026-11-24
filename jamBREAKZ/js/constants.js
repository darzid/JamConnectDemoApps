/**
 * JamBREAKZ // Static Data, Presets, State Factories & Math Helpers
 */

export const MAX_STEPS = 16;
export const SHAPER_SAMPLES = 1025; // Odd sample count guarantees exact 0.0 center (zero DC offset)
export const STORAGE_KEY_PATTERNS = 'jambreakz_user_patterns_v1';
export const STORAGE_KEY_KITS = 'jambreakz_user_kits_v1';

export const DEFAULT_ANALOG_VOICE_PARAMS = {
  pitch: 52,            // Hz (28 - 900)
  wave: 0.18,           // 0 = Sine, 1 = Square
  bendAmt: 4.5,         // Pitch envelope multiplier
  bendDec: 0.055,       // Pitch decay seconds
  ampDec: 0.36,         // VCO amp decay seconds
  noiseLvl: 0.06,       // 0 - 1
  noiseColor: 0.2,      // 0 = Warm/Pink, 1 = Crisp/Blue
  noiseDec: 0.04,       // Noise decay seconds
  click: 0.45,          // Transient click impulse 0 - 1
  cutoff: 1800,         // Filter Hz
  res: 2.2,             // Filter Q
  modDepth: 0.05,       // FM modulation depth
  filterMode: 'lowpass' // 'lowpass' | 'bandpass' | 'highpass'
};

export const VOICE_RECIPES = {
  // Core 6 Kit Voices
  kick: {
    pitch: 52, wave: 0.18, bendAmt: 4.5, bendDec: 0.055, ampDec: 0.36,
    noiseLvl: 0.06, noiseColor: 0.2, noiseDec: 0.04, click: 0.45,
    cutoff: 1800, res: 2.2, modDepth: 0.05, filterMode: 'lowpass'
  },
  snare: {
    pitch: 185, wave: 0.35, bendAmt: 1.8, bendDec: 0.035, ampDec: 0.14,
    noiseLvl: 0.85, noiseColor: 0.72, noiseDec: 0.22, click: 0.6,
    cutoff: 5200, res: 1.8, modDepth: 0.18, filterMode: 'bandpass'
  },
  ghost: {
    pitch: 240, wave: 0.55, bendAmt: 1.3, bendDec: 0.02, ampDec: 0.08,
    noiseLvl: 0.65, noiseColor: 0.8, noiseDec: 0.09, click: 0.85,
    cutoff: 4200, res: 3.4, modDepth: 0.25, filterMode: 'bandpass'
  },
  ch: {
    pitch: 620, wave: 0.95, bendAmt: 0.2, bendDec: 0.015, ampDec: 0.04,
    noiseLvl: 0.95, noiseColor: 0.96, noiseDec: 0.055, click: 0.5,
    cutoff: 7800, res: 2.0, modDepth: 0.65, filterMode: 'highpass'
  },
  oh: {
    pitch: 540, wave: 0.92, bendAmt: 0.15, bendDec: 0.02, ampDec: 0.16,
    noiseLvl: 0.95, noiseColor: 0.92, noiseDec: 0.34, click: 0.35,
    cutoff: 6400, res: 2.4, modDepth: 0.72, filterMode: 'highpass'
  },
  perc: {
    pitch: 145, wave: 0.65, bendAmt: 2.8, bendDec: 0.08, ampDec: 0.22,
    noiseLvl: 0.22, noiseColor: 0.5, noiseDec: 0.08, click: 0.7,
    cutoff: 2600, res: 6.5, modDepth: 0.48, filterMode: 'bandpass'
  },
  // Expanded 6 Breakbeat & Sound-System Voices
  sub808: {
    pitch: 43, wave: 0.06, bendAmt: 3.2, bendDec: 0.042, ampDec: 0.72,
    noiseLvl: 0.02, noiseColor: 0.15, noiseDec: 0.025, click: 0.28,
    cutoff: 950, res: 1.5, modDepth: 0.02, filterMode: 'lowpass'
  },
  junglesnare: {
    pitch: 232, wave: 0.44, bendAmt: 2.1, bendDec: 0.028, ampDec: 0.13,
    noiseLvl: 0.92, noiseColor: 0.82, noiseDec: 0.19, click: 0.78,
    cutoff: 4800, res: 2.6, modDepth: 0.28, filterMode: 'bandpass'
  },
  clap: {
    pitch: 310, wave: 0.7, bendAmt: 0.6, bendDec: 0.02, ampDec: 0.06,
    noiseLvl: 0.98, noiseColor: 0.68, noiseDec: 0.26, click: 0.72,
    cutoff: 2100, res: 3.8, modDepth: 0.35, filterMode: 'bandpass'
  },
  clang: {
    pitch: 390, wave: 0.88, bendAmt: 0.45, bendDec: 0.04, ampDec: 0.32,
    noiseLvl: 0.38, noiseColor: 0.88, noiseDec: 0.16, click: 0.62,
    cutoff: 4600, res: 8.2, modDepth: 0.92, filterMode: 'bandpass'
  },
  zap: {
    pitch: 92, wave: 0.42, bendAmt: 7.4, bendDec: 0.16, ampDec: 0.28,
    noiseLvl: 0.08, noiseColor: 0.4, noiseDec: 0.04, click: 0.55,
    cutoff: 5400, res: 5.4, modDepth: 0.16, filterMode: 'lowpass'
  },
  ride: {
    pitch: 740, wave: 0.98, bendAmt: 0.08, bendDec: 0.02, ampDec: 0.44,
    noiseLvl: 0.82, noiseColor: 0.98, noiseDec: 0.52, click: 0.48,
    cutoff: 7200, res: 3.6, modDepth: 0.88, filterMode: 'highpass'
  }
};

export const TRACK_META = [
  { id: 0, short: 'BD', name: 'KICK', recipe: 'kick', color: '#f59e0b' },
  { id: 1, short: 'SD', name: 'SNARE', recipe: 'snare', color: '#ef4444' },
  { id: 2, short: 'GH', name: 'GHOST', recipe: 'ghost', color: '#fb923c' },
  { id: 3, short: 'CH', name: 'C-HAT', recipe: 'ch', color: '#10b981' },
  { id: 4, short: 'OH', name: 'O-HAT', recipe: 'oh', color: '#06b6d4' },
  { id: 5, short: 'PC', name: 'PERC', recipe: 'perc', color: '#a855f7' }
];

export function createEmptyStep() {
  return {
    active: false,
    velocity: 0.9,
    ratchet: 1,      // 1, 2, 3, or 4 repeats
    pitch: 0,        // semitones (-12..12)
    prob: 100,       // 10..100 %
    micro: 0,        // -35..35 ms
    reverse: false
  };
}

export function createInitialTracks() {
  return TRACK_META.map((meta) => ({
    ...meta,
    voiceParams: { ...(VOICE_RECIPES[meta.recipe] || VOICE_RECIPES.kick) },
    buffer: null,          // Native AudioBuffer (forward)
    reversedBuffer: null,  // Native AudioBuffer (reversed)
    length: 16,            // Polymetric length 1..16
    muted: false,
    solo: false,
    pitch: 0,              // -12..12 semitones
    decay: 1.0,            // 0.08..1.0 multiplier
    reverse: false,
    drive: 0.14,           // 0..1
    crush: 0.0,            // 0..1
    delaySend: 0.0,        // 0..1
    reverbSend: 0.08,      // 0..1
    volume: 0.85,          // 0..1
    steps: Array.from({ length: MAX_STEPS }, createEmptyStep),
    audioNodes: null,
    activeSource: null     // For choke groups (Closed Hat chokes Open Hat)
  }));
}

export function createInitialAppState() {
  return {
    audioReady: false,
    isPlaying: false,
    bpm: 136,
    swing: 0.14,
    activeKit: 'classic',
    masterDelayFb: 0.38,
    masterReverbMix: 0.30,
    masterPunch: 0.45,
    selectedTrack: 0,
    selectedStep: 0,
    seqMode: 'trig',        // 'trig' | 'plock'
    activeTab: 'sequencer', // 'sequencer' | 'voice' | 'fx' | 'fills'
    fillActive: false,
    // Fills Engine state
    fillFilterOn: false,
    fillFilterMode: 'lowpass',
    fillFilterCutoff: 2400,
    fillFilterQ: 2.5,
    fillFilterAutoOn: false,
    fillFilterAutoProgress: 0,
    fillFilterAutoStartSlider: 670,
    allRollHold: false,
    allRollLatch: false,
    allRollRate: 2,         // 1 (1/16), 2 (1/32), 3 (triplet), 4 (1/64)
    fillVerbRunning: false,
    fillVerbProgress: 0,    // 0..1 over 8 beats
    fillVerbMaxWet: 0.75,
    currentStep: -1,
    stepCounter: 0
  };
}

export function sliderToLogFreq(val) {
  const norm = Math.max(0, Math.min(1, val / 1000));
  return 40 * Math.pow(18000 / 40, norm);
}

export function formatHz(hz) {
  return hz >= 1000 ? `${(hz / 1000).toFixed(1)} kHz` : `${Math.round(hz)} Hz`;
}

export const BREAK_PATTERNS = {
  amen: {
    bpm: 164,
    swing: 0.10,
    lengths: [16, 16, 16, 16, 16, 16],
    tracks: [
      [0, { s: 2, v: 0.88 }, { s: 10, v: 0.95 }, { s: 11, v: 0.72, pr: 80 }],
      [4, { s: 12, v: 0.95 }, { s: 14, v: 0.65, r: 2, pr: 70 }],
      [{ s: 7, v: 0.55 }, { s: 9, v: 0.48 }, { s: 15, v: 0.6, r: 2 }],
      [0, 2, 4, 6, 8, 10, 12, { s: 14, r: 2, pr: 75 }],
      [{ s: 6, v: 0.55, pr: 50 }, { s: 14, v: 0.7 }],
      [{ s: 3, p: 4, v: 0.6, pr: 60 }, { s: 13, p: -3, v: 0.7 }]
    ]
  },
  think: {
    bpm: 112,
    swing: 0.22,
    lengths: [16, 16, 16, 16, 16, 16],
    tracks: [
      [0, { s: 3, v: 0.74 }, { s: 8, v: 0.86 }, { s: 10, v: 0.94 }],
      [{ s: 4, v: 0.96 }, { s: 12, v: 0.98 }],
      [{ s: 6, v: 0.52, m: 6 }, { s: 7, v: 0.66 }, { s: 9, v: 0.58, m: 5 }, { s: 15, v: 0.64 }],
      [0, 2, 4, 8, 10, 12, { s: 14, v: 0.78 }],
      [{ s: 6, v: 0.72 }, { s: 14, v: 0.55, pr: 60 }],
      [{ s: 7, p: 5, v: 0.62 }, { s: 11, p: 2, v: 0.7, pr: 85 }, { s: 15, p: 7, v: 0.58 }]
    ]
  },
  apache: {
    bpm: 116,
    swing: 0.12,
    lengths: [16, 16, 16, 16, 16, 16],
    tracks: [
      [0, { s: 6, v: 0.84 }, { s: 10, v: 0.92 }],
      [{ s: 4, v: 0.95 }, { s: 12, v: 0.95 }],
      [{ s: 7, v: 0.54 }, { s: 9, v: 0.62 }, { s: 14, v: 0.5, pr: 75 }, { s: 15, v: 0.66 }],
      [0, { s: 1, v: 0.52 }, 2, { s: 3, v: 0.52 }, 4, 6, 8, { s: 9, v: 0.5 }, 10, 12, 14, { s: 15, v: 0.58 }],
      [{ s: 10, v: 0.68 }],
      [
        { s: 0, p: 5, v: 0.72 }, { s: 2, p: 5, v: 0.58 }, { s: 3, p: 9, v: 0.75 },
        { s: 7, p: 2, v: 0.68 }, { s: 8, p: 5, v: 0.64 }, { s: 11, p: 9, v: 0.78 },
        { s: 13, p: 0, v: 0.7, r: 2 }
      ]
    ]
  },
  liquid: {
    bpm: 174,
    swing: 0.08,
    lengths: [16, 16, 16, 16, 16, 16],
    tracks: [
      [0, { s: 10, v: 0.96 }, { s: 13, v: 0.62, pr: 40 }],
      [{ s: 4, v: 0.95 }, { s: 12, v: 0.96 }],
      [{ s: 6, v: 0.46 }, { s: 7, v: 0.64 }, { s: 9, v: 0.52 }, { s: 14, v: 0.48, pr: 70 }, { s: 15, v: 0.6, r: 2, pr: 55 }],
      [0, 2, 4, 6, 8, 10, 12, 14],
      [{ s: 2, v: 0.5, pr: 60 }, { s: 6, v: 0.62 }, { s: 10, v: 0.52, pr: 60 }, { s: 14, v: 0.68 }],
      [{ s: 3, p: 7, v: 0.48, rev: true }, { s: 11, p: 10, v: 0.55, pr: 65 }]
    ]
  },
  electro: {
    bpm: 136,
    swing: 0.14,
    lengths: [16, 16, 16, 16, 16, 12],
    tracks: [
      [0, { s: 6, v: 0.92 }, { s: 10, v: 0.95 }, { s: 15, v: 0.6, pr: 55 }],
      [4, 12, { s: 15, v: 0.62, r: 3, pr: 65 }],
      [{ s: 7, v: 0.55 }, { s: 9, v: 0.5 }, { s: 14, v: 0.58 }],
      [0, 2, 3, 4, 6, 8, 10, 11, 12, { s: 14, r: 2 }],
      [{ s: 2, v: 0.55, pr: 45 }, { s: 10, v: 0.65 }],
      [{ s: 1, p: 5, v: 0.65 }, { s: 5, p: 0, v: 0.6 }, { s: 9, p: -4, v: 0.72 }]
    ]
  },
  ukg: {
    bpm: 132,
    swing: 0.34,
    lengths: [16, 16, 16, 16, 16, 16],
    tracks: [
      [0, { s: 7, v: 0.85 }, { s: 10, v: 0.92 }],
      [4, 12],
      [{ s: 2, v: 0.52 }, { s: 9, v: 0.58 }, { s: 14, v: 0.64, r: 2 }],
      [2, 6, { s: 9, v: 0.6 }, 10, 14, { s: 15, r: 2, pr: 65 }],
      [{ s: 6, v: 0.65 }],
      [{ s: 3, p: 7, v: 0.55 }, { s: 11, p: 2, v: 0.65, rev: true }]
    ]
  },
  footwork: {
    bpm: 160,
    swing: 0.08,
    lengths: [16, 16, 16, 16, 16, 12],
    tracks: [
      [0, { s: 3, v: 0.92 }, { s: 6, v: 0.95 }, { s: 10, v: 0.88 }, { s: 12, v: 0.82, pr: 75 }],
      [{ s: 12, v: 0.96 }, { s: 14, v: 0.74, r: 3, pr: 80 }],
      [{ s: 2, v: 0.62 }, { s: 5, v: 0.58 }, { s: 8, v: 0.72, r: 2 }, { s: 11, v: 0.64 }, { s: 15, v: 0.7, r: 2 }],
      [0, 4, 8, { s: 10, r: 2, v: 0.72 }, 12, { s: 14, r: 4, v: 0.68, pr: 70 }],
      [{ s: 2, v: 0.65 }, { s: 6, v: 0.65 }, { s: 14, v: 0.72 }],
      [{ s: 0, p: 7, v: 0.75 }, { s: 3, p: 4, v: 0.7 }, { s: 6, p: 0, v: 0.82 }, { s: 9, p: -5, v: 0.68 }]
    ]
  },
  bigbeat: {
    bpm: 128,
    swing: 0.16,
    lengths: [16, 16, 16, 16, 16, 16],
    tracks: [
      [0, { s: 2, v: 0.86 }, { s: 7, v: 0.82 }, { s: 8, v: 0.95 }, { s: 10, v: 0.9 }],
      [{ s: 4, v: 0.98 }, { s: 12, v: 0.98 }, { s: 15, v: 0.76, r: 3, pr: 75 }],
      [{ s: 5, v: 0.52 }, { s: 9, v: 0.6 }, { s: 11, v: 0.56 }, { s: 14, v: 0.7 }],
      [0, 2, 4, 6, 8, 10, 12, 14],
      [{ s: 3, v: 0.72 }, { s: 11, v: 0.76 }, { s: 14, v: 0.64 }],
      [{ s: 6, p: -3, v: 0.8 }, { s: 13, p: 2, v: 0.74 }, { s: 14, p: -5, v: 0.82 }]
    ]
  },
  boombap: {
    bpm: 92,
    swing: 0.36,
    lengths: [16, 16, 16, 16, 16, 16],
    tracks: [
      [0, { s: 3, v: 0.68, m: 7 }, { s: 7, v: 0.82 }, { s: 10, v: 0.94 }, { s: 13, v: 0.62, pr: 65 }],
      [{ s: 4, v: 0.96, m: 9 }, { s: 12, v: 0.98, m: 8 }],
      [{ s: 1, v: 0.44, m: 12 }, { s: 9, v: 0.56, m: 6 }, { s: 15, v: 0.64, m: -5 }],
      [{ s: 0, v: 0.85 }, { s: 2, v: 0.58 }, { s: 4, v: 0.82 }, { s: 6, v: 0.55 }, { s: 8, v: 0.85 }, { s: 10, v: 0.6 }, { s: 12, v: 0.82 }, { s: 14, v: 0.62 }],
      [{ s: 6, v: 0.62, rev: true }, { s: 15, v: 0.7, pr: 80 }],
      [{ s: 2, p: -4, v: 0.58 }, { s: 11, p: 3, v: 0.68, rev: true }]
    ]
  },
  dubstep: {
    bpm: 140,
    swing: 0.24,
    lengths: [16, 16, 16, 14, 16, 12],
    tracks: [
      [0, { s: 5, v: 0.76, pr: 70 }, { s: 11, v: 0.88 }],
      [{ s: 8, v: 1.0 }],
      [{ s: 3, v: 0.55 }, { s: 6, v: 0.48 }, { s: 14, v: 0.68, r: 2, pr: 75 }],
      [0, { s: 2, v: 0.55 }, 4, { s: 6, r: 2, v: 0.62 }, 8, 10, { s: 12, v: 0.7 }],
      [{ s: 4, v: 0.58 }, { s: 12, v: 0.72 }],
      [{ s: 4, p: 7, v: 0.72 }, { s: 9, p: 0, v: 0.64, rev: true }]
    ]
  },
  industrial: {
    bpm: 144,
    swing: 0.06,
    lengths: [16, 16, 16, 12, 16, 14],
    tracks: [
      [0, { s: 3, v: 0.85 }, 6, { s: 10, v: 0.95 }, { s: 14, v: 0.78, pr: 70 }],
      [4, 12, { s: 13, v: 0.55, r: 2, pr: 60 }],
      [{ s: 1, v: 0.6 }, { s: 7, v: 0.68 }, { s: 11, v: 0.55 }, { s: 15, r: 4, v: 0.7 }],
      [0, 2, 4, 6, 8, 10],
      [{ s: 4, v: 0.6 }, { s: 12, v: 0.72 }],
      [{ s: 2, p: -5, v: 0.8 }, { s: 8, p: 3, v: 0.75, r: 2 }]
    ]
  },
  idm: {
    bpm: 170,
    swing: 0.04,
    lengths: [16, 16, 15, 12, 16, 11],
    tracks: [
      [0, { s: 3, v: 0.82 }, { s: 7, v: 0.74, r: 2, pr: 65 }, { s: 10, v: 0.95 }],
      [{ s: 4, v: 0.94 }, { s: 11, v: 0.7, r: 3, pr: 75 }, { s: 12, v: 0.92 }, { s: 15, v: 0.8, r: 4, pr: 60 }],
      [{ s: 2, v: 0.6, r: 2 }, { s: 5, v: 0.52, rev: true }, { s: 8, v: 0.68 }, { s: 13, v: 0.74, r: 3 }],
      [0, 2, { s: 3, r: 3, v: 0.65 }, 6, 8, { s: 9, r: 2, v: 0.7 }, 10],
      [{ s: 5, v: 0.6, rev: true }, { s: 13, v: 0.72, pr: 70 }],
      [
        { s: 0, p: 9, v: 0.72 }, { s: 2, p: -4, v: 0.68, r: 2 },
        { s: 5, p: 5, v: 0.78 }, { s: 7, p: 11, v: 0.64, rev: true },
        { s: 9, p: -7, v: 0.82, r: 3, pr: 80 }
      ]
    ]
  }
};

export const KIT_PRESETS = {
  classic: {
    name: 'Analog Classic',
    recipes: ['kick', 'snare', 'ghost', 'ch', 'oh', 'perc'],
    master: { delayFb: 0.38, reverbMix: 0.30, punch: 0.45 },
    fx: [
      { pitch: 0, decay: 1.0, drive: 0.14, crush: 0.0, delaySend: 0.0, reverbSend: 0.04, volume: 0.88 },
      { pitch: 0, decay: 1.0, drive: 0.16, crush: 0.0, delaySend: 0.06, reverbSend: 0.16, volume: 0.86 },
      { pitch: 0, decay: 0.9, drive: 0.10, crush: 0.0, delaySend: 0.10, reverbSend: 0.14, volume: 0.78 },
      { pitch: 0, decay: 0.85, drive: 0.08, crush: 0.0, delaySend: 0.04, reverbSend: 0.08, volume: 0.76 },
      { pitch: 0, decay: 1.0, drive: 0.08, crush: 0.0, delaySend: 0.12, reverbSend: 0.20, volume: 0.78 },
      { pitch: 0, decay: 0.95, drive: 0.14, crush: 0.0, delaySend: 0.22, reverbSend: 0.18, volume: 0.80 }
    ]
  },
  jungle94: {
    name: '94 Jungle Crunch',
    recipes: ['sub808', 'junglesnare', 'ghost', 'ch', 'ride', 'zap'],
    master: { delayFb: 0.46, reverbMix: 0.26, punch: 0.62 },
    fx: [
      { pitch: 1, decay: 0.82, drive: 0.22, crush: 0.08, delaySend: 0.0, reverbSend: 0.02, volume: 0.90 },
      { pitch: 3, decay: 0.88, drive: 0.28, crush: 0.22, delaySend: 0.08, reverbSend: 0.18, volume: 0.88 },
      { pitch: 4, decay: 0.72, drive: 0.20, crush: 0.24, delaySend: 0.14, reverbSend: 0.14, volume: 0.76 },
      { pitch: 2, decay: 0.68, drive: 0.14, crush: 0.18, delaySend: 0.06, reverbSend: 0.10, volume: 0.74 },
      { pitch: 2, decay: 0.78, drive: 0.16, crush: 0.15, delaySend: 0.15, reverbSend: 0.24, volume: 0.74 },
      { pitch: 0, decay: 0.92, drive: 0.24, crush: 0.12, delaySend: 0.38, reverbSend: 0.22, volume: 0.78 }
    ]
  },
  electro808: {
    name: '808 Electro',
    recipes: ['sub808', 'clap', 'ghost', 'ch', 'oh', 'perc'],
    master: { delayFb: 0.42, reverbMix: 0.28, punch: 0.38 },
    fx: [
      { pitch: 0, decay: 1.0, drive: 0.12, crush: 0.0, delaySend: 0.0, reverbSend: 0.0, volume: 0.92 },
      { pitch: 0, decay: 0.92, drive: 0.18, crush: 0.06, delaySend: 0.08, reverbSend: 0.22, volume: 0.85 },
      { pitch: 2, decay: 0.75, drive: 0.10, crush: 0.0, delaySend: 0.16, reverbSend: 0.12, volume: 0.76 },
      { pitch: 1, decay: 0.70, drive: 0.05, crush: 0.0, delaySend: 0.08, reverbSend: 0.06, volume: 0.76 },
      { pitch: 1, decay: 0.95, drive: 0.06, crush: 0.0, delaySend: 0.14, reverbSend: 0.18, volume: 0.76 },
      { pitch: 3, decay: 0.85, drive: 0.16, crush: 0.0, delaySend: 0.28, reverbSend: 0.16, volume: 0.82 }
    ]
  },
  dustympc: {
    name: 'Dusty Crate 12-Bit',
    recipes: ['kick', 'snare', 'ghost', 'ch', 'oh', 'perc'],
    master: { delayFb: 0.28, reverbMix: 0.18, punch: 0.58 },
    fx: [
      { pitch: -1, decay: 0.74, drive: 0.28, crush: 0.32, delaySend: 0.0, reverbSend: 0.04, volume: 0.90 },
      { pitch: -2, decay: 0.78, drive: 0.26, crush: 0.38, delaySend: 0.04, reverbSend: 0.12, volume: 0.88 },
      { pitch: -1, decay: 0.66, drive: 0.22, crush: 0.36, delaySend: 0.06, reverbSend: 0.10, volume: 0.76 },
      { pitch: -2, decay: 0.62, drive: 0.16, crush: 0.42, delaySend: 0.0, reverbSend: 0.06, volume: 0.74 },
      { pitch: -2, decay: 0.76, drive: 0.18, crush: 0.36, delaySend: 0.08, reverbSend: 0.14, volume: 0.75 },
      { pitch: -3, decay: 0.82, drive: 0.24, crush: 0.34, delaySend: 0.18, reverbSend: 0.14, volume: 0.78 }
    ]
  },
  industrial: {
    name: 'Industrial Glitch',
    recipes: ['kick', 'clap', 'clang', 'ch', 'ride', 'clang'],
    master: { delayFb: 0.52, reverbMix: 0.42, punch: 0.78 },
    fx: [
      { pitch: -2, decay: 0.95, drive: 0.56, crush: 0.24, delaySend: 0.0, reverbSend: 0.08, volume: 0.88 },
      { pitch: -1, decay: 0.90, drive: 0.48, crush: 0.32, delaySend: 0.14, reverbSend: 0.30, volume: 0.84 },
      { pitch: -4, decay: 0.64, drive: 0.42, crush: 0.44, delaySend: 0.24, reverbSend: 0.24, volume: 0.72 },
      { pitch: 3, decay: 0.58, drive: 0.30, crush: 0.35, delaySend: 0.12, reverbSend: 0.14, volume: 0.72 },
      { pitch: -3, decay: 0.84, drive: 0.34, crush: 0.28, delaySend: 0.20, reverbSend: 0.34, volume: 0.70 },
      { pitch: 5, decay: 0.88, drive: 0.46, crush: 0.38, delaySend: 0.34, reverbSend: 0.32, volume: 0.76 }
    ]
  },
  dubsystem: {
    name: 'Dubwise System',
    recipes: ['sub808', 'ghost', 'snare', 'ch', 'oh', 'zap'],
    master: { delayFb: 0.66, reverbMix: 0.46, punch: 0.50 },
    fx: [
      { pitch: -1, decay: 0.96, drive: 0.18, crush: 0.0, delaySend: 0.0, reverbSend: 0.02, volume: 0.92 },
      { pitch: 1, decay: 0.82, drive: 0.20, crush: 0.06, delaySend: 0.44, reverbSend: 0.38, volume: 0.86 },
      { pitch: -2, decay: 0.70, drive: 0.15, crush: 0.08, delaySend: 0.32, reverbSend: 0.28, volume: 0.74 },
      { pitch: 0, decay: 0.68, drive: 0.08, crush: 0.0, delaySend: 0.16, reverbSend: 0.14, volume: 0.74 },
      { pitch: 0, decay: 0.90, drive: 0.10, crush: 0.0, delaySend: 0.28, reverbSend: 0.30, volume: 0.75 },
      { pitch: 0, decay: 0.96, drive: 0.22, crush: 0.04, delaySend: 0.58, reverbSend: 0.42, volume: 0.80 }
    ]
  }
};
