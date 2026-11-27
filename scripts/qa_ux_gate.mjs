/**
 * Hard UX gate — blocks known anti-patterns.
 * Visual acceptance still requires 真机/模拟器截图证明顶底栏可见。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const failures = [];
const fail = (msg) => failures.push(msg);

const wxml = fs.readFileSync(path.join(root, 'pages/build/index.wxml'), 'utf8');
const wxss = fs.readFileSync(path.join(root, 'pages/build/index.wxss'), 'utf8');
const pageTs = fs.readFileSync(path.join(root, 'pages/build/index.ts'), 'utf8');

if (wxml.includes('<cover-view')) {
  fail('cover-view over xr-frame is banned (DevTools + many devices unreliable)');
}

if (!wxml.includes('class="stage"') || !wxml.includes('stageHeight')) {
  fail('chrome must reserve layout space via stageHeight (not fullscreen overlay)');
}

if (!pageTs.includes('topChromeHeight') || !pageTs.includes('bottomChromeHeight')) {
  fail('page must compute topChromeHeight + bottomChromeHeight');
}

// xr height must be stageHeight, never full window height binding alone
if (!wxml.includes('height:{{stageHeight}}px')) {
  fail('xr-builder style height must be stageHeight (constrained band)');
}
if (/style="[^"]*height:\{\{height\}\}px/.test(wxml)) {
  fail('xr-builder must not use full window {{height}} (covers chrome)');
}

for (const icon of ['play', 'pause', 'replay', 'prev', 'next']) {
  if (!wxml.includes(`/assets/icons/${icon}.png`)) {
    fail(`missing toolbar icon: ${icon}`);
  }
}
if (!wxml.includes("aria-label=\"{{completed || showcasing ? '重播'")) {
  fail('play button must expose 重播/播放/暂停 via aria-label');
}
if ((!wxml.includes('showcaseHint') && !wxml.includes('hintText')) || !pageTs.includes('看一看')) {
  fail('top chrome must show a showcase hint');
}
if (!wxss.includes('icon-btn--pulse') || !wxss.includes('progress-fill--done')) {
  fail('complete ritual styles (pulse + done progress) required');
}
if (!wxml.includes('muted=') || !pageTs.includes('onToggleMute')) {
  fail('mute control required (default unmuted, watch stays default mode)');
}
if (!wxml.includes('onToggleMode') || !pageTs.includes("mode: 'watch'")) {
  fail('watch/manual mode entry required; watch must remain default');
}
if (!wxml.includes('stage-mask') || !pageTs.includes('sceneReady')) {
  fail('XR loading / empty / error stage masks required');
}
if (wxml.includes('<cover-view')) {
  fail('cover-view still banned after UI 2.0');
}
if (!wxml.includes('aria-label="上一步"') || !wxml.includes('aria-label="下一步"')) {
  fail('prev/next must keep aria-label 上一步/下一步');
}
if (!pageTs.includes('SPEED_PRESETS') || !pageTs.includes('speedPresets')) {
  fail('toolbar must use SPEED_PRESETS (1s/3s/5s)');
}
if (!pageTs.includes('WORK_LABELS') || !pageTs.includes('function workTitle')) {
  fail('page must resolve the current work name via workTitle');
}
if (!pageTs.includes('WORK_TITLES') || !pageTs.includes('progressPct')) {
  fail('UI 2.0 requires WORK_TITLES + real progressPct from builder state');
}
if (!wxml.includes('progress-fill') || !wxml.includes('brand-row')) {
  fail('top chrome must include brand-row and progress bar');
}
if (!wxml.includes('activeWorkTitle')) {
  fail('detail chrome must show the current work title');
}
if (wxml.includes('work-switcher') || wxml.includes('onSwitchWork')) {
  fail('detail page must not switch to other works');
}

if (!wxss.includes('flex-direction: column') && !wxss.includes('flex-direction:column')) {
  fail('page should be column flex so chrome owns real rows');
}

const tokensPath = path.join(root, 'styles/tokens.wxss');
if (!fs.existsSync(tokensPath)) {
  fail('UI 2.0 requires styles/tokens.wxss design tokens');
} else {
  const tokens = fs.readFileSync(tokensPath, 'utf8');
  if (!tokens.includes('--mega-chrome') || !tokens.includes('--mega-stage')) {
    fail('tokens must define --mega-chrome and --mega-stage');
  }
}
if (!wxss.includes('tokens.wxss') && !wxss.includes('var(--mega-chrome)')) {
  fail('build page wxss must use design tokens');
}

// Tab home (plaza) relies on native page scroll; global page overflow:hidden blocks it.
const appWxss = fs.readFileSync(path.join(root, 'app.wxss'), 'utf8');
const appWxssCode = appWxss.replace(/\/\*[\s\S]*?\*\//g, '');
const pageBlock = appWxssCode.match(/page\s*\{[^}]*\}/);
// Only ban unqualified overflow:hidden (overflow-x:hidden is fine).
if (pageBlock && /(^|[^-\w])overflow\s*:\s*hidden\b/.test(pageBlock[0])) {
  fail('app.wxss page must not use overflow:hidden (blocks plaza/home scroll)');
}
const buildJson = JSON.parse(
  fs.readFileSync(path.join(root, 'pages/build/index.json'), 'utf8'),
);
if (!buildJson.disableScroll) {
  fail('build page must keep disableScroll so XR stage does not bounce-scroll');
}

if (failures.length) {
  console.error('UX GATE FAILED:');
  failures.forEach((f) => console.error(' -', f));
  process.exit(1);
}

console.log('UX GATE PASSED (static).');
console.log(
  'VISUAL REQUIRED (真机): MEGA brand + work titles + progress; cream stage; toolbar play/prev/next/mute/mode + 1s/3s/5s; showcase pulse; no chrome over XR.',
);
process.exit(0);
