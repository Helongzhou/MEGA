/**
 * Offline magnet gate: gallery source + real-edge validation (MAG-002).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const src = fs.readFileSync(path.join(root, 'utils/works-gallery.ts'), 'utf8');
assert.ok(!/\[(?:55|50|70|80|-55|-70|-50)\s*,/.test(src), 'gallery still has unstable tilt angles');
assert.ok(src.includes('validateMagnetBuild'), 'gallery must call validateMagnetBuild');
assert.ok(src.includes('TRIANGLE_EDGE') || src.includes('TRI_CENTROID') || src.includes('D71') || src.includes('petalOnHex'), 'dual-geometry flower helpers');
assert.ok(src.includes('tile-hex') || src.includes("'tile-hex'"), 'hex shape used');
assert.ok(src.includes('tile-window') || src.includes("'tile-window'"), 'window shape used');
assert.ok(src.includes('tile-large') || src.includes("'tile-large'"), 'large triangle used');
assert.ok(src.includes('tile-rect') || src.includes("'tile-rect'"), 'rectangle used');
assert.ok(src.includes('leafOnPetalOuter'), 'flower outer-leaf helper');

const phys = fs.readFileSync(path.join(root, 'utils/magnet-physics.ts'), 'utf8');
assert.ok(
  phys.includes('isSquareGridModel'),
  'M-grid edgesSnap heuristic must be square-family only (flower 71mm false neighbors)',
);

const spec = fs.readFileSync(path.join(root, 'utils/tile-spec.ts'), 'utf8');
assert.ok(spec.includes('TRIANGLE_EDGE_MM = M_MM'), 'equilateral edge is 7.5 cm');
assert.ok(spec.includes('M_MM = 75'), 'modulus 75mm');
assert.ok(spec.includes('dual') || spec.includes('Dual') || spec.includes('逻辑'), 'dual geometry documented');

const r = spawnSync(process.execPath, [path.join(root, 'scripts/validate_gallery.mjs')], {
  cwd: root,
  encoding: 'utf8',
});
if (r.status !== 0) {
  console.error(r.stdout);
  console.error(r.stderr);
  process.exit(r.status || 1);
}
console.log(r.stdout.trim().split('\n').filter((l) => l.startsWith('OK') || l.includes('validate')).join('\n'));

const houseRoof = spawnSync(process.execPath, [path.join(root, 'scripts/verify_house_roof.mjs')], {
  cwd: root,
  encoding: 'utf8',
});
if (houseRoof.status !== 0) {
  console.error(houseRoof.stdout);
  console.error(houseRoof.stderr);
  process.exit(houseRoof.status || 1);
}
console.log(houseRoof.stdout.trim());
console.log('All magnet physics checks passed.');
