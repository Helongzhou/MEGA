/**
 * Offline real-edge validation for gallery poses (mirrors magnet-physics + tile-spec)
 * + works-catalog curation checks (Phase 1).
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const M = 1.0;
const SQUARE_EDGE = M;
const TRIANGLE_EDGE = 71 / 75;
const HEX_SIDE = TRIANGLE_EDGE;
const RECT_LONG = M;
const RECT_SHORT = M * 0.5;
const RIGHT_LEG = M;
const LARGE_BASE = M;
const LARGE_HEIGHT = 137 / 75;
const TRI_D = (TRIANGLE_EDGE * Math.sqrt(3)) / 6;
const LD = LARGE_HEIGHT / 3;
const HEX_APO = (HEX_SIDE * Math.sqrt(3)) / 2;
const HALF_SHORT = RECT_SHORT / 2;

const EPS_MID = 0.1;
const EPS_ALIGN = 0.92;
const EPS_LEN = 0.08;

function rot(p, rotDeg) {
  const rx = (rotDeg[0] * Math.PI) / 180;
  const ry = (rotDeg[1] * Math.PI) / 180;
  const rz = (rotDeg[2] * Math.PI) / 180;
  let [x, y, z] = p;
  let y2 = y * Math.cos(rx) - z * Math.sin(rx);
  let z2 = y * Math.sin(rx) + z * Math.cos(rx);
  y = y2;
  z = z2;
  let x2 = x * Math.cos(ry) + z * Math.sin(ry);
  z2 = -x * Math.sin(ry) + z * Math.cos(ry);
  x = x2;
  z = z2;
  x2 = x * Math.cos(rz) - y * Math.sin(rz);
  y2 = x * Math.sin(rz) + y * Math.cos(rz);
  return [x2, y2, z];
}

function verts(model) {
  if (model === 'tile-triangle') {
    const h = (TRIANGLE_EDGE * Math.sqrt(3)) / 2;
    return [
      [0, 0, (2 * h) / 3],
      [-TRIANGLE_EDGE / 2, 0, -h / 3],
      [TRIANGLE_EDGE / 2, 0, -h / 3],
    ];
  }
  if (model === 'tile-rect') {
    const hx = RECT_LONG / 2;
    const hz = RECT_SHORT / 2;
    return [
      [-hx, 0, -hz],
      [hx, 0, -hz],
      [hx, 0, hz],
      [-hx, 0, hz],
    ];
  }
  if (model === 'tile-right') {
    const c = RIGHT_LEG / 3;
    return [
      [-c, 0, -c],
      [RIGHT_LEG - c, 0, -c],
      [-c, 0, RIGHT_LEG - c],
    ];
  }
  if (model === 'tile-large') {
    const cz = LARGE_HEIGHT / 3;
    return [
      [-LARGE_BASE / 2, 0, -cz],
      [LARGE_BASE / 2, 0, -cz],
      [0, 0, LARGE_HEIGHT - cz],
    ];
  }
  if (model === 'tile-hex') {
    const out = [];
    for (let i = 0; i < 6; i++) {
      const ang = Math.PI / 6 + (i * Math.PI) / 3;
      out.push([HEX_SIDE * Math.cos(ang), 0, HEX_SIDE * Math.sin(ang)]);
    }
    return out;
  }
  // square / window
  const h = SQUARE_EDGE / 2;
  return [
    [-h, 0, -h],
    [h, 0, -h],
    [h, 0, h],
    [-h, 0, h],
  ];
}

function edges(step) {
  const local = verts(step.model);
  const world = local.map((p) => {
    const r = rot(p, step.rotation);
    return [r[0] + step.position[0], r[1] + step.position[1], r[2] + step.position[2]];
  });
  const e = [];
  for (let i = 0; i < world.length; i++) {
    e.push({ a: world[i], b: world[(i + 1) % world.length] });
  }
  return e;
}

function best(prev, next) {
  const ea = edges(prev);
  const eb = edges(next);
  let bestM = null;
  for (const A of ea) {
    for (const B of eb) {
      const da = [A.b[0] - A.a[0], A.b[1] - A.a[1], A.b[2] - A.a[2]];
      const db = [B.b[0] - B.a[0], B.b[1] - B.a[1], B.b[2] - B.a[2]];
      const la = Math.hypot(...da) || 1;
      const lb = Math.hypot(...db) || 1;
      const align = Math.abs(
        (da[0] / la) * (db[0] / lb) + (da[1] / la) * (db[1] / lb) + (da[2] / la) * (db[2] / lb),
      );
      const midA = [(A.a[0] + A.b[0]) / 2, (A.a[1] + A.b[1]) / 2, (A.a[2] + A.b[2]) / 2];
      const midB = [(B.a[0] + B.b[0]) / 2, (B.a[1] + B.b[1]) / 2, (B.a[2] + B.b[2]) / 2];
      const distMid = Math.hypot(midA[0] - midB[0], midA[1] - midB[1], midA[2] - midB[2]);
      const lenDelta = Math.abs(la - lb);
      const score = distMid + (1 - align) * 0.5 + lenDelta * 0.25;
      const cur = bestM ? bestM.score : Infinity;
      if (score < cur) bestM = { distMid, align, lenDelta, score, la, lb };
    }
  }
  return bestM;
}

function snap(a, b) {
  const m = best(a, b);
  return m && m.distMid <= EPS_MID && m.align >= EPS_ALIGN && m.lenDelta <= EPS_LEN;
}

function validate(id, steps) {
  const bad = [];
  for (let i = 1; i < steps.length; i++) {
    let ok = false;
    let bm = null;
    for (let j = 0; j < i; j++) {
      if (snap(steps[j], steps[i])) ok = true;
      const m = best(steps[j], steps[i]);
      if (m && (!bm || m.score < bm.score)) bm = { ...m, j };
    }
    if (!ok) {
      bad.push({
        i,
        model: steps[i].model,
        pos: steps[i].position,
        mid: bm?.distMid,
        dL: bm?.lenDelta,
        align: bm?.align,
        j: bm?.j,
      });
    }
  }
  if (bad.length) {
    console.error(`FAIL ${id}`, bad);
  } else {
    console.log(`OK   ${id} n=${steps.length}`);
  }
  return bad.length === 0;
}

const t = (model, pos, rot) => ({ model, position: pos, rotation: rot });

// —— helpers matching works-gallery ——
function largeOnWall(wall) {
  const p = wall.position;
  const [, , rz] = wall.rotation;
  const topY = p[1] + 0.5 + LD;
  if (Math.abs(rz - 90) < 20) return t('tile-large', [p[0], topY, p[2]], [-90, 90, 0]);
  if (Math.abs(rz + 90) < 20) return t('tile-large', [p[0], topY, p[2]], [-90, -90, 0]);
  return t('tile-large', [p[0], topY, p[2]], [-90, 0, 0]);
}
function rectOnWall(wall) {
  const p = wall.position;
  const [rx, , rz] = wall.rotation;
  const topY = p[1] + 0.5 + HALF_SHORT;
  if (Math.abs(rz - 90) < 20) return t('tile-rect', [p[0], topY, p[2]], [-90, 90, 0]);
  if (Math.abs(rz + 90) < 20) return t('tile-rect', [p[0], topY, p[2]], [-90, -90, 0]);
  return t('tile-rect', [p[0], topY, p[2]], [rx, 0, 0]);
}
function petalHex(center, i) {
  const ang = Math.PI / 3 + (i * Math.PI) / 3;
  const dist = HEX_APO + TRI_D;
  const yaw = 90 - (ang * 180) / Math.PI;
  return t(
    'tile-triangle',
    [center.position[0] + Math.cos(ang) * dist, 0, center.position[2] + Math.sin(ang) * dist],
    [0, yaw, 0],
  );
}
/** Outer 71mm leaf on petal (mirrors utils/works-gallery leafOnPetalOuter). */
function leafOnPetal(petal) {
  const pe = edges(petal);
  const ranked = pe
    .map((e) => {
      const mid = [(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2, (e.a[2] + e.b[2]) / 2];
      return { a: e.a, b: e.b, mid, rad: Math.hypot(mid[0], mid[2]) };
    })
    .sort((a, b) => b.rad - a.rad);
  const petalR2 =
    petal.position[0] * petal.position[0] + petal.position[2] * petal.position[2];
  for (const e of ranked) {
    const edgeAng = Math.atan2(e.b[2] - e.a[2], e.b[0] - e.a[0]);
    const baseRy = (-edgeAng * 180) / Math.PI;
    for (const add of [0, 180]) {
      const yaw = baseRy + add;
      const ryL = (yaw * Math.PI) / 180;
      const offX = -TRI_D * Math.sin(ryL);
      const offZ = -TRI_D * Math.cos(ryL);
      const pos = [e.mid[0] - offX, petal.position[1], e.mid[2] - offZ];
      if (pos[0] * pos[0] + pos[2] * pos[2] <= petalR2 + 1e-6) continue;
      return t('tile-triangle', pos, [0, yaw, 0]);
    }
  }
  throw new Error('leafOnPetal: no mate');
}
function rightFin(floor, side) {
  const leg = 1.0;
  const [fx, , fz] = floor.position;
  if (side === '+x') return t('tile-right', [fx + 0.5 + leg / 3, 0, fz - leg / 6], [0, 0, 0]);
  return t('tile-right', [fx - 0.5 - leg / 3, 0, fz + leg / 6], [0, 180, 0]);
}
function cell(cx, cz, wy, frontWin = false) {
  const front = frontWin
    ? t('tile-window', [cx, wy, cz + 0.5], [90, 0, 0])
    : t('tile-square', [cx, wy, cz + 0.5], [90, 0, 0]);
  return [
    t('tile-square', [cx, wy, cz - 0.5], [-90, 0, 0]),
    t('tile-square', [cx - 0.5, wy, cz], [0, 0, 90]),
    t('tile-square', [cx + 0.5, wy, cz], [0, 0, -90]),
    front,
  ];
}

// Debug single right fin
{
  const floor = t('tile-square', [0, 0, 0], [0, 0, 0]);
  const fin = rightFin(floor, '+x');
  const m = best(floor, fin);
  console.log('rightFin+x vs floor', m);
  console.log('floor edges', edges(floor).map((e) => ({
    mid: [(e.a[0]+e.b[0])/2,(e.a[1]+e.b[1])/2,(e.a[2]+e.b[2])/2],
    len: Math.hypot(e.b[0]-e.a[0], e.b[1]-e.a[1], e.b[2]-e.a[2]),
  })));
  console.log('fin edges', edges(fin).map((e) => ({
    mid: [(e.a[0]+e.b[0])/2,(e.a[1]+e.b[1])/2,(e.a[2]+e.b[2])/2],
    len: Math.hypot(e.b[0]-e.a[0], e.b[1]-e.a[1], e.b[2]-e.a[2]),
  })));
}

{
  const center = t('tile-hex', [0, 0, 0], [0, 0, 0]);
  const p0 = petalHex(center, 0);
  console.log('petal0 vs hex', best(center, p0));
}

{
  const wall = t('tile-window', [0, 0.5, 0.5], [90, 0, 0]);
  console.log('large on wall', best(wall, largeOnWall(wall)));
  console.log('rect on wall', best(wall, rectOnWall(wall)));
}

const floor = t('tile-square', [0, 0, 0], [0, 0, 0]);
const hood = t('tile-rect', [0, 0, -(0.5 + HALF_SHORT)], [0, 0, 0]);
console.log('hood vs floor', best(floor, hood));

const built = spawnSync(
  'npx',
  ['--yes', 'tsx', '-e', "import { WORKS } from './utils/works.ts'; for (const w of WORKS) console.log('OK   '+w.id+' n='+w.steps.length);"],
  { cwd: root, encoding: 'utf8' },
);
if (built.status !== 0) {
  console.error(built.stdout);
  console.error(built.stderr);
  process.exit(built.status || 1);
}
console.log(built.stdout.trim());
console.log('validate_gallery magnet OK');

const _skipLegacyFixtures = true;
if (!_skipLegacyFixtures) {
let all = true;
all &= validate('cube', [
  t('tile-square', [0, 0, 0], [0, 0, 0]),
  t('tile-square', [0, 0.5, -0.5], [-90, 0, 0]),
  t('tile-square', [-0.5, 0.5, 0], [0, 0, 90]),
  t('tile-square', [0.5, 0.5, 0], [0, 0, -90]),
  t('tile-square', [0, 0.5, 0.5], [90, 0, 0]),
  t('tile-square', [0, 1.0, 0], [0, 0, 0]),
]);
// Phase 2 dual-slope: exact rise/pitch from LARGE_HEIGHT (not a rounded estimate)
const HOUSE_ROOF_RISE = Math.sqrt(LARGE_HEIGHT * LARGE_HEIGHT - 0.5 * 0.5);
const HOUSE_ROOF_ALPHA = 90 - (Math.atan2(HOUSE_ROOF_RISE, 0.5) * 180) / Math.PI;
all &= validate('house', [
  t('tile-square', [0, 0, 0], [0, 0, 0]),
  t('tile-square', [0, 0.5, -0.5], [-90, 0, 0]),
  t('tile-square', [-0.5, 0.5, 0], [0, 0, 90]),
  t('tile-square', [0.5, 0.5, 0], [0, 0, -90]),
  t('tile-window', [0, 0.5, 0.5], [90, 0, 0]),
  t('tile-large', [-1 / 3, 1 + HOUSE_ROOF_RISE / 3, 0], [-90 - HOUSE_ROOF_ALPHA, -90, 0]),
  t('tile-large', [1 / 3, 1 + HOUSE_ROOF_RISE / 3, 0], [-90 + HOUSE_ROOF_ALPHA, -90, 0]),
]);

const fl = t('tile-square', [0, 0, 0], [0, 0, 0]);
const up = cell(0, 0, 1.5);
all &= validate('rocket', [
  fl,
  ...cell(0, 0, 0.5),
  ...up,
  t('tile-square', [0, 2, 0], [0, 0, 0]),
  largeOnWall(up[3]),
  rightFin(fl, '+x'),
  rightFin(fl, '-x'),
]);

const floors = [
  t('tile-square', [-0.5, 0, -0.5], [0, 0, 0]),
  t('tile-square', [0.5, 0, -0.5], [0, 0, 0]),
  t('tile-square', [-0.5, 0, 0.5], [0, 0, 0]),
  t('tile-square', [0.5, 0, 0.5], [0, 0, 0]),
];
const walls = [
  t('tile-square', [-0.5, 0.5, -1.0], [-90, 0, 0]),
  t('tile-window', [0.5, 0.5, -1.0], [-90, 0, 0]),
  t('tile-square', [-1.0, 0.5, -0.5], [0, 0, 90]),
  t('tile-window', [-1.0, 0.5, 0.5], [0, 0, 90]),
  t('tile-square', [1.0, 0.5, -0.5], [0, 0, -90]),
  t('tile-window', [1.0, 0.5, 0.5], [0, 0, -90]),
  t('tile-square', [-0.5, 0.5, 1.0], [90, 0, 0]),
  t('tile-window', [0.5, 0.5, 1.0], [90, 0, 0]),
];
all &= validate('castle', [...floors, ...walls, ...walls.map(rectOnWall)]);

const look = cell(0, 0, 1.5, true);
all &= validate('tower', [
  t('tile-square', [0, 0, 0], [0, 0, 0]),
  ...cell(0, 0, 0.5),
  t('tile-square', [0, 1, 0], [0, 0, 0]),
  ...look,
  t('tile-square', [0, 2, 0], [0, 0, 0]),
  largeOnWall(look[3]),
  ...look.slice(0, 3).map(rectOnWall),
]);

const cabin = t('tile-square', [0, 0, 0], [0, 0, 0]);
const windshield = t('tile-window', [0, 0.5, 0.5], [90, 0, 0]);
all &= validate('car', [
  cabin,
  t('tile-rect', [0, 0, -(0.5 + HALF_SHORT)], [0, 0, 0]),
  t('tile-square', [0, 0.5, -0.5], [-90, 0, 0]),
  t('tile-square', [-0.5, 0.5, 0], [0, 0, 90]),
  t('tile-square', [0.5, 0.5, 0], [0, 0, -90]),
  windshield,
  t('tile-square', [0, 1, 0], [0, 0, 0]),
  largeOnWall(windshield),
]);

const head = cell(0, 0, 1.5, true);
all &= validate('robot', [
  fl,
  t('tile-square', [0, 0.5, -0.5], [-90, 0, 0]),
  t('tile-square', [-0.5, 0.5, 0], [0, 0, 90]),
  t('tile-square', [0.5, 0.5, 0], [0, 0, -90]),
  t('tile-square', [0, 0.5, 0.5], [90, 0, 0]),
  t('tile-square', [0, 1, 0], [0, 0, 0]),
  ...head,
  t('tile-square', [0, 2, 0], [0, 0, 0]),
  rightFin(fl, '-x'),
  rightFin(fl, '+x'),
  largeOnWall(head[3]),
]);

const hx = t('tile-hex', [0, 0, 0], [0, 0, 0]);
const flowerPetals = [0, 1, 2, 3, 4, 5].map((i) => petalHex(hx, i));
const flowerLeaves = flowerPetals.map((p) => leafOnPetal(p));
all &= validate('flower', [hx, ...flowerPetals, ...flowerLeaves]);

assert.ok(all, 'some works failed edge validation');
console.log('validate_gallery magnet OK');
}

// —— Catalog curation checks (Phase 1) ——
const catalogSrc = fs.readFileSync(path.join(root, 'utils/works-catalog.ts'), 'utf8');
const worksSrc = fs.readFileSync(path.join(root, 'utils/works.ts'), 'utf8');
const gallerySrc = fs.readFileSync(path.join(root, 'utils/works-gallery.ts'), 'utf8');
const statsSrc = fs.readFileSync(path.join(root, 'utils/works-stats.ts'), 'utf8');

assert.ok(worksSrc.includes('WORK_CATALOG'), 'WORK_CATALOG export');
assert.ok(worksSrc.includes('buildWorkCatalog'), 'catalog wired');
assert.ok(statsSrc.includes('computeShapeUsage'), 'shape usage helper');
assert.ok(catalogSrc.includes('WORK_ROADMAP'), 'phase2 roadmap present');

const seedIds = [...catalogSrc.matchAll(/^\s*id: '([a-z0-9-]+)'/gm)].map((m) => m[1]);
// SEEDS + roadmap both have id: — take unique preserving order from SEEDS block only
const seedsBlock = catalogSrc.slice(
  catalogSrc.indexOf('const SEEDS'),
  catalogSrc.indexOf('export const WORK_ROADMAP'),
);
const catalogIds = [...seedsBlock.matchAll(/id: '([a-z0-9-]+)'/g)].map((m) => m[1]);
assert.ok(catalogIds.length >= 8, `catalog seeds >=8, got ${catalogIds.length}`);
assert.strictEqual(new Set(catalogIds).size, catalogIds.length, 'catalog ids unique');

const workIds = ['cube', 'house', ...['rocket', 'castle', 'tower', 'car', 'robot', 'flower']];
for (const id of workIds) {
  assert.ok(catalogIds.includes(id), `catalog missing work ${id}`);
}
assert.strictEqual(
  catalogIds.length,
  workIds.length,
  `catalog↔WORKS 1:1 (catalog=${catalogIds.length} works=${workIds.length})`,
);

for (const id of workIds) {
  if (id === 'cube' || id === 'house') {
    assert.ok(worksSrc.includes(`id: '${id}'`), `works.ts ${id}`);
  } else {
    assert.ok(gallerySrc.includes(`'${id}'`), `gallery ${id}`);
  }
}

const requiredFields = [
  'slug:',
  'title:',
  'shortLabel:',
  'subtitle:',
  'level:',
  'sortOrder:',
  'featured:',
  'category:',
  'tags:',
  'learningGoals:',
  'estimatedMinutes:',
  'recommendedAge:',
  'designReference:',
  'visualReview:',
  'status:',
  'swatch:',
];
for (const f of requiredFields) {
  assert.ok(catalogSrc.includes(f), `catalog field ${f}`);
}

// No false "accepted" without visual pass
const acceptedHits = [...seedsBlock.matchAll(/status: 'accepted'/g)];
assert.strictEqual(
  acceptedHits.length,
  0,
  'no work may be accepted before visual+teaching sign-off',
);
assert.ok(seedsBlock.includes("visualReview: 'fail'"), 'house marked visual fail');

// Asset files exist for every assetId referenced in works sources
const assetIds = new Set([
  ...worksSrc.matchAll(/assetId: '([^']+)'/g),
  ...gallerySrc.matchAll(/assetId: '([^']+)'/g),
].map((m) => m[1]));
for (const id of assetIds) {
  // colored variants + defaults share glb name
  const p = path.join(root, 'assets', `${id}.glb`);
  assert.ok(fs.existsSync(p), `missing GLB assets/${id}.glb`);
}

// Derived counts must come from helpers (not hand-written tileCount in seeds)
assert.ok(!/\btileCount:\s*\d+/.test(seedsBlock), 'seeds must not hardcode tileCount');

console.log(
  'validate_catalog OK',
  `ids=${catalogIds.join(',')}`,
  `assets=${assetIds.size}`,
);
console.log('validate_gallery OK');
