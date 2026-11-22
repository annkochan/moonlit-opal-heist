// The heist simulation: one vault room, its display-case obstacles, the
// thief, two patrolling guards, two sweeping cameras, the loot, the coin
// decoys and the alarm meter. Pure rules, no drawing happens here.

import { ALARM, CAMERA, COIN, FIELD, GUARD, SCORE, THIEF } from './config.js';
import { hasLineOfSight, inCone, pushOutOfObstacles } from './geometry.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_CAUGHT = 'caught';

export const ROOM = { x: 24, y: 84, w: 1232, h: 612 };

// Display cases and shelves. They block movement and sight, which is what
// makes three routes through the room: north corridor, central zigzag
// between the cases, and the wide south hall.
export const OBSTACLES = [
  { x: 210, y: 170, w: 250, h: 30, label: 'case' },
  { x: 210, y: 336, w: 30, h: 190, label: 'shelf' },
  { x: 520, y: 170, w: 30, h: 190, label: 'shelf' },
  { x: 520, y: 452, w: 250, h: 30, label: 'case' },
  { x: 850, y: 170, w: 250, h: 30, label: 'case' },
  { x: 850, y: 336, w: 30, h: 190, label: 'shelf' },
  { x: 1010, y: 452, w: 90, h: 30, label: 'case' },
  { x: 330, y: 560, w: 180, h: 26, label: 'case' },
];

const GUARD_ROUTES = [
  // North guard walks the top and middle of the room.
  [{ x: 300, y: 128 }, { x: 980, y: 128 }, { x: 980, y: 282 }, { x: 300, y: 282 }],
  // South guard walks the wide bottom hall.
  [{ x: 980, y: 632 }, { x: 300, y: 632 }, { x: 300, y: 500 }, { x: 980, y: 500 }],
];

function makeGuard(route, startIndex) {
  const p = route[startIndex];
  return {
    x: p.x, y: p.y, route, target: (startIndex + 1) % route.length,
    facing: 0, pause: 0, mode: 'patrol', investigate: null, investigateTime: 0,
    seesThief: false,
  };
}

function makeCameras() {
  return [
    { x: 640, y: 92, baseAngle: Math.PI / 2, phase: 0, seesThief: false, facing: Math.PI / 2, mount: 'top' },
    { x: 640, y: 688, baseAngle: -Math.PI / 2, phase: Math.PI, seesThief: false, facing: -Math.PI / 2, mount: 'bottom' },
  ];
}

function makeLoot() {
  return {
    opal: { x: 1168, y: 390, taken: false },
    gems: [
      { x: 335, y: 268, taken: false },
      { x: 660, y: 128, taken: false },
      { x: 660, y: 402, taken: false },
      { x: 965, y: 268, taken: false },
      { x: 420, y: 632, taken: false },
    ],
  };
}

export class World {
  constructor() { this.reset(); }

  reset() {
    this.screen = SCREEN_TITLE;
    this.thief = { x: THIEF.startX, y: THIEF.startY, facing: 0, moving: false, sprinting: false, sneaking: false };
    this.guards = [makeGuard(GUARD_ROUTES[0], 0), makeGuard(GUARD_ROUTES[1], 0)];
    this.cameras = makeCameras();
    this.loot = makeLoot();
    this.exit = { x: ROOM.x + 6, y: 392, w: 34, h: 92 };
    this.alarm = 0;
    this.alarmState = 'calm'; // calm | rising | chase
    this.chaseTime = 0;
    this.coinsLeft = COIN.count;
    this.coinDecoy = null; // {x, y, time}
    this.time = 0;
    this.elapsed = 0;
    this.score = 0;
    this.message = '';
    this.events = []; // 'coin' | 'pickup' | 'opal' | 'alarm' | 'win' | 'lose' | 'tick'
  }

  start() { if (this.screen === SCREEN_TITLE) this.screen = SCREEN_PLAY; }

  get hasOpal() { return this.loot.opal.taken; }

  seenByAnyone() { return this.guards.some(g => g.seesThief) || this.cameras.some(c => c.seesThief); }

  throwCoin(x, y) {
    if (this.screen !== SCREEN_PLAY || this.coinsLeft <= 0) return;
    this.coinsLeft -= 1;
    this.coinDecoy = { x, y, time: COIN.distractSeconds };
    this.events.push('coin');
    for (const g of this.guards) {
      if (Math.hypot(g.x - x, g.y - y) <= COIN.attractRadius) {
        g.mode = 'investigate'; g.investigate = { x, y }; g.investigateTime = COIN.distractSeconds;
      }
    }
  }

  /** Advance one fixed step. input: {x, y, sprint, sneak, interact}. */
  step(dt, input) {
    this.events = [];
    if (this.screen !== SCREEN_PLAY) return;
    this.elapsed += dt;
    this.time += dt;

    this.moveThief(dt, input);
    this.updateCameras(dt);
    this.updateGuards(dt);
    this.updateDetection(dt);
    this.updateLoot(input);
    if (this.coinDecoy) { this.coinDecoy.time -= dt; if (this.coinDecoy.time <= 0) this.coinDecoy = null; }

    // Caught: a guard reaches the thief.
    for (const g of this.guards) {
      if (Math.hypot(g.x - this.thief.x, g.y - this.thief.y) < GUARD.catchDistance) {
        this.screen = SCREEN_CAUGHT; this.events.push('lose'); return;
      }
    }
    // Escaped: back at the entrance door carrying the opal.
    if (this.hasOpal && this.thief.x < this.exit.x + this.exit.w + 10 && Math.abs(this.thief.y - this.exit.y) < this.exit.h / 2) {
      const timeBonus = Math.max(0, 240 - Math.floor(this.elapsed)) * SCORE.secondBonus;
      const calmBonus = this.alarm < 60 ? SCORE.calmBonus : 0;
      this.score += SCORE.opal + timeBonus + calmBonus;
      this.screen = SCREEN_WIN; this.events.push('win');
    }
  }

