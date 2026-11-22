// Entry point: canvas setup, the fixed-step game loop, input wiring,
// sound triggers, screenshot scenes (?shot=...) and the aria status line.

import { BEST_KEY, FIELD, STEP } from './config.js';
import { Input } from './input.js';
import { SoundEffects } from './audio.js';
import { World, SCREEN_PLAY, SCREEN_TITLE } from './world.js';
import { draw } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
canvas.width = FIELD.width;
canvas.height = FIELD.height;

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');

const world = new World();
const sfx = new SoundEffects();
let best = 0;
try { best = Number(localStorage.getItem(BEST_KEY) || 0) || 0; } catch { best = 0; }

function toLogical(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((clientX - r.left) / r.width) * FIELD.width,
    y: ((clientY - r.top) / r.height) * FIELD.height,
  };
}

const input = new Input(canvas, toLogical);

if (shotName) {
  stageShot(shotName, world);
  draw(ctx, world, best);
  status.textContent = `Moonlit Opal Heist screenshot scene: ${shotName}`;
} else {
  let last = performance.now();
  let acc = 0;
  let lastStatus = '';

  function frame(now) {
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    while (acc >= STEP) {
      acc -= STEP;
      if (input.confirm && world.screen === SCREEN_TITLE) { sfx.unlock(); world.start(); }
      if (input.restart && world.screen !== SCREEN_TITLE) { const s = world.screen; world.reset(); world.screen = SCREEN_PLAY; void s; }
      for (const click of input.takeClicks()) {
        sfx.unlock();
        if (world.screen === SCREEN_TITLE) world.start();
        else world.throwCoin(click.x, click.y);
      }
      const axis = input.axis();
      world.step(STEP, { x: axis.x, y: axis.y, sprint: input.sprint, sneak: input.sneak, interact: input.interact });
      for (const ev of world.events) {
        if (ev === 'coin') sfx.coin();
        else if (ev === 'pickup') sfx.pickup();
        else if (ev === 'opal') sfx.opal();
        else if (ev === 'alarm') sfx.alarm();
        else if (ev === 'tick') sfx.spottedTick(STEP);
        else if (ev === 'win') { sfx.win(); if (world.score > best) { best = world.score; try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* private mode */ } } }
        else if (ev === 'lose') sfx.lose();
      }
      input.endFrame();
    }
    draw(ctx, world, best);
    const text = world.screen === SCREEN_PLAY
      ? `Alarm ${Math.floor(world.alarm)} percent. ${world.hasOpal ? 'Opal taken, reach the exit.' : 'Reach the opal at the far side.'}`
      : `Moonlit Opal Heist: ${world.screen}`;
    if (text !== lastStatus) { status.textContent = text; lastStatus = text; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
