// All drawing for Moonlit Opal Heist: the HUD (with the alarm meter), the
// vault room, vision cones raycast against the display cases, the thief,
// guards, cameras, loot, and the title / escaped / caught overlays. The
// room stays visible under every overlay, so any frame shows the heist.

import { ALARM, CAMERA, FIELD, FONT, GUARD, PALETTE } from './config.js';
import { OBSTACLES, ROOM, SCREEN_CAUGHT, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './world.js';
import { raycastDistance } from './geometry.js';

function conePath(ctx, x, y, facing, halfAngle, range) {
  const steps = 22;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i <= steps; i += 1) {
    const a = facing - halfAngle + (2 * halfAngle * i) / steps;
    const d = raycastDistance(x, y, a, range, OBSTACLES, ROOM);
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath();
}

function drawCone(ctx, x, y, facing, halfAngle, range, colourPrefix, alpha) {
  conePath(ctx, x, y, facing, halfAngle, range);
  ctx.fillStyle = `${colourPrefix}${alpha})`;
  ctx.fill();
}

function drawThief(ctx, t, time) {
  const bob = t.moving ? Math.sin(time * 14) * 2 : 0;
  ctx.save();
  ctx.translate(t.x, t.y + bob * 0.3);
  // suit
  ctx.fillStyle = PALETTE.thiefSuit;
  ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = PALETTE.thief; ctx.lineWidth = 3; ctx.stroke();
  // face and mask stripe, turned toward facing
  ctx.rotate(t.facing);
  ctx.fillStyle = '#f4c99a';
  ctx.beginPath(); ctx.arc(3, 0, 8.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.thiefSuit;
  ctx.fillRect(4, -8.5, 6, 17);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(7, -3.4, 1.7, 0, Math.PI * 2); ctx.arc(7, 3.4, 1.7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (t.sneaking) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(t.x, t.y, 21, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
}

function drawGuard(ctx, g, time) {
  drawCone(ctx, g.x, g.y, g.facing, 0.62, 196,
    g.seesThief || g.mode === 'chase' ? PALETTE.guardConeAlert : PALETTE.guardConeCalm,
    g.seesThief ? 0.34 : 0.2);
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.fillStyle = PALETTE.guard;
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#dce8ff'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.rotate(g.facing);
  // cap brim and face
  ctx.fillStyle = PALETTE.guardDark;
  ctx.beginPath(); ctx.arc(2, 0, 10, -1.2, 1.2); ctx.lineTo(14, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f4c99a';
  ctx.beginPath(); ctx.arc(5, 0, 7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (g.seesThief || g.mode === 'chase') {
    ctx.fillStyle = '#ff5147';
    ctx.font = `bold 26px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('!', g.x, g.y - 24 - Math.abs(Math.sin(time * 6)) * 3);
  }
}

function drawCamera(ctx, c) {
  drawCone(ctx, c.x, c.y, c.facing, CAMERA.visionHalfAngle, CAMERA.visionRange, PALETTE.cameraCone, c.seesThief ? 0.3 : 0.16);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.fillStyle = PALETTE.camera;
  ctx.fillRect(-11, -7, 22, 14);
  ctx.strokeStyle = '#5a6580'; ctx.lineWidth = 2; ctx.strokeRect(-11, -7, 22, 14);
  ctx.rotate(c.facing);
  ctx.fillStyle = c.seesThief ? '#ff5147' : '#20242e';
  ctx.beginPath(); ctx.arc(10, 0, 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#ff5147';
  ctx.beginPath(); ctx.arc(c.x + 7, c.y - 10, 2.6, 0, Math.PI * 2); ctx.fill();
}

function drawLoot(ctx, world) {
  const { opal, gems } = world.loot;
  for (const gem of gems) {
    if (gem.taken) continue;
    ctx.save(); ctx.translate(gem.x, gem.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = PALETTE.gem; ctx.fillRect(-7, -7, 14, 14);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.strokeRect(-7, -7, 14, 14);
    ctx.restore();
  }
  if (!opal.taken) {
    const pulse = 1 + Math.sin(world.time * 3.4) * 0.12;
    // pedestal
    ctx.fillStyle = '#3c4763'; ctx.fillRect(opal.x - 26, opal.y - 26, 52, 52);
    ctx.strokeStyle = PALETTE.loot; ctx.lineWidth = 2; ctx.strokeRect(opal.x - 26, opal.y - 26, 52, 52);
    ctx.save(); ctx.translate(opal.x, opal.y); ctx.scale(pulse, pulse); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = PALETTE.loot; ctx.fillRect(-11, -11, 22, 22);
    ctx.fillStyle = '#eafffb'; ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();
    ctx.fillStyle = PALETTE.loot;
    ctx.font = `bold 13px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('MOONLIT OPAL', opal.x, opal.y - 36);
  } else {
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `bold 12px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('EMPTY PEDESTAL', opal.x, opal.y - 32);
    ctx.fillStyle = '#3c4763'; ctx.fillRect(opal.x - 26, opal.y - 26, 52, 52);
  }
}

function drawRoom(ctx, world) {
  // floor tiles
  ctx.fillStyle = PALETTE.floor; ctx.fillRect(ROOM.x, ROOM.y, ROOM.w, ROOM.h);
  const tile = 56;
  for (let x = ROOM.x, i = 0; x < ROOM.x + ROOM.w; x += tile, i += 1) {
    for (let y = ROOM.y, j = 0; y < ROOM.y + ROOM.h; y += tile, j += 1) {
      if ((i + j) % 2 === 0) { ctx.fillStyle = PALETTE.floorAlt; ctx.fillRect(x, y, Math.min(tile, ROOM.x + ROOM.w - x), Math.min(tile, ROOM.y + ROOM.h - y)); }
    }
  }
  // central rug
  ctx.fillStyle = PALETTE.rug; ctx.fillRect(560, 300, 160, 190);
  ctx.strokeStyle = '#6a4f96'; ctx.lineWidth = 3; ctx.strokeRect(560, 300, 160, 190);
  // exit door on the left wall
  const e = world.exit;
  ctx.fillStyle = world.hasOpal ? PALETTE.exit : '#59637c';
  ctx.fillRect(e.x - 8, e.y - e.h / 2, e.w, e.h);
  ctx.fillStyle = '#10131c';
  ctx.font = `bold 12px ${FONT}`; ctx.textAlign = 'center';
  ctx.save(); ctx.translate(e.x + 8, e.y); ctx.rotate(-Math.PI / 2); ctx.fillText('EXIT / ENTRANCE', 0, 4); ctx.restore();
  // obstacles: display cases and shelves
  for (const r of OBSTACLES) {
    ctx.fillStyle = PALETTE.caseFill; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = PALETTE.caseGlass; ctx.lineWidth = 2; ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = 'rgba(127,212,255,0.25)';
    if (r.w > r.h) ctx.fillRect(r.x + 8, r.y + 6, r.w - 16, 5); else ctx.fillRect(r.x + 6, r.y + 8, 5, r.h - 16);
    // little exhibits inside long cases
    ctx.fillStyle = PALETTE.gem;
    if (r.w > 120) for (let x = r.x + 28; x < r.x + r.w - 10; x += 52) { ctx.beginPath(); ctx.arc(x, r.y + r.h / 2 + 3, 4, 0, Math.PI * 2); ctx.fill(); }
  }
  // walls
  ctx.strokeStyle = PALETTE.wallEdge; ctx.lineWidth = 6; ctx.strokeRect(ROOM.x, ROOM.y, ROOM.w, ROOM.h);
  // coin decoy
  if (world.coinDecoy) {
    const c = world.coinDecoy;
    ctx.strokeStyle = '#ffd94d'; ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i += 1) { ctx.beginPath(); ctx.arc(c.x, c.y, i * 9 + Math.sin(world.time * 8) * 2, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = '#ffd94d'; ctx.beginPath(); ctx.arc(c.x, c.y, 6, 0, Math.PI * 2); ctx.fill();
  }
}

function drawHud(ctx, world) {
  ctx.fillStyle = PALETTE.hud; ctx.fillRect(0, 0, FIELD.width, FIELD.hudHeight);
  ctx.strokeStyle = PALETTE.wallEdge; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, FIELD.hudHeight); ctx.lineTo(FIELD.width, FIELD.hudHeight); ctx.stroke();
  ctx.textAlign = 'left'; ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 19px ${FONT}`;
  ctx.fillText('MOONLIT OPAL HEIST', 18, 40);
  // Alarm meter: big and labelled, centre of the HUD.
  const ax = 330, ay = 18, aw = 430, ah = 28;
  ctx.font = `bold 15px ${FONT}`; ctx.fillStyle = world.alarm > 70 ? PALETTE.alarm : PALETTE.text;
  ctx.fillText('ALARM', ax, ay + 20);
  ctx.fillStyle = PALETTE.alarmTrack; ctx.fillRect(ax + 72, ay, aw, ah);
  const frac = world.alarm / ALARM.max;
  ctx.fillStyle = frac > 0.7 ? PALETTE.alarm : frac > 0.35 ? '#ffab4d' : '#ffd94d';
  if (world.alarm > 0) ctx.fillRect(ax + 72, ay, aw * frac, ah);
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.strokeRect(ax + 72, ay, aw, ah);
  ctx.fillStyle = PALETTE.text; ctx.font = `bold 14px ${FONT}`;
  ctx.fillText(`${Math.floor(world.alarm)}%`, ax + 84 + aw, ay + 20);
  if (world.alarmState === 'chase') {
    ctx.fillStyle = PALETTE.alarm; ctx.font = `bold 16px ${FONT}`;
    ctx.fillText('ALARM! RUN!', ax + 150 + aw, ay + 20);
  }
  // Loot, coins, score, time on the right.
  const gemsTaken = world.loot.gems.filter(g => g.taken).length;
  ctx.fillStyle = PALETTE.text; ctx.font = `15px ${FONT}`; ctx.textAlign = 'right';
  ctx.fillText(`Loot: ${world.hasOpal ? 'OPAL + ' : ''}${gemsTaken}/5 gems`, FIELD.width - 230, 26);
  ctx.fillText(`Coins: ${world.coinsLeft}   Score: ${world.score}`, FIELD.width - 230, 50);
  const mm = String(Math.floor(world.elapsed / 60)).padStart(2, '0');
  const ss = String(Math.floor(world.elapsed % 60)).padStart(2, '0');
  ctx.fillText(`Time ${mm}:${ss}`, FIELD.width - 18, 38);
  // message line under the room when there is one
  if (world.message && world.screen === SCREEN_PLAY) {
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffd94d'; ctx.font = `bold 17px ${FONT}`;
    ctx.fillText(world.message, FIELD.width / 2, FIELD.height - 48);
  }
}

function overlayPanel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(10,12,20,0.62)';
  ctx.fillRect(0, FIELD.hudHeight, FIELD.width, FIELD.height - FIELD.hudHeight);
  const w = 620, h = 250, x = (FIELD.width - w) / 2, y = 240;
  ctx.fillStyle = 'rgba(18,22,36,0.95)'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
  ctx.textAlign = 'center'; ctx.fillStyle = accent;
  ctx.font = `bold 36px ${FONT}`; ctx.fillText(title, FIELD.width / 2, y + 58);
  ctx.fillStyle = PALETTE.text; ctx.font = `16px ${FONT}`;
  lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, y + 102 + i * 26));
}

export function draw(ctx, world, best) {
  ctx.fillStyle = PALETTE.backdrop; ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  drawRoom(ctx, world);
  drawLoot(ctx, world);
  for (const c of world.cameras) drawCamera(ctx, c);
  for (const g of world.guards) drawGuard(ctx, g, world.time);
  drawThief(ctx, world.thief, world.time);
  drawHud(ctx, world);
  // controls strip, always visible at the very bottom of the room frame
  if (world.screen === SCREEN_PLAY) {
    ctx.fillStyle = 'rgba(13,16,23,0.85)'; ctx.fillRect(ROOM.x, FIELD.height - 24, ROOM.w, 20);
    ctx.fillStyle = PALETTE.muted; ctx.font = `12.5px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('WASD / Arrows: move    Shift: sprint (risky)    C: sneak (quiet)    E: take the opal    Mouse click: toss a coin decoy    R: restart', FIELD.width / 2, FIELD.height - 10);
  }
  if (world.screen === SCREEN_TITLE) {
    overlayPanel(ctx, 'MOONLIT OPAL HEIST', [
      'Cross the vault, lift the Moonlit Opal, and slip back out the entrance.',
      'Yellow cones are guards. Purple cones are cameras. Cases block their sight.',
      'Being seen fills the ALARM meter. Full meter: every guard hunts you.',
      'Click to toss a coin and pull a guard away. Sneak with C, sprint with Shift.',
      'Press ENTER or click to begin',
    ], PALETTE.loot);
  } else if (world.screen === SCREEN_WIN) {
    overlayPanel(ctx, 'CLEAN GETAWAY!', [
      `You escaped with the Moonlit Opal.`,
      `Score: ${world.score}    Best: ${Math.max(best, world.score)}`,
      `Time: ${Math.floor(world.elapsed)}s    Alarm peak stayed under control.`,
      'Press R to play again',
    ], PALETTE.exit);
  } else if (world.screen === SCREEN_CAUGHT) {
    overlayPanel(ctx, 'CAUGHT!', [
      'A guard got a hand on you inside the vault.',
      `Gems lifted: ${world.loot.gems.filter(g => g.taken).length}/5    Score: ${world.score}`,
      'Watch the cones, hide behind the cases, spend your coins wisely.',
      'Press R to try again',
    ], PALETTE.alarm);
  }
}