  moveThief(dt, input) {
    const t = this.thief;
    const len = Math.hypot(input.x, input.y);
    t.moving = len > 0;
    t.sprinting = t.moving && input.sprint && !input.sneak;
    t.sneaking = input.sneak;
    if (!t.moving) return;
    const speed = input.sneak ? THIEF.sneakSpeed : input.sprint ? THIEF.sprintSpeed : THIEF.walkSpeed;
    t.x += (input.x / (len || 1)) * speed * dt;
    t.y += (input.y / (len || 1)) * speed * dt;
    t.facing = Math.atan2(input.y, input.x);
    t.x = Math.max(ROOM.x + THIEF.radius, Math.min(ROOM.x + ROOM.w - THIEF.radius, t.x));
    t.y = Math.max(ROOM.y + THIEF.radius, Math.min(ROOM.y + ROOM.h - THIEF.radius, t.y));
    pushOutOfObstacles(t, THIEF.radius, OBSTACLES);
  }

  updateCameras(dt) {
    for (const c of this.cameras) {
      c.phase += dt * CAMERA.sweepSpeed;
      c.facing = c.baseAngle + Math.sin(c.phase) * CAMERA.sweepArc;
    }
  }

  updateGuards(dt) {
    for (const g of this.guards) {
      let target = null, speed = GUARD.patrolSpeed;
      if (this.alarmState === 'chase') { target = this.thief; speed = GUARD.chaseSpeed; g.mode = 'chase'; }
      else if (g.mode === 'investigate' && g.investigate) {
        target = g.investigate; speed = GUARD.investigateSpeed;
        g.investigateTime -= dt;
        if (g.investigateTime <= 0 || Math.hypot(g.x - target.x, g.y - target.y) < 14) { g.mode = 'patrol'; g.investigate = null; }
      }
      if (g.mode === 'patrol') {
        if (g.pause > 0) { g.pause -= dt; continue; }
        target = g.route[g.target];
        if (Math.hypot(g.x - target.x, g.y - target.y) < 8) {
          g.target = (g.target + 1) % g.route.length; g.pause = GUARD.pauseSeconds; continue;
        }
      }
      if (!target) continue;
      const dx = target.x - g.x, dy = target.y - g.y, d = Math.hypot(dx, dy) || 1;
      g.facing = Math.atan2(dy, dx);
      g.x += (dx / d) * Math.min(speed * dt, d);
      g.y += (dy / d) * Math.min(speed * dt, d);
      pushOutOfObstacles(g, GUARD.radius, OBSTACLES);
    }
  }

  updateDetection(dt) {
    const t = this.thief;
    let rate = 0;
    for (const g of this.guards) {
      g.seesThief = inCone(g.x, g.y, g.facing, GUARD.visionHalfAngle, GUARD.visionRange, t.x, t.y)
        && hasLineOfSight(g.x, g.y, t.x, t.y, OBSTACLES);
      if (g.seesThief) rate = Math.max(rate, ALARM.guardRate);
    }
    for (const c of this.cameras) {
      c.seesThief = inCone(c.x, c.y, c.facing, CAMERA.visionHalfAngle, CAMERA.visionRange, t.x, t.y)
        && hasLineOfSight(c.x, c.y, t.x, t.y, OBSTACLES);
      if (c.seesThief) rate = Math.max(rate, ALARM.cameraRate);
    }
    if (this.alarmState === 'chase') {
      this.chaseTime -= dt;
      this.alarm = ALARM.max;
      if (this.chaseTime <= 0) { this.alarmState = 'calm'; this.alarm = ALARM.afterChaseLevel; for (const g of this.guards) g.mode = 'patrol'; }
      return;
    }
    if (rate > 0) {
      let mult = 1;
      if (t.sprinting) mult = ALARM.sprintMultiplier;
      if (t.sneaking) mult = ALARM.sneakMultiplier;
      if (this.hasOpal) mult *= 1.25; // the vault notices the empty pedestal
      this.alarm = Math.min(ALARM.max, this.alarm + rate * mult * dt);
      this.events.push('tick');
      if (this.alarm >= ALARM.max) { this.alarmState = 'chase'; this.chaseTime = ALARM.chaseSeconds; this.events.push('alarm'); }
    } else {
      this.alarm = Math.max(0, this.alarm - ALARM.decayRate * dt);
    }
  }

  updateLoot(input) {
    const t = this.thief;
    for (const gem of this.loot.gems) {
      if (!gem.taken && Math.hypot(gem.x - t.x, gem.y - t.y) < 26) {
        gem.taken = true; this.score += SCORE.gem; this.events.push('pickup');
      }
    }
    const opal = this.loot.opal;
    if (!opal.taken) {
      const near = Math.hypot(opal.x - t.x, opal.y - t.y) < 40;
      this.message = near ? 'Press E to lift the Moonlit Opal' : '';
      if (near && input.interact) { opal.taken = true; this.events.push('opal'); this.message = 'Opal taken! Get back to the entrance door!'; }
    } else if (this.screen === SCREEN_PLAY) {
      this.message = 'Opal taken! Get back to the entrance door!';
    }
  }
}
