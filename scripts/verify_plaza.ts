/**
 * Gate 2 machine checks: strict stock match, merge, hot badge, public switch default off.
 */
import { SHIPPED_SHAPES } from '../utils/tile-spec';
import {
  canBuild,
  emptyCounts,
  filterPlaza,
  isHot,
  mergeCounts,
  type PlazaCandidate,
} from '../utils/inventory-logic';
import {
  __resetUserStateForTest,
  addDiary,
  addKit,
  bumpShape,
  loadUserState,
  mergedStock,
  publicDiary,
  saveSettings,
} from '../utils/user-store';

__resetUserStateForTest();

function assertEq(actual: unknown, expected: unknown, msg: string) {
  if (actual !== expected) {
    throw new Error(`${msg}: ${String(actual)} !== ${String(expected)}`);
  }
}

const stock = emptyCounts();
stock.square = 6;
assertEq(canBuild({ square: 6 }, stock), true, 'exact stock builds');
assertEq(canBuild({ square: 7 }, stock), false, 'short one fails');
assertEq(canBuild({ square: 1, window: 1 }, stock), false, 'missing shape fails');

const a = emptyCounts();
const b = emptyCounts();
a.square = 2;
b.square = 3;
b.hexagon = 1;
const merged = mergeCounts([a, b]);
assertEq(merged.square, 5, 'merge square');
assertEq(merged.hexagon, 1, 'merge hex');
assertEq(isHot(2), false, 'not hot yet');
assertEq(isHot(3), true, 'hot at 3');

const sample: PlazaCandidate[] = [
  {
    id: 'cube',
    title: '方块',
    subtitle: '盒子',
    tags: ['入门'],
    form: 'solid',
    themes: ['daily'],
    sortOrder: 10,
    tileCount: 6,
    level: 'L1',
    shapeUsage: { square: 6 },
    swatch: ['#4ECDC4', '#FFE66D'],
    shortLabel: '方',
  },
  {
    id: 'flower',
    title: '小花',
    subtitle: '平面',
    tags: ['花'],
    form: 'flat',
    themes: ['plant'],
    sortOrder: 20,
    tileCount: 13,
    level: 'L1',
    shapeUsage: { hexagon: 1, triangle: 12 },
    swatch: ['#F38181', '#95E1D3'],
    shortLabel: '花',
  },
];

const onlyCube = filterPlaza(
  sample,
  { keyword: '', form: 'all', theme: 'all', sort: 'hot', onlyBuildable: true },
  stock,
  {},
);
assertEq(onlyCube.map((r) => r.id).join(','), 'cube', 'only buildable cube');

const flat = filterPlaza(
  sample,
  { keyword: '花', form: 'flat', theme: 'plant', sort: 'new', onlyBuildable: false },
  stock,
  { flower: 3 },
);
assertEq(flat.length, 1, 'keyword filter');
assertEq(flat[0].hot, true, 'flower hot');

const fresh = loadUserState();
assertEq(fresh.settings.publicShowcase, false, 'public default off');
assertEq(fresh.settings.soundOn, true, 'sound default on');
assertEq(publicDiary(fresh).length, 0, 'no public rows');

bumpShape('kit-1', 'square', 4);
addKit('第二套');
const after = loadUserState();
const kit2 = after.kits[1];
bumpShape(kit2.id, 'square', 2);
const sum = mergedStock(loadUserState());
assertEq(sum.square, 6, 'included kits merge');

addDiary({ workId: 'cube', title: '方块', note: '好看', photo: '' });
const withDiary = loadUserState();
assertEq(publicDiary(withDiary).length, 0, 'private diary stays hidden');
saveSettings({ publicShowcase: true });
assertEq(publicDiary(loadUserState()).length, 0, 'master on but entry not public');

if (SHIPPED_SHAPES.length < 7) throw new Error('shapes');
console.log('verify_plaza OK', {
  shapes: SHIPPED_SHAPES.length,
  strictMiss: true,
  hotAt: 3,
  publicDefault: false,
});
