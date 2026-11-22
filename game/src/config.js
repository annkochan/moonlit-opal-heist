// All tuning numbers and colours for Moonlit Opal Heist in one place.
// The room is one fixed 1280x720 logical area, scaled by the renderer,
// so no rule depends on the player's actual window size.

export const FIELD = { width: 1280, height: 720, hudHeight: 64 };
export const STEP = 1 / 60;

export const THIEF = {
  radius: 15,
  walkSpeed: 168,
  sprintSpeed: 262,
  sneakSpeed: 96,
  startX: 70,
  startY: 392,
};

export const GUARD = {
  radius: 16,
  patrolSpeed: 80,
  chaseSpeed: 142,
  investigateSpeed: 112,
  pauseSeconds: 0.8,
  visionRange: 196,
  visionHalfAngle: 0.62, // radians, about 71 degrees in total
  catchDistance: 30,
};

export const CAMERA = {
  visionRange: 238,
  visionHalfAngle: 0.48, // about 55 degrees in total
  sweepSpeed: 0.55,
  sweepArc: 0.85,
};

export const ALARM = {
  max: 100,
  guardRate: 40,   // per second while a guard sees the thief
  cameraRate: 31,  // per second while a camera sees the thief
  sprintMultiplier: 1.55,
  sneakMultiplier: 0.45,
  decayRate: 13,   // per second while unseen
  chaseSeconds: 6,
  afterChaseLevel: 52,
};

export const COIN = { count: 3, attractRadius: 340, distractSeconds: 3.2 };

export const SCORE = { opal: 1000, gem: 150, secondBonus: 6, calmBonus: 300 };

export const PALETTE = {
  backdrop: '#0d1017',
  floor: '#232838',
  floorAlt: '#262c40',
  rug: '#3d2b4f',
  wall: '#12151f',
  wallEdge: '#4a5470',
  caseFill: '#31405c',
  caseGlass: '#7fd4ff',
  hud: '#161a26',
  text: '#f2f4f8',
  muted: '#9aa5bb',
  thief: '#ffd94d',
  thiefSuit: '#22242e',
  guard: '#4d7dff',
  guardDark: '#27407f',
  camera: '#c9d4ea',
  cameraCone: 'rgba(150,120,255,',
  guardConeCalm: 'rgba(255,214,90,',
  guardConeAlert: 'rgba(255,80,70,',
  loot: '#7ffce8',
  gem: '#ff8ad8',
  exit: '#69e58a',
  alarm: '#ff5147',
  alarmTrack: '#3a2026',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const BEST_KEY = 'moonlit-opal-heist.best';
