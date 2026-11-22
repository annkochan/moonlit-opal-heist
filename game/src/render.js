// All drawing for Moonlit Opal Heist, in a lit, textured style: a polished
// stone floor with light pools, glass display cases with exhibits inside,
// top-down people (head, shoulders, arms, clothing) rather than tokens,
// flashlight and camera beams with soft falloff, and the HUD alarm meter.
// The room stays visible under every overlay, so any frame shows the heist.

import { ALARM, CAMERA, FIELD, FONT, PALETTE } from './config.js';
import { OBSTACLES, ROOM, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './world.js';
import { raycastDistance } from './geometry.js';

/* ---------- vision cones with soft light falloff ---------- */

function conePath(ctx, x, y, facing, halfAngle, range) {
  const steps = 26;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i <= steps; i += 1) {
    const a = facing - halfAngle + (2 * halfAngle * i) / steps;
    const d = raycastDistance(x, y, a, range, OBSTACLES, ROOM);
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath();
}

function drawBeam(ctx, x, y, facing, halfAngle, range, rgb, strength) {
  conePath(ctx, x, y, facing, halfAngle, range);
  const farX = x + Math.cos(facing) * range, farY = y + Math.sin(facing) * range;
  const grad = ctx.createRadialGradient(x, y, 8, x, y, range);
  grad.addColorStop(0, `rgba(${rgb},${strength})`);
  grad.addColorStop(0.55, `rgba(${rgb},${strength * 0.45})`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = grad;
  ctx.fill();
  // a brighter core along the centre line, like a real flashlight beam
  ctx.save();
  conePath(ctx, x, y, facing, halfAngle * 0.45, range * 0.92);
  const core = ctx.createLinearGradient(x, y, farX, farY);
  core.addColorStop(0, `rgba(255,250,220,${strength * 0.35})`);
  core.addColorStop(1, 'rgba(255,250,220,0)');
  ctx.fillStyle = core;
  ctx.fill();
  ctx.restore();
}

/* ---------- people, drawn from above ---------- */

function personShadow(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.beginPath(); ctx.ellipse(x + 5, y + 7, r * 1.05, r * 0.72, 0, 0, Math.PI * 2); ctx.fill();
}

/** A top-down person: torso with shoulders, two arms, a head with hair. */
function drawPerson(ctx, x, y, facing, opts) {
  personShadow(ctx, x, y, 16);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(facing);
  // arms, slightly forward
  ctx.fillStyle = opts.sleeve;
  ctx.beginPath(); ctx.ellipse(9, -13, 8.5, 4.6, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(9, 13, 8.5, 4.6, -0.5, 0, Math.PI * 2); ctx.fill();
  // hands
  ctx.fillStyle = '#e8b98d';
  ctx.beginPath(); ctx.arc(16, -14.5, 3.1, 0, Math.PI * 2); ctx.arc(16, 14.5, 3.1, 0, Math.PI * 2); ctx.fill();
  // torso / shoulders with a clothing gradient
  const torso = ctx.createRadialGradient(-3, -3, 3, 0, 0, 17);
  torso.addColorStop(0, opts.bodyLight);
  torso.addColorStop(1, opts.body);
  ctx.fillStyle = torso;
  ctx.beginPath(); ctx.ellipse(0, 0, 14.5, 16.5, 0, 0, Math.PI * 2); ctx.fill();
  // head: skin, then hair over the back half
  ctx.fillStyle = '#eebd96';
  ctx.beginPath(); ctx.arc(3.5, 0, 7.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = opts.hair;
  ctx.beginPath(); ctx.arc(1.2, 0, 7.4, Math.PI * 0.45, Math.PI * 1.55); ctx.lineTo(1.2, 0); ctx.closePath(); ctx.fill();
  ctx.restore();
  return { x, y, facing };
}

function drawThief(ctx, t, time) {
  const bob = t.moving ? Math.sin(time * 11) * 1.4 : 0;
  // a dark backpack behind the shoulders (drawn in facing space)
  const p = drawPerson(ctx, t.x, t.y + bob * 0.3, t.facing, {
    body: '#23242c', bodyLight: '#3a3c46', sleeve: '#23242c', hair: '#15161c',
  });
  ctx.save();
  ctx.translate(p.x, p.y + bob * 0.3);
  ctx.rotate(p.facing);
  // backpack
  const pack = ctx.createRadialGradient(-8, -2, 2, -7, 0, 10);
  pack.addColorStop(0, '#4c4438'); pack.addColorStop(1, '#2c2822');
  ctx.fillStyle = pack;
  ctx.beginPath(); ctx.ellipse(-7.5, 0, 8, 9.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#191713'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.ellipse(-7.5, 0, 8, 9.5, 0, 0, Math.PI * 2); ctx.stroke();
  // hood rim around the head
  ctx.strokeStyle = '#101116'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(3.5, 0, 9.2, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  if (t.sneaking) {
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(t.x, t.y, 22, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
  // small label-free loot sack glint when carrying the opal
  if (t.hasOpalGlow) { /* handled by world flag below if present */ }
}

function drawGuard(ctx, g, time) {
  drawBeam(ctx, g.x, g.y, g.facing, 0.62, 196,
    g.seesThief || g.mode === 'chase' ? '255,96,80' : '255,216,120',
    g.seesThief ? 0.5 : 0.34);
  drawPerson(ctx, g.x, g.y, g.facing, {
    body: '#2c4d9e', bodyLight: '#4d74c9', sleeve: '#2c4d9e', hair: '#3a2c20',
  });
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.rotate(g.facing);
  // peaked cap: crown and brim toward facing
  ctx.fillStyle = '#1d3568';
  ctx.beginPath(); ctx.arc(3.5, 0, 7.9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#14264c';
  ctx.beginPath(); ctx.ellipse(10.5, 0, 4.6, 6.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d9b64a';
  ctx.beginPath(); ctx.arc(3.5, 0, 2.1, 0, Math.PI * 2); ctx.fill();
  // flashlight in the right hand
  ctx.fillStyle = '#22242a';
  ctx.fillRect(14, 11.5, 7, 3.6);
  ctx.fillStyle = '#fff6cf';
  ctx.beginPath(); ctx.arc(21.5, 13.3, 2, 0, Math.PI * 2); ctx.fill();
  // shoulder radio / badge glints
  ctx.fillStyle = '#cfd9ee';
  ctx.fillRect(-2, -15.5, 3.4, 2.4);
  ctx.restore();
  if (g.seesThief || g.mode === 'chase') {
    ctx.fillStyle = '#ff5147';
    ctx.font = `bold 26px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('!', g.x, g.y - 26 - Math.abs(Math.sin(time * 6)) * 3);
  }
}

function drawCamera(ctx, c, time) {
  drawBeam(ctx, c.x, c.y, c.facing, CAMERA.visionHalfAngle, CAMERA.visionRange, '158,132,255', c.seesThief ? 0.42 : 0.26);
  ctx.save();
  ctx.translate(c.x, c.y);
  // wall mount arm toward the wall
  ctx.strokeStyle = '#39415a'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, c.mount === 'top' ? -12 : 12); ctx.lineTo(0, 0); ctx.stroke();
  ctx.rotate(c.facing);
  // camera body: a shaded box with a lens cylinder
  const body = ctx.createLinearGradient(0, -8, 0, 8);
  body.addColorStop(0, '#e6ebf5'); body.addColorStop(0.5, '#aeb9cf'); body.addColorStop(1, '#79839c');
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.roundRect(-9, -7.5, 19, 15, 4); ctx.fill();
  ctx.strokeStyle = '#454e66'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.roundRect(-9, -7.5, 19, 15, 4); ctx.stroke();
  ctx.fillStyle = '#20242e';
  ctx.beginPath(); ctx.arc(11, 0, 5.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.seesThief ? '#ff5147' : '#7fd4ff';
  ctx.beginPath(); ctx.arc(11.8, -1.2, 2.1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // blinking record light
  if (Math.sin(time * 4 + c.x) > -0.2) {
    ctx.fillStyle = '#ff5147';
    ctx.beginPath(); ctx.arc(c.x + 8, c.y - 10, 2.5, 0, Math.PI * 2); ctx.fill();
  }
}

/* ---------- loot ---------- */

function drawGemShape(ctx, x, y, r, main, side, top) {
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.lineTo(x + r, y - r * 0.25); ctx.lineTo(x + r * 0.55, y + r);
  ctx.lineTo(x - r * 0.55, y + r); ctx.lineTo(x - r, y - r * 0.25); ctx.closePath();
  ctx.fillStyle = main; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.4, y + r * 0.1); ctx.lineTo(x - r * 0.4, y + r * 0.1); ctx.closePath();
  ctx.fillStyle = top; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - r, y - r * 0.25); ctx.lineTo(x - r * 0.4, y + r * 0.1); ctx.lineTo(x - r * 0.55, y + r); ctx.closePath();
  ctx.fillStyle = side; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.1; ctx.stroke();
}

function drawLoot(ctx, world) {
  const { opal, gems } = world.loot;
  for (const gem of gems) {
    if (gem.taken) continue;
    // cushion
    ctx.fillStyle = '#5d2140';
    ctx.beginPath(); ctx.roundRect(gem.x - 11, gem.y - 9, 22, 18, 4); ctx.fill();
    drawGemShape(ctx, gem.x, gem.y - 1, 8, '#e86ab8', '#b83a8c', '#ffc4e6');
  }
  // pedestal: a stone plinth with a glass cover
  const px = opal.x - 27, py = opal.y - 27;
  const stone = ctx.createLinearGradient(px, py, px, py + 54);
  stone.addColorStop(0, '#59637e'); stone.addColorStop(1, '#333b52');
  ctx.fillStyle = stone; ctx.fillRect(px, py, 54, 54);
  ctx.strokeStyle = '#79839e'; ctx.lineWidth = 2; ctx.strokeRect(px, py, 54, 54);
  ctx.fillStyle = 'rgba(180,225,255,0.13)'; ctx.fillRect(px + 3, py + 3, 48, 48);
  if (!opal.taken) {
    ctx.fillStyle = '#5d2140';
    ctx.beginPath(); ctx.roundRect(opal.x - 16, opal.y - 12, 32, 24, 5); ctx.fill();
    ctx.save();
    ctx.shadowColor = 'rgba(127,252,232,0.9)'; ctx.shadowBlur = 18 + Math.sin(world.time * 3.4) * 6;
    drawGemShape(ctx, opal.x, opal.y - 2, 14, '#3fd9c2', '#1f9c86', '#c8fff4');
    ctx.restore();
    ctx.fillStyle = '#a9fff2';
    ctx.font = `bold 13px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('MOONLIT OPAL', opal.x, opal.y - 38);
  } else {
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `bold 12px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('EMPTY PEDESTAL', opal.x, opal.y - 38);
  }
}

/* ---------- the room ---------- */

function drawRoom(ctx, world) {
  // polished stone floor: large tiles with slight tonal variation and seams
  const tile = 112;
  for (let x = ROOM.x, i = 0; x < ROOM.x + ROOM.w; x += tile, i += 1) {
    for (let y = ROOM.y, j = 0; y < ROOM.y + ROOM.h; y += tile, j += 1) {
      const w = Math.min(tile, ROOM.x + ROOM.w - x), h = Math.min(tile, ROOM.y + ROOM.h - y);
      const tone = ((i * 7 + j * 13) % 5) - 2;
      ctx.fillStyle = `rgb(${43 + tone * 2},${49 + tone * 2},${66 + tone * 3})`;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      ctx.fillRect(x, y, w, 3);
    }
  }
  ctx.strokeStyle = 'rgba(10,12,18,0.55)'; ctx.lineWidth = 1.5;
  for (let x = ROOM.x; x <= ROOM.x + ROOM.w; x += tile) { ctx.beginPath(); ctx.moveTo(x, ROOM.y); ctx.lineTo(x, ROOM.y + ROOM.h); ctx.stroke(); }
  for (let y = ROOM.y; y <= ROOM.y + ROOM.h; y += tile) { ctx.beginPath(); ctx.moveTo(ROOM.x, y); ctx.lineTo(ROOM.x + ROOM.w, y); ctx.stroke(); }
  // a deep-red carpet runner down the middle
  const rug = ctx.createLinearGradient(560, 0, 720, 0);
  rug.addColorStop(0, '#4a2438'); rug.addColorStop(0.5, '#5d2c46'); rug.addColorStop(1, '#4a2438');
  ctx.fillStyle = rug; ctx.fillRect(560, 300, 160, 190);
  ctx.strokeStyle = '#8a5a3a'; ctx.lineWidth = 3; ctx.strokeRect(564, 304, 152, 182);
  ctx.strokeStyle = 'rgba(220,180,110,0.5)'; ctx.lineWidth = 1.2; ctx.strokeRect(574, 314, 132, 162);
  // entrance door on the left wall
  const e = world.exit;
  const door = ctx.createLinearGradient(e.x, 0, e.x + e.w, 0);
  door.addColorStop(0, world.hasOpal ? '#3f9e5f' : '#4d5872'); door.addColorStop(1, world.hasOpal ? '#2c7a47' : '#39445e');
  ctx.fillStyle = door;
  ctx.fillRect(e.x - 8, e.y - e.h / 2, e.w, e.h);
  ctx.strokeStyle = '#20242e'; ctx.lineWidth = 2; ctx.strokeRect(e.x - 8, e.y - e.h / 2, e.w, e.h);
  ctx.fillStyle = '#e8ecf4';
  ctx.font = `bold 12px ${FONT}`; ctx.textAlign = 'center';
  ctx.save(); ctx.translate(e.x + 8, e.y); ctx.rotate(-Math.PI / 2); ctx.fillText('EXIT / ENTRANCE', 0, 4); ctx.restore();
  // display cases and shelves: wooden frames, glass tops, exhibits inside
  for (const r of OBSTACLES) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(r.x + 5, r.y + 6, r.w, r.h);
    const frame = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
    frame.addColorStop(0, '#5a4230'); frame.addColorStop(1, '#3a2a1e');
    ctx.fillStyle = frame; ctx.fillRect(r.x, r.y, r.w, r.h);
    const glass = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
    glass.addColorStop(0, 'rgba(190,230,255,0.34)');
    glass.addColorStop(0.45, 'rgba(140,190,235,0.13)');
    glass.addColorStop(1, 'rgba(190,230,255,0.26)');
    ctx.fillStyle = '#2b3a55'; ctx.fillRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
    // exhibits on little stands inside
    ctx.fillStyle = '#c9a44e';
    if (r.w > r.h) {
      for (let x = r.x + 30; x < r.x + r.w - 12; x += 52) {
        ctx.beginPath(); ctx.ellipse(x, r.y + r.h / 2, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
        drawGemShape(ctx, x, r.y + r.h / 2 - 3, 5.5, '#e8c86a', '#a87f2e', '#fff0b8');
      }
    } else {
      for (let y = r.y + 30; y < r.y + r.h - 12; y += 52) {
        ctx.beginPath(); ctx.ellipse(r.x + r.w / 2, y, 5, 7, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.fillStyle = glass; ctx.fillRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
    ctx.strokeStyle = '#191008'; ctx.lineWidth = 2.4; ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = 'rgba(230,245,255,0.65)'; ctx.lineWidth = 1.2; ctx.strokeRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
  }
  // walls with a skirting shadow
  ctx.strokeStyle = '#59637e'; ctx.lineWidth = 7; ctx.strokeRect(ROOM.x, ROOM.y, ROOM.w, ROOM.h);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; ctx.strokeRect(ROOM.x + 6, ROOM.y + 6, ROOM.w - 12, ROOM.h - 12);
  // tossed coin decoy: a coin with expanding sound rings
  if (world.coinDecoy) {
    const c = world.coinDecoy;
    ctx.strokeStyle = 'rgba(255,217,77,0.8)'; ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i += 1) { ctx.beginPath(); ctx.arc(c.x, c.y, i * 9 + Math.sin(world.time * 8) * 2, 0, Math.PI * 2); ctx.stroke(); }
    const coin = ctx.createRadialGradient(c.x - 2, c.y - 2, 1, c.x, c.y, 7);
    coin.addColorStop(0, '#fff0a8'); coin.addColorStop(1, '#c9a227');
    ctx.fillStyle = coin; ctx.beginPath(); ctx.arc(c.x, c.y, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a6d14'; ctx.lineWidth = 1.2; ctx.stroke();
  }
}

/** Warm pools of light over the cases and a soft vignette, for mood. */
function drawLighting(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  for (const r of OBSTACLES) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const g = ctx.createRadialGradient(cx, cy, 6, cx, cy, Math.max(r.w, r.h) * 0.85);
    g.addColorStop(0, 'rgba(255,225,170,0.20)');
    g.addColorStop(1, 'rgba(255,225,170,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r.w, cy - r.w, r.w * 2, r.w * 2);
  }
  ctx.restore();
  const v = ctx.createRadialGradient(640, 390, 320, 640, 390, 780);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = v;
  ctx.fillRect(ROOM.x, ROOM.y, ROOM.w, ROOM.h);
}

/* ---------- HUD ---------- */

function drawHud(ctx, world) {
  const hud = ctx.createLinearGradient(0, 0, 0, FIELD.hudHeight);
  hud.addColorStop(0, '#1d2334'); hud.addColorStop(1, '#12151f');
  ctx.fillStyle = hud; ctx.fillRect(0, 0, FIELD.width, FIELD.hudHeight);
  ctx.strokeStyle = PALETTE.wallEdge; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, FIELD.hudHeight); ctx.lineTo(FIELD.width, FIELD.hudHeight); ctx.stroke();
  ctx.textAlign = 'left'; ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 19px ${FONT}`;
  ctx.fillText('MOONLIT OPAL HEIST', 18, 40);
  // Alarm meter: big, labelled, glossy, centre of the HUD.
  const ax = 330, ay = 18, aw = 430, ah = 28;
  ctx.font = `bold 15px ${FONT}`; ctx.fillStyle = world.alarm > 70 ? PALETTE.alarm : PALETTE.text;
  ctx.fillText('ALARM', ax, ay + 20);
  ctx.fillStyle = PALETTE.alarmTrack; ctx.fillRect(ax + 72, ay, aw, ah);
  const frac = world.alarm / ALARM.max;
  if (world.alarm > 0) {
    const bar = ctx.createLinearGradient(0, ay, 0, ay + ah);
    const hot = frac > 0.7;
    bar.addColorStop(0, hot ? '#ff8a80' : frac > 0.35 ? '#ffc98a' : '#ffe98a');
    bar.addColorStop(0.5, hot ? '#ff5147' : frac > 0.35 ? '#ffab4d' : '#ffd94d');
    bar.addColorStop(1, hot ? '#c22e28' : frac > 0.35 ? '#d97f22' : '#d9ae27');
    ctx.fillStyle = bar; ctx.fillRect(ax + 72, ay, aw * frac, ah);
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(ax + 72, ay, aw * frac, ah * 0.42);
  }
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.strokeRect(ax + 72, ay, aw, ah);
  ctx.fillStyle = PALETTE.text; ctx.font = `bold 14px ${FONT}`;
  ctx.fillText(`${Math.floor(world.alarm)}%`, ax + 84 + aw, ay + 20);
  if (world.alarmState === 'chase') {
    ctx.fillStyle = PALETTE.alarm; ctx.font = `bold 16px ${FONT}`;
    ctx.fillText('ALARM! RUN!', ax + 150 + aw, ay + 20);
  }
  const gemsTaken = world.loot.gems.filter(g => g.taken).length;
  ctx.fillStyle = PALETTE.text; ctx.font = `15px ${FONT}`; ctx.textAlign = 'right';
  ctx.fillText(`Loot: ${world.hasOpal ? 'OPAL + ' : ''}${gemsTaken}/5 gems`, FIELD.width - 230, 26);
  ctx.fillText(`Coins: ${world.coinsLeft}   Score: ${world.score}`, FIELD.width - 230, 50);
  const mm = String(Math.floor(world.elapsed / 60)).padStart(2, '0');
  const ss = String(Math.floor(world.elapsed % 60)).padStart(2, '0');
  ctx.fillText(`Time ${mm}:${ss}`, FIELD.width - 18, 38);
  if (world.message && world.screen === SCREEN_PLAY) {
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffd94d'; ctx.font = `bold 17px ${FONT}`;
    ctx.fillText(world.message, FIELD.width / 2, FIELD.height - 48);
  }
}

function overlayPanel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8,10,16,0.55)';
  ctx.fillRect(0, FIELD.hudHeight, FIELD.width, FIELD.height - FIELD.hudHeight);
  const w = 620, h = 250, x = (FIELD.width - w) / 2, y = 240;
  const panel = ctx.createLinearGradient(0, y, 0, y + h);
  panel.addColorStop(0, 'rgba(26,31,48,0.96)'); panel.addColorStop(1, 'rgba(14,17,27,0.96)');
  ctx.fillStyle = panel; ctx.fillRect(x, y, w, h);
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
  for (const c of world.cameras) drawCamera(ctx, c, world.time);
  for (const g of world.guards) drawGuard(ctx, g, world.time);
  // the thief knows whether the opal is in the backpack
  world.thief.hasOpalGlow = world.hasOpal;
  drawThief(ctx, world.thief, world.time);
  drawLighting(ctx);
  drawHud(ctx, world);
  if (world.screen === SCREEN_PLAY) {
    ctx.fillStyle = 'rgba(10,12,18,0.88)'; ctx.fillRect(ROOM.x, FIELD.height - 24, ROOM.w, 20);
    ctx.fillStyle = PALETTE.muted; ctx.font = `12.5px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('WASD / Arrows: move    Shift: sprint (risky)    C: sneak (quiet)    E: take the opal    Mouse click: toss a coin decoy    R: restart', FIELD.width / 2, FIELD.height - 10);
  }
  if (world.screen === SCREEN_TITLE) {
    overlayPanel(ctx, 'MOONLIT OPAL HEIST', [
      'Cross the vault, lift the Moonlit Opal, and slip back out the entrance.',
      'Guards carry flashlights. Cameras sweep purple beams. Cases block their sight.',
      'Being seen fills the ALARM meter. Full meter: every guard hunts you.',
      'Click to toss a coin and pull a guard away. Sneak with C, sprint with Shift.',
      'Press ENTER or click to begin',
    ], PALETTE.loot);
  } else if (world.screen === SCREEN_WIN) {
    overlayPanel(ctx, 'CLEAN GETAWAY!', [
      'You escaped with the Moonlit Opal.',
      `Score: ${world.score}    Best: ${Math.max(best, world.score)}`,
      `Time: ${Math.floor(world.elapsed)}s    Alarm peak stayed under control.`,
      'Press R to play again',
    ], PALETTE.exit);
  } else if (world.screen === 'caught') {
    overlayPanel(ctx, 'CAUGHT!', [
      'A guard got a hand on you inside the vault.',
      `Gems lifted: ${world.loot.gems.filter(g => g.taken).length}/5    Score: ${world.score}`,
      'Watch the beams, hide behind the cases, spend your coins wisely.',
      'Press R to try again',
    ], PALETTE.alarm);
  }
}
