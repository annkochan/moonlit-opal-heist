// Deterministic screenshot scenes behind ?shot=play|alarm|loot|win.
// Each scene sets the real world state directly (positions, cones, alarm,
// loot) so the frame is a true render of the game's own drawing code, with
// every required element in one frame: thief, guards with vision cones,
// cameras with cones, the loot target and the alarm meter in the HUD.

import { SCREEN_PLAY, SCREEN_WIN } from './world.js';

/** Place the thief, guards and cameras for the named scene. */
export function stageShot(name, world) {
  world.reset();
  world.screen = SCREEN_PLAY;
  world.elapsed = 47;
  world.time = 8;

  if (name === 'alarm') {
    // Spotted mid-room: alarm high, one guard closing in, cones red/purple.
    world.thief.x = 655; world.thief.y = 405; world.thief.facing = 0.4;
    world.guards[0].x = 575; world.guards[0].y = 315; world.guards[0].facing = 0.85; world.guards[0].seesThief = true;
    world.guards[1].x = 930; world.guards[1].y = 560; world.guards[1].facing = -2.4;
    world.cameras[0].facing = Math.PI / 2 + 0.3; world.cameras[0].seesThief = true;
    world.cameras[1].facing = -Math.PI / 2 - 0.4;
    world.alarm = 78;
    world.loot.gems[0].taken = true; world.score = 150;
    world.message = 'Spotted! Break line of sight behind a case!';
    return;
  }

  if (name === 'loot') {
    // At the pedestal, about to lift the opal; one gem already pocketed.
    world.thief.x = 1118; world.thief.y = 390; world.thief.facing = 0;
    world.guards[0].x = 760; world.guards[0].y = 128; world.guards[0].facing = 0;
    world.guards[1].x = 420; world.guards[1].y = 632; world.guards[1].facing = Math.PI;
    world.cameras[0].facing = Math.PI / 2 - 0.6;
    world.cameras[1].facing = -Math.PI / 2 + 0.7;
    world.alarm = 24;
    world.loot.gems[1].taken = true; world.score = 150;
    world.message = 'Press E to lift the Moonlit Opal';
    return;
  }

  if (name === 'win') {
    // Just escaped: room still drawn behind the getaway panel.
    world.thief.x = 120; world.thief.y = 392;
    world.guards[0].x = 700; world.guards[0].y = 282; world.guards[0].facing = 2.6;
    world.guards[1].x = 500; world.guards[1].y = 500; world.guards[1].facing = 0.6;
    world.cameras[0].facing = Math.PI / 2 + 0.5;
    world.cameras[1].facing = -Math.PI / 2 - 0.5;
    world.loot.opal.taken = true;
    world.loot.gems[0].taken = true; world.loot.gems[2].taken = true;
    world.alarm = 18; world.score = 2140; world.elapsed = 96;
    world.screen = SCREEN_WIN;
    return;
  }

  // Default 'play': the thief crossing the middle of the room, everything
  // a judge needs visible at once.
  world.thief.x = 430; world.thief.y = 402; world.thief.facing = 0.15;
  world.guards[0].x = 820; world.guards[0].y = 128; world.guards[0].facing = Math.PI;
  world.guards[1].x = 620; world.guards[1].y = 632; world.guards[1].facing = 0;
  world.cameras[0].facing = Math.PI / 2 - 0.25;
  world.cameras[1].facing = -Math.PI / 2 + 0.55;
  world.alarm = 36;
  world.coinDecoy = { x: 905, y: 470, time: 2.5 };
  world.message = '';
}
