/**
 * Offline edge-geometry audit → writes NDJSON to debug log.
 * Proves whether triangle/square edges actually coincide (not just heuristics).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const LOG = path.join(root, '.cursor', 'debug-880012.log');

/** Dual geometry: square M=75mm; equilateral real edge 71mm. */
const SQUARE_EDGE = 1.0;
const TRIANGLE_EDGE = 71 / 75;

function rotateEulerDeg(p, rotDeg) {
  const rx = (rotDeg[0] * Math.PI) / 180;
  const ry = (rotDeg[1] * Math.PI) / 180;
  const rz = (rotDeg[2] * Math.PI) / 180;
  let [x, y, z] = p;
  {
    const y2 = y * Math.cos(rx) - z * Math.sin(rx);
    const z2 = y * Math.sin(rx) + z * Math.cos(rx);
    y = y2;
    z = z2;
  }
  {
    const x2 = x * Math.cos(ry) + z * Math.sin(ry);
    const z2 = -x * Math.sin(ry) + z * Math.cos(ry);
    x = x2;
    z = z2;
  }
  {
    const x2 = x * Math.cos(rz) - y * Math.sin(rz);
    const y2 = x * Math.sin(rz) + y * Math.cos(rz);
    x = x2;
    y = y2;
  }
  return [x, y, z];
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function len(v) {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function mid(e) {
  return [(e.a[0] + e.b[0]) * 0.5, (e.a[1] + e.b[1]) * 0.5, (e.a[2] + e.b[2]) * 0.5];
}

function localSquare() {
  const h = SQUARE_EDGE / 2;
  return [
    [-h, 0, -h],
    [h, 0, -h],
    [h, 0, h],
    [-h, 0, h],
  ];
}
function localTri() {
  const h = (TRIANGLE_EDGE * Math.sqrt(3)) / 2;
  return [
    [0, 0, (2 * h) / 3],
    [-TRIANGLE_EDGE / 2, 0, -h / 3],
    [TRIANGLE_EDGE / 2, 0, -h / 3],
  ];
}

function edgesOf(step) {
  const local = step.model === 'tile-triangle' ? localTri() : localSquare();
  const world = local.map((p) => add(rotateEulerDeg(p, step.rotation), step.position));
  const edges = [];
  for (let i = 0; i < world.length; i++) {
    edges.push({ a: world[i], b: world[(i + 1) % world.length] });
  }
  return edges;
}

function bestMatch(prev, next) {
  const ea = edgesOf(prev);
  const eb = edgesOf(next);
  let best = null;
  for (const A of ea) {
    for (const B of eb) {
      const da = sub(A.b, A.a);
      const db = sub(B.b, B.a);
      const la = len(da);
      const lb = len(db);
      const align = Math.abs(dot([da[0] / la, da[1] / la, da[2] / la], [db[0] / lb, db[1] / lb, db[2] / lb]));
      const distMid = len(sub(mid(A), mid(B)));
      const lenDelta = Math.abs(la - lb);
      const score = distMid + (1 - align) * 0.5 + lenDelta * 0.25;
      const cur = best ? best.score : Infinity;
      if (score < cur) best = { distMid, align, lenA: la, lenB: lb, lenDelta, score };
    }
  }
  return best;
}

function reallySnap(m) {
  return m && m.distMid <= 0.1 && m.align >= 0.92 && m.lenDelta <= 0.08;
}

async function log(hypothesisId, message, data) {
  const payload = {
    sessionId: '880012',
    runId: 'pre-fix',
    hypothesisId,
    location: 'scripts/audit_magnet_edges.mjs',
    message,
    data,
    timestamp: Date.now(),
  };
  console.log(message, JSON.stringify(data));
  try {
    await fetch('http://127.0.0.1:7364/ingest/f09e8853-cf32-4adb-9ff1-6cc7335ebdc4', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '880012',
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    // Fallback: print only if ingest unavailable
  }
}

// --- synthetic works matching works-gallery / works ---
const sq = (p, r) => ({ model: 'tile-square', position: p, rotation: r });
const tri = (p, r) => ({ model: 'tile-triangle', position: p, rotation: r });
const walls = (cx, cz, wy) => [
  sq([cx, wy, cz - 0.5], [-90, 0, 0]),
  sq([cx - 0.5, wy, cz], [0, 0, 90]),
  sq([cx + 0.5, wy, cz], [0, 0, -90]),
  sq([cx, wy, cz + 0.5], [90, 0, 0]),
];
const onTop = (w) =>
  tri([w.position[0], w.position[1] + 0.65, w.position[2]], w.rotation);

const works = {
  house: [
    sq([0, 0, 0], [0, 0, 0]),
    ...walls(0, 0, 0.5),
    tri([0, 1.15, 0.5], [90, 0, 0]),
  ],
  flower: [
    sq([0, 0, 0], [0, 0, 0]),
    tri([0, 0, 0.85], [0, 0, 0]),
    tri([0, 0, -0.85], [0, 180, 0]),
    tri([0.85, 0, 0], [0, -90, 0]),
    tri([-0.85, 0, 0], [0, 90, 0]),
  ],
  rocket: [
    sq([0, 0, 0], [0, 0, 0]),
    ...walls(0, 0, 0.5),
    ...walls(0, 0, 1.5),
    sq([0, 2, 0], [0, 0, 0]),
    onTop(sq([0, 1.5, 0.5], [90, 0, 0])),
    tri([0, 0, 0.85], [0, 0, 0]),
    tri([0, 0, -0.85], [0, 180, 0]),
  ],
  castle: (() => {
    const wl = [
      sq([-0.5, 0.5, -1], [-90, 0, 0]),
      sq([0.5, 0.5, -1], [-90, 0, 0]),
      sq([-1, 0.5, -0.5], [0, 0, 90]),
      sq([-1, 0.5, 0.5], [0, 0, 90]),
      sq([1, 0.5, -0.5], [0, 0, -90]),
      sq([1, 0.5, 0.5], [0, 0, -90]),
      sq([-0.5, 0.5, 1], [90, 0, 0]),
      sq([0.5, 0.5, 1], [90, 0, 0]),
    ];
    return [
      sq([-0.5, 0, -0.5], [0, 0, 0]),
      sq([0.5, 0, -0.5], [0, 0, 0]),
      sq([-0.5, 0, 0.5], [0, 0, 0]),
      sq([0.5, 0, 0.5], [0, 0, 0]),
      ...wl,
      ...wl.map(onTop),
    ];
  })(),
};

async function main() {
  await log('A', 'asset edge lengths', {
    SQUARE_EDGE,
    TRIANGLE_EDGE,
    mismatch: Math.abs(SQUARE_EDGE - TRIANGLE_EDGE),
  });

  let failTri = 0;
  let failAll = 0;
  for (const [name, steps] of Object.entries(works)) {
    for (let i = 1; i < steps.length; i++) {
      let best = null;
      let partner = -1;
      for (let j = 0; j < i; j++) {
        const m = bestMatch(steps[j], steps[i]);
        if (m && (!best || m.score < best.score)) {
          best = m;
          partner = j;
        }
      }
      const realOk = reallySnap(best);
      if (!realOk) failAll += 1;
      if (steps[i].model === 'tile-triangle' && !realOk) failTri += 1;
      if (steps[i].model === 'tile-triangle' || !realOk) {
        const hyp =
          best && best.lenDelta > 0.08 ? 'A' : best && best.distMid > 0.1 ? 'B' : 'C';
        await log(hyp, `edge-audit ${name}#${i}`, {
          workId: name,
          stepIndex: i,
          model: steps[i].model,
          pos: steps[i].position,
          rot: steps[i].rotation,
          partner,
          realOk,
          best,
        });
      }
    }
  }

  await log('C', 'audit summary', { failTri, failAll, works: Object.keys(works) });
  console.log(`Audit posted to ingest (also ${LOG} if server writes it)`);
}

main();
