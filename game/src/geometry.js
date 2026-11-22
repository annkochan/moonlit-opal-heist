// Small geometry helpers shared by vision, collision and rendering:
// segment intersection, line of sight past display cases, and cone raycasts.

/** True when segments p1-p2 and p3-p4 cross (touching counts). */
export function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** The four edges of an axis-aligned rectangle as [x1, y1, x2, y2] rows. */
function rectEdges(r) {
  return [
    [r.x, r.y, r.x + r.w, r.y],
    [r.x + r.w, r.y, r.x + r.w, r.y + r.h],
    [r.x + r.w, r.y + r.h, r.x, r.y + r.h],
    [r.x, r.y + r.h, r.x, r.y],
  ];
}

/** True when the straight line from a to b is not blocked by any obstacle. */
export function hasLineOfSight(ax, ay, bx, by, obstacles) {
  for (const r of obstacles) {
    for (const [x1, y1, x2, y2] of rectEdges(r)) {
      if (segmentsCross(ax, ay, bx, by, x1, y1, x2, y2)) return false;
    }
  }
  return true;
}

/** Distance along a ray to segment (x1,y1)-(x2,y2), or Infinity when it misses. */
function raySegmentDistance(ox, oy, dirX, dirY, x1, y1, x2, y2) {
  const rx = x2 - x1, ry = y2 - y1;
  const denom = dirX * ry - dirY * rx;
  if (Math.abs(denom) < 1e-9) return Infinity;
  const qx = x1 - ox, qy = y1 - oy;
  const t = (qx * ry - qy * rx) / denom;
  const u = (qx * dirY - qy * dirX) / denom;
  // u here uses the mirrored convention; accept the crossing either way by
  // checking the hit point really lies between the segment ends.
  if (t < 0) return Infinity;
  const hx = ox + dirX * t, hy = oy + dirY * t;
  const along = (hx - x1) * rx + (hy - y1) * ry;
  const len2 = rx * rx + ry * ry;
  if (along < -0.001 || along > len2 + 0.001) return Infinity;
  void u;
  return t;
}

/** Distance from a point along an angle until the first obstacle edge or room wall. */
export function raycastDistance(ax, ay, angle, maxDist, obstacles, bounds) {
  const dirX = Math.cos(angle), dirY = Math.sin(angle);
  let best = maxDist;
  const solids = obstacles.concat([
    { x: bounds.x, y: bounds.y, w: bounds.w, h: 2 },
    { x: bounds.x, y: bounds.y + bounds.h - 2, w: bounds.w, h: 2 },
    { x: bounds.x, y: bounds.y, w: 2, h: bounds.h },
    { x: bounds.x + bounds.w - 2, y: bounds.y, w: 2, h: bounds.h },
  ]);
  for (const r of solids) {
    for (const [x1, y1, x2, y2] of rectEdges(r)) {
      const t = raySegmentDistance(ax, ay, dirX, dirY, x1, y1, x2, y2);
      if (t > 0 && t < best) best = t;
    }
  }
  return best;
}

/** Signed smallest difference between two angles, in (-pi, pi]. */
export function angleDifference(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** True when point p sits inside the vision cone of an observer. */
export function inCone(ox, oy, facing, halfAngle, range, px, py) {
  const dx = px - ox, dy = py - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 26) return true; // right next to the observer: always seen
  return Math.abs(angleDifference(Math.atan2(dy, dx), facing)) <= halfAngle;
}

/** Keep a circle of the given radius outside every obstacle rectangle. */
export function pushOutOfObstacles(p, radius, obstacles) {
  for (const r of obstacles) {
    const nx = Math.max(r.x, Math.min(p.x, r.x + r.w));
    const ny = Math.max(r.y, Math.min(p.y, r.y + r.h));
    const dx = p.x - nx, dy = p.y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 === 0) { p.x = r.x - radius; continue; }
      const d = Math.sqrt(d2);
      p.x = nx + (dx / d) * radius;
      p.y = ny + (dy / d) * radius;
    }
  }
}
