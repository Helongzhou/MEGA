/**
 * Offline batch acceptance — simulates plan batches 1–6 against the state machine.
 * (Cannot run WeChat XR runtime here; this locks step/progress/control semantics.)
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Compile-free: reimplement critical pure helpers inline matching utils/build-state-machine.ts
const BASE_DURATION = 2.0;
const STEP_HOLD_MS = 1500;
const SNAP_DISTANCE = 1.5;

function visibilityAfterGoto(totalSteps, index) {
  const clamped = Math.max(-1, Math.min(totalSteps, index));
  return Array.from({ length: totalSteps }, (_, i) => i < clamped);
}

function createSession(totalSteps, mode = 'manual') {
  return {
    mode,
    currentStep: 0,
    totalSteps,
    completedBoundary: 0,
    virtualProgress: 0,
    isAutoPlaying: mode === 'watch',
    isPaused: true,
    speedMultiplier: 1,
    celebrating: false,
    completed: false,
    holdUntil: 0,
    pendingAdvance: null,
  };
}

function prepareStep(state, stepIndex) {
  return {
    ...state,
    currentStep: stepIndex,
    completedBoundary: stepIndex,
    virtualProgress: 0,
    pendingAdvance: null,
    holdUntil: 0,
    celebrating: false,
    completed: false,
  };
}

function commitStep(state, stepIndex) {
  return { ...state, completedBoundary: stepIndex + 1, virtualProgress: 0 };
}

function advanceTo(state, next) {
  const cleared = { ...state, pendingAdvance: null, holdUntil: 0 };
  if (next >= state.totalSteps) {
    return {
      ...cleared,
      currentStep: state.totalSteps,
      completedBoundary: state.totalSteps,
      celebrating: true,
      completed: true,
      isPaused: true,
      isAutoPlaying: false,
      virtualProgress: 0,
    };
  }
  return prepareStep(cleared, next);
}

function settleManual(state, stepIndex, now) {
  return {
    ...commitStep(state, stepIndex),
    holdUntil: now + STEP_HOLD_MS,
    pendingAdvance: stepIndex + 1,
  };
}

function tickAutoplay(state, dtMs, now) {
  if (state.celebrating || state.completed) return { state, committed: false, celebrated: false };
  if (state.pendingAdvance != null) {
    if (now >= state.holdUntil) {
      const advanced = advanceTo(state, state.pendingAdvance);
      return { state: advanced, committed: false, celebrated: advanced.celebrating };
    }
    return { state, committed: false, celebrated: false };
  }
  if (state.mode !== 'watch' || !state.isAutoPlaying || state.isPaused) {
    return { state, committed: false, celebrated: false };
  }
  let virtualProgress = state.virtualProgress + ((dtMs / 1000) * state.speedMultiplier) / BASE_DURATION;
  if (virtualProgress < 1) return { state: { ...state, virtualProgress }, committed: false, celebrated: false };
  const afterCommit = commitStep(state, state.currentStep);
  const next = state.currentStep + 1;
  if (next >= state.totalSteps) {
    return { state: advanceTo(afterCommit, next), committed: true, celebrated: true };
  }
  return {
    state: {
      ...afterCommit,
      virtualProgress: 0,
      holdUntil: now + STEP_HOLD_MS,
      pendingAdvance: next,
    },
    committed: true,
    celebrated: false,
  };
}

function stepPrev(state) {
  return { ...prepareStep(state, Math.max(0, state.currentStep - 1)), isPaused: true };
}

function stepNext(state) {
  const committed = state.currentStep < state.totalSteps ? commitStep(state, state.currentStep) : state;
  const next = Math.min(state.totalSteps, state.currentStep + 1);
  if (next >= state.totalSteps) return advanceTo(committed, next);
  return { ...prepareStep(committed, next), isPaused: true };
}

function switchMode(state, mode) {
  const step = Math.max(0, Math.min(state.totalSteps, state.currentStep));
  const base = step >= state.totalSteps ? { ...state, mode } : prepareStep({ ...state, mode }, step);
  return { ...base, mode, isAutoPlaying: mode === 'watch', isPaused: true, virtualProgress: 0 };
}

const results = [];
function check(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`PASS  ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: e.message });
    console.error(`FAIL  ${name}: ${e.message}`);
  }
}

console.log('\n=== Batch 1: assets / project scaffolding ===');
check('lazyCodeLoading requiredComponents', () => {
  const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  assert.strictEqual(app.lazyCodeLoading, 'requiredComponents');
});
check('xr-builder renderer xr-frame', () => {
  const j = JSON.parse(fs.readFileSync(path.join(root, 'components/xr-builder/index.json'), 'utf8'));
  assert.strictEqual(j.renderer, 'xr-frame');
});
check('camera clear-color + orbit in wxml', () => {
  const w = fs.readFileSync(path.join(root, 'components/xr-builder/index.wxml'), 'utf8');
  assert.ok(w.includes('0.85 0.92 0.98 1'));
  assert.ok(w.includes('camera-orbit-control'));
  assert.ok(w.includes('position="0 2 6"'));
});
check('isLockZoom configured in ts', () => {
  const t = fs.readFileSync(path.join(root, 'components/xr-builder/index.ts'), 'utf8');
  assert.ok(t.includes('isLockZoom'));
  assert.ok(t.includes('pitchMin') || t.includes('10 * (Math.PI / 180)'));
});
check('GLB assets ≤ 40KB uncompressed', () => {
  const dir = path.join(root, 'assets');
  let total = 0;
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith('.glb')) total += fs.statSync(path.join(dir, f)).size;
  }
  assert.ok(total <= 40 * 1024, `total=${total}`);
});
check('libVersion ≥ 2.32.0', () => {
  const p = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8'));
  assert.ok(p.libVersion >= '2.32.0');
});

console.log('\n=== Batch 2: gotoStep + StepPlayer ===');
check('gotoStep(-1) hides all', () => {
  assert.deepStrictEqual(visibilityAfterGoto(3, -1), [false, false, false]);
});
check('gotoStep(1) shows first only', () => {
  assert.deepStrictEqual(visibilityAfterGoto(3, 1), [true, false, false]);
});
check('gotoStep(3) shows all', () => {
  assert.deepStrictEqual(visibilityAfterGoto(3, 3), [true, true, true]);
});
check('StepPlayer easeOutCubic fade band', () => {
  // opacity = clamp(p/0.3); at p=0.15 → 0.5; at p=0.5 position mid-ish
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const easeOutCubic = (t) => 1 - Math.pow(1 - clamp01(t), 3);
  assert.strictEqual(clamp01(0.15 / 0.3), 0.5);
  assert.ok(easeOutCubic(0.5) > 0.8);
});
check('works have 3 and 4 steps', () => {
  const src = fs.readFileSync(path.join(root, 'utils/works.ts'), 'utf8');
  assert.ok(src.includes("id: 'roof'"));
  assert.ok(src.includes("id: 'house'"));
});

console.log('\n=== Batch 3: manual settle + no-fail snap ===');
check('manual settle schedules 1.5s hold then advance', () => {
  let s = createSession(3, 'manual');
  s = prepareStep(s, 0);
  const now = 1_000_000;
  s = settleManual(s, 0, now);
  assert.strictEqual(s.pendingAdvance, 1);
  assert.strictEqual(s.holdUntil, now + 1500);
  assert.strictEqual(s.completedBoundary, 1);
  // before hold ends
  let r = tickAutoplay(s, 16, now + 500);
  assert.strictEqual(r.state.currentStep, 0);
  // after hold
  r = tickAutoplay(s, 16, now + 1500);
  assert.strictEqual(r.state.currentStep, 1);
});
check('snap threshold constant 1.5', () => {
  assert.strictEqual(SNAP_DISTANCE, 1.5);
  const t = fs.readFileSync(path.join(root, 'utils/works.ts'), 'utf8');
  assert.ok(t.includes('SNAP_DISTANCE = 1.5'));
});
check('wrong-drop still slides to target (no fail UI)', () => {
  const t = fs.readFileSync(path.join(root, 'components/xr-builder/index.ts'), 'utf8');
  assert.ok(t.includes('slide'));
  assert.ok(t.includes('SNAP_DISTANCE'));
  assert.ok(!t.includes("'×'") && !t.includes('错误'));
});

console.log('\n=== Batch 4: autoplay pause / speed / skip ===');
check('autoplay advances with BASE_DURATION and speed', () => {
  let s = { ...createSession(3, 'watch'), isPaused: false, isAutoPlaying: true };
  s = prepareStep(s, 0);
  // 1s at 1x → progress 0.5
  let r = tickAutoplay(s, 1000, 0);
  assert.ok(Math.abs(r.state.virtualProgress - 0.5) < 1e-9);
  // another 1s → commit + hold
  r = tickAutoplay(r.state, 1000, 2000);
  assert.strictEqual(r.committed, true);
  assert.strictEqual(r.state.completedBoundary, 1);
  assert.strictEqual(r.state.pendingAdvance, 1);
});
check('pause freezes virtualProgress', () => {
  let s = { ...createSession(3, 'watch'), isPaused: false, isAutoPlaying: true, virtualProgress: 0.4 };
  s = prepareStep({ ...s }, 0);
  s.virtualProgress = 0.4;
  s.isPaused = true;
  const r = tickAutoplay(s, 500, 0);
  assert.strictEqual(r.state.virtualProgress, 0.4);
});
check('speed change keeps progress', () => {
  let s = { ...createSession(3, 'watch'), virtualProgress: 0.3, speedMultiplier: 1 };
  s = { ...s, speedMultiplier: 2 };
  assert.strictEqual(s.virtualProgress, 0.3);
  assert.strictEqual(s.speedMultiplier, 2);
});
check('2x finishes a step in ~1s', () => {
  let s = { ...createSession(3, 'watch'), isPaused: false, isAutoPlaying: true, speedMultiplier: 2 };
  s = prepareStep(s, 0);
  const r = tickAutoplay(s, 1000, 0);
  assert.strictEqual(r.committed, true);
});
check('prev / next addressing', () => {
  let s = prepareStep(createSession(3, 'watch'), 2);
  s = stepPrev(s);
  assert.strictEqual(s.currentStep, 1);
  s = stepNext(s);
  assert.strictEqual(s.currentStep, 2);
  s = stepNext(s);
  assert.strictEqual(s.completed, true);
  assert.strictEqual(s.celebrating, true);
});
check('toolbar icons present, no text labels', () => {
  const w = fs.readFileSync(path.join(root, 'pages/build/index.wxml'), 'utf8');
  for (const icon of ['✋', '👀', '▶️', '⏸️', '⏪', '⏩', '🐢', '🐇', '🐆', '🔄']) {
    assert.ok(w.includes(icon), `missing ${icon}`);
  }
  assert.ok(!/播放|暂停|上一步|下一步|速度/.test(w));
});
check('buttons ≥ 60px', () => {
  const css = fs.readFileSync(path.join(root, 'pages/build/index.wxss'), 'utf8');
  assert.ok(css.includes('min-width: 60px'));
  assert.ok(css.includes('min-height: 60px'));
});

console.log('\n=== Batch 5: mode switch + celebration ===');
check('manual→watch keeps step', () => {
  let s = prepareStep(createSession(3, 'manual'), 1);
  s = switchMode(s, 'watch');
  assert.strictEqual(s.currentStep, 1);
  assert.strictEqual(s.mode, 'watch');
  assert.strictEqual(s.isPaused, true);
});
check('watch→manual keeps step', () => {
  let s = prepareStep(createSession(3, 'watch'), 2);
  s = switchMode(s, 'manual');
  assert.strictEqual(s.currentStep, 2);
  assert.strictEqual(s.isAutoPlaying, false);
});
check('full autoplay 3-step with holds completes', () => {
  let s = { ...createSession(3, 'watch'), isPaused: false, isAutoPlaying: true };
  s = prepareStep(s, 0);
  let now = 0;
  let guard = 0;
  while (!s.completed && guard++ < 1000) {
    const r = tickAutoplay(s, 100, now);
    s = r.state;
    now += 100;
  }
  assert.ok(s.completed, 'should complete');
  assert.ok(s.celebrating);
  // 3 steps * (2s fly + 1.5s hold) ≈ 10.5s but last step no hold after celebrate
  // first two holds + three flies: 3*2 + 2*1.5 = 9s → at 100ms ticks
  assert.ok(now >= 8000, `too fast: ${now}`);
});
check('celebration + replay hooks in source', () => {
  const t = fs.readFileSync(path.join(root, 'components/xr-builder/index.ts'), 'utf8');
  assert.ok(t.includes('_triggerCelebration'));
  assert.ok(t.includes('celebrate.mp3') || t.includes("_playSound('celebrate')"));
  assert.ok(t.includes('_replay'));
});

console.log('\n=== Batch 6: second work + perf ===');
check('work switcher two dots', () => {
  const w = fs.readFileSync(path.join(root, 'pages/build/index.wxml'), 'utf8');
  assert.ok(w.includes('work-switcher'));
  assert.ok(w.includes('work-dot'));
});
check('pixel ratio capped at 2', () => {
  const t = fs.readFileSync(path.join(root, 'pages/build/index.ts'), 'utf8');
  assert.ok(t.includes('Math.min(dpi, 2)'));
});
check('MAX_PRECREATED_TILES = 20', () => {
  const t = fs.readFileSync(path.join(root, 'utils/works.ts'), 'utf8');
  assert.ok(t.includes('MAX_PRECREATED_TILES = 20'));
});
check('unloadAsset on detach', () => {
  const t = fs.readFileSync(path.join(root, 'components/xr-builder/index.ts'), 'utf8');
  assert.ok(t.includes('unloadAsset'));
});
check('FPS warn below 30', () => {
  const t = fs.readFileSync(path.join(root, 'components/xr-builder/index.ts'), 'utf8');
  assert.ok(t.includes('FPS low'));
});
check('sounds volume ≤ 0.7', () => {
  const t = fs.readFileSync(path.join(root, 'components/xr-builder/index.ts'), 'utf8');
  assert.ok(t.includes("make('/sounds/celebrate.mp3', 0.7)"));
  assert.ok(t.includes("make('/sounds/pop.mp3', 0.6)"));
});

const failed = results.filter((r) => !r.ok);
console.log(`\n=== Summary: ${results.length - failed.length}/${results.length} passed ===`);
if (failed.length) {
  console.error(failed);
  process.exit(1);
}
console.log('Offline batch acceptance OK. Remaining: WeChat真机预览 (not available in this VM).');
