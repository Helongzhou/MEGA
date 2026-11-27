/**
 * Local persistence for inventory kits, diary, and settings.
 * wx when present; in-memory otherwise (node tests).
 */
import { SHIPPED_SHAPES, type TileShapeId } from './tile-spec';
import {
  clampCount,
  emptyCounts,
  mergeCounts,
  type StockCounts,
} from './inventory-logic';

const KEY = 'mega.user.v1';

export interface InventoryKit {
  id: string;
  name: string;
  /** Included in the merged stock used by 仅看我能拼的. */
  included: boolean;
  counts: StockCounts;
}

export interface DiaryEntry {
  id: string;
  workId: string;
  title: string;
  note: string;
  /** Local temp/saved path; may expire. Empty if no photo. */
  photo: string;
  at: number;
  /** Per-entry wish. Shown publicly only when settings.publicShowcase is also on. */
  wantPublic: boolean;
}

export interface AppSettings {
  soundOn: boolean;
  hintsOn: boolean;
  /** Master switch. Default off — no public feed until a human enables it. */
  publicShowcase: boolean;
}

export interface UserState {
  kits: InventoryKit[];
  diary: DiaryEntry[];
  settings: AppSettings;
}

function defaultSettings(): AppSettings {
  return { soundOn: true, hintsOn: true, publicShowcase: false };
}

function defaultKit(): InventoryKit {
  return {
    id: 'kit-1',
    name: '第一套',
    included: true,
    counts: emptyCounts(),
  };
}

export function defaultUserState(): UserState {
  return { kits: [defaultKit()], diary: [], settings: defaultSettings() };
}

const memory: Record<string, string> = {};

function readRaw(): string {
  const w = (globalThis as { wx?: { getStorageSync?: (k: string) => unknown } }).wx;
  if (w?.getStorageSync) {
    const v = w.getStorageSync(KEY);
    if (typeof v === 'string') return v;
    if (v && typeof v === 'object') return JSON.stringify(v);
    return '';
  }
  return memory[KEY] || '';
}

function writeRaw(raw: string) {
  const w = (globalThis as { wx?: { setStorageSync?: (k: string, v: string) => void } }).wx;
  if (w?.setStorageSync) {
    w.setStorageSync(KEY, raw);
    return;
  }
  memory[KEY] = raw;
}

function normalizeCounts(raw: Partial<StockCounts> | undefined): StockCounts {
  const out = emptyCounts();
  if (!raw) return out;
  for (const id of SHIPPED_SHAPES) out[id] = clampCount(raw[id] || 0);
  return out;
}

function normalize(raw: Partial<UserState> | null): UserState {
  const base = defaultUserState();
  if (!raw) return base;
  const kits = Array.isArray(raw.kits) && raw.kits.length
    ? raw.kits.map((k, i) => ({
        id: String(k.id || `kit-${i + 1}`),
        name: String(k.name || `第${i + 1}套`),
        included: k.included !== false,
        counts: normalizeCounts(k.counts),
      }))
    : base.kits;
  const diary = Array.isArray(raw.diary)
    ? raw.diary.map((d) => ({
        id: String(d.id),
        workId: String(d.workId),
        title: String(d.title || ''),
        note: String(d.note || ''),
        photo: String(d.photo || ''),
        at: Number(d.at) || 0,
        wantPublic: !!d.wantPublic,
      }))
    : [];
  const settings: AppSettings = {
    soundOn: raw.settings?.soundOn !== false,
    hintsOn: raw.settings?.hintsOn !== false,
    publicShowcase: raw.settings?.publicShowcase === true,
  };
  return { kits, diary, settings };
}

export function loadUserState(): UserState {
  const raw = readRaw();
  if (!raw) return defaultUserState();
  try {
    return normalize(JSON.parse(raw) as Partial<UserState>);
  } catch {
    return defaultUserState();
  }
}

export function saveUserState(state: UserState) {
  writeRaw(JSON.stringify(normalize(state)));
}

/** Test hook — isolates node runs from a real wx sandbox. */
export function __resetUserStateForTest() {
  delete memory[KEY];
  saveUserState(defaultUserState());
}

export function mergedStock(state: UserState = loadUserState()): StockCounts {
  return mergeCounts(state.kits.filter((k) => k.included).map((k) => k.counts));
}

export function completionCounts(state: UserState = loadUserState()): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of state.diary) out[d.workId] = (out[d.workId] || 0) + 1;
  return out;
}

export function addKit(name?: string): UserState {
  const state = loadUserState();
  const n = state.kits.length + 1;
  state.kits.push({
    id: `kit-${Date.now()}`,
    name: name || `第${n}套`,
    included: true,
    counts: emptyCounts(),
  });
  saveUserState(state);
  return state;
}

export function patchKit(
  kitId: string,
  patch: Partial<Pick<InventoryKit, 'name' | 'included' | 'counts'>>,
): UserState {
  const state = loadUserState();
  const kit = state.kits.find((k) => k.id === kitId);
  if (!kit) return state;
  if (patch.name != null) kit.name = patch.name;
  if (patch.included != null) kit.included = patch.included;
  if (patch.counts) kit.counts = normalizeCounts(patch.counts);
  saveUserState(state);
  return state;
}

export function bumpShape(kitId: string, shape: TileShapeId, delta: number): UserState {
  const state = loadUserState();
  const kit = state.kits.find((k) => k.id === kitId);
  if (!kit) return state;
  kit.counts[shape] = clampCount((kit.counts[shape] || 0) + delta);
  saveUserState(state);
  return state;
}

export function resetKits(): UserState {
  const state = defaultUserState();
  const prev = loadUserState();
  state.diary = prev.diary;
  state.settings = prev.settings;
  saveUserState(state);
  return state;
}

export function addDiary(entry: Omit<DiaryEntry, 'id' | 'at' | 'wantPublic'> & { wantPublic?: boolean }): DiaryEntry {
  const state = loadUserState();
  const row: DiaryEntry = {
    id: `d-${Date.now()}`,
    workId: entry.workId,
    title: entry.title,
    note: entry.note || '',
    photo: entry.photo || '',
    at: Date.now(),
    wantPublic: entry.wantPublic === true,
  };
  state.diary.unshift(row);
  saveUserState(state);
  return row;
}

export function setDiaryPublic(id: string, wantPublic: boolean): UserState {
  const state = loadUserState();
  const row = state.diary.find((d) => d.id === id);
  if (row) row.wantPublic = wantPublic;
  saveUserState(state);
  return state;
}

export function saveSettings(patch: Partial<AppSettings>): UserState {
  const state = loadUserState();
  state.settings = { ...state.settings, ...patch };
  if (patch.publicShowcase !== true && patch.publicShowcase !== undefined) {
    state.settings.publicShowcase = patch.publicShowcase;
  }
  saveUserState(state);
  return state;
}

/** Entries eligible for 大家的作品. Empty unless the master switch is on. */
export function publicDiary(state: UserState = loadUserState()): DiaryEntry[] {
  if (!state.settings.publicShowcase) return [];
  return state.diary.filter((d) => d.wantPublic);
}
