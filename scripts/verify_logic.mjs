/**
 * Offline checks for asset sizes + gotoStep semantics (no WeChat runtime).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// --- Asset size ---
const assetsDir = path.join(root, 'assets');
const glbs = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.glb'));
let total = 0;
for (const f of glbs) {
  const n = fs.statSync(path.join(assetsDir, f)).size;
  total += n;
  console.log(`  ${f}: ${n} bytes`);
}
// Full 7.5cm shape set (7 kinds × colors) ≈ 80KB; keep under mini-program soft budget.
assert(total <= 120 * 1024, `GLB total ${total} exceeds 120KB`);
console.log(`✓ GLB total ${total} bytes ≤ 120KB`);

// --- Sounds exist ---
for (const s of ['pop.mp3', 'slide.mp3', 'celebrate.mp3', 'ambient.mp3']) {
  const p = path.join(root, 'sounds', s);
  assert(fs.existsSync(p), `missing ${s}`);
}
console.log('✓ sound files present');

// --- gotoStep pure semantics ---
function simulateGoto(stepsLen, index) {
  const clamped = Math.max(-1, Math.min(stepsLen, index));
  const visible = [];
  for (let i = 0; i < stepsLen; i++) visible.push(i < clamped);
  return visible;
}

assert(
  JSON.stringify(simulateGoto(3, -1)) === JSON.stringify([false, false, false]),
  'gotoStep(-1)',
);
assert(
  JSON.stringify(simulateGoto(3, 1)) === JSON.stringify([true, false, false]),
  'gotoStep(1)',
);
assert(
  JSON.stringify(simulateGoto(3, 3)) === JSON.stringify([true, true, true]),
  'gotoStep(3)',
);
console.log('✓ gotoStep visibility semantics');

// --- Work step counts ---
const worksSrc = fs.readFileSync(path.join(root, 'utils/works.ts'), 'utf8');
assert(worksSrc.includes("id: 'cube'"), 'work cube');
assert(worksSrc.includes("id: 'house'"), 'work house');
assert(worksSrc.includes('flyFrom'), 'flyFrom field');
assert(worksSrc.includes('camera:'), 'camera field');
assert(worksSrc.includes('sortBuildSteps'), 'shared back-to-front sorter');
assert(worksSrc.includes('GALLERY_WORKS'), 'gallery works wired');
assert(worksSrc.includes('WORK_CATALOG'), 'works catalog wired');
assert(
  fs.existsSync(path.join(root, 'utils/works-catalog.ts')),
  'works-catalog.ts present',
);
assert(!worksSrc.includes('highlight:'), 'no highlight (removed)');
const gallerySrc = fs.readFileSync(path.join(root, 'utils/works-gallery.ts'), 'utf8');
for (const id of ['rocket', 'castle', 'tower', 'car', 'robot', 'flower']) {
  assert(gallerySrc.includes(`'${id}'`), `gallery ${id}`);
}
// Cube authored order: floor → back → L → R → front → lid
{
  const block = worksSrc.slice(
    worksSrc.indexOf('WORK_CUBE'),
    worksSrc.indexOf('WORK_LITTLE_HOUSE'),
  );
  const pos = [...block.matchAll(/model:[\s\S]*?position: \[([^\]]+)\]/g)].map(
    (m) => m[1].replace(/\s/g, ''),
  );
  assert(pos[0] === '0,0,0', `cube floor first: ${pos[0]}`);
  assert(pos[1] === '0,0.5,-0.5', `cube back second: ${pos[1]}`);
  assert(pos[2] === '-0.5,0.5,0', `cube left third: ${pos[2]}`);
  assert(pos[3] === '0.5,0.5,0', `cube right fourth: ${pos[3]}`);
  assert(pos[4] === '0,0.5,0.5', `cube front fifth: ${pos[4]}`);
  assert(pos[5] === '0,1.0,0', `cube lid last: ${pos[5]}`);
}
console.log('✓ works defined (cube + house + gallery)');

console.log('\nAll offline checks passed.');
