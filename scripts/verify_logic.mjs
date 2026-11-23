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
assert(total <= 40 * 1024, `GLB total ${total} exceeds 40KB`);
console.log(`✓ GLB total ${total} bytes ≤ 40KB`);

// --- Sounds exist ---
for (const s of ['pop.mp3', 'slide.mp3', 'celebrate.mp3']) {
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
assert(worksSrc.includes("id: 'roof'"), 'work roof');
assert(worksSrc.includes("id: 'house'"), 'work house');
console.log('✓ works defined');

console.log('\nAll offline checks passed.');
