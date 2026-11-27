/**
 * Shell-page interaction smoke: handlers exist, filters work, no throw.
 * Node-only; does not launch WeChat.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function pageFiles(name) {
  const dir = join(root, 'pages', name);
  return {
    wxml: readFileSync(join(dir, 'index.wxml'), 'utf8'),
    ts: readFileSync(join(dir, 'index.ts'), 'utf8'),
    wxss: readFileSync(join(dir, 'index.wxss'), 'utf8'),
  };
}

function handlers(wxml) {
  const names = new Set();
  // bind:state / catchtap / bindinput / bindchange
  for (const m of wxml.matchAll(/\b(?:catch|bind)(?::[\w-]+|tap|input|change|longpress)\s*=\s*"(\w+)"/g)) {
    names.add(m[1]);
  }
  return [...names];
}

function hasMethod(ts, name) {
  return new RegExp(`\\b${name}\\s*\\(`).test(ts);
}

const pages = ['plaza', 'inventory', 'diary', 'settings', 'build'];
const missing = [];
for (const name of pages) {
  const { wxml, ts } = pageFiles(name);
  for (const h of handlers(wxml)) {
    if (!hasMethod(ts, h)) missing.push(`${name}:${h}`);
  }
}
assert.equal(missing.length, 0, `missing handlers: ${missing.join(', ')}`);

const plaza = pageFiles('plaza');
assert.match(plaza.wxss, /\.badge--hot/);
assert.match(plaza.wxss, /left:\s*12rpx/);
assert.match(plaza.wxml, /badge--hot/);
assert.match(plaza.wxml, /wx:if="\{\{continueCard\}\}"/);
assert.match(plaza.ts, /_refresh\(patch/);

const inv = pageFiles('inventory');
for (const h of ['onBump', 'onInclude', 'onPickKit', 'onAddKit', 'onReset', 'onPhotoPromo']) {
  assert.ok(hasMethod(inv.ts, h), h);
}
assert.match(inv.wxss, /clay\.wxss/);

const diary = pageFiles('diary');
assert.ok(hasMethod(diary.ts, 'onGoPlaza'));
assert.ok(hasMethod(diary.ts, 'onRebuild'));
assert.ok(hasMethod(diary.ts, 'onPublic'));
assert.match(diary.wxml, /badges/);

const settings = pageFiles('settings');
assert.ok(hasMethod(settings.ts, 'onSound'));
assert.ok(hasMethod(settings.ts, 'onHints'));
assert.ok(hasMethod(settings.ts, 'onPublic'));
assert.ok(hasMethod(settings.ts, 'onReset'));
assert.match(settings.ts, /this\.onShow\(\)/);

const app = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8'));
assert.deepEqual(
  app.tabBar.list.map((t) => t.text),
  ['首页', '片盒', '成就', '我的'],
);
for (const t of app.tabBar.list) {
  const page = t.pagePath.split('/')[1];
  assert.ok(existsSync(join(root, 'pages', page, 'index.ts')), page);
  assert.ok(existsSync(join(root, t.iconPath)), t.iconPath);
  assert.ok(existsSync(join(root, t.selectedIconPath)), t.selectedIconPath);
}

assert.ok(existsSync(join(root, 'styles/clay.wxss')));

console.log('smoke_shell OK', {
  pages,
  plazaHandlers: handlers(plaza.wxml),
  inventoryHandlers: handlers(inv.wxml),
  diaryHandlers: handlers(diary.wxml),
  settingsHandlers: handlers(settings.wxml),
  buildHandlers: handlers(pageFiles('build').wxml),
});
