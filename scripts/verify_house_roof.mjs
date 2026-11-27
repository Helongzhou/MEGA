/**
 * Square pyramid roof: four 7.5cm equilateral triangles, local tilt only.
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const r = spawnSync(
  'npx',
  [
    '--yes',
    'tsx',
    '-e',
    `
import { WORK_LITTLE_HOUSE } from './utils/works.ts';
import { edgesReallySnap } from './utils/magnet-physics.ts';
import { TRIANGLE_EDGE_MM } from './utils/tile-spec.ts';
const steps = WORK_LITTLE_HOUSE.steps;
const caps = steps.filter((s) => s.posePolicy === 'roof-cap');
if (caps.length !== 4) throw new Error('house caps '+caps.length);
if (TRIANGLE_EDGE_MM !== 75) throw new Error('triangle not 75');
for (const cap of caps) {
  if (cap.model !== 'tile-triangle') throw new Error(cap.model);
  const ok = steps.some((other) => other !== cap && edgesReallySnap(other, cap));
  if (!ok) throw new Error('cap not snapped '+cap.position);
}
console.log('verify_house_roof OK', { caps: caps.length, tiles: steps.length });
`,
  ],
  { cwd: root, encoding: 'utf8' },
);
if (r.status !== 0) {
  console.error(r.stdout);
  console.error(r.stderr);
  process.exit(r.status || 1);
}
console.log(r.stdout.trim());

const phys = fs.readFileSync(path.join(root, 'utils/magnet-physics.ts'), 'utf8');
assert.ok(phys.includes("posePolicy === 'roof-cap'"));
assert.ok(!phys.includes('house-roof'));
