import { SHIPPED_SHAPES } from '../../utils/tile-spec';
import { WORK_CATALOG } from '../../utils/works';
import {
  filterPlaza,
  type PlazaCandidate,
  type PlazaSort,
  type StockCounts,
} from '../../utils/inventory-logic';
import { completionCounts, loadUserState, mergedStock, publicDiary } from '../../utils/user-store';

const FORMS = [
  { id: 'all', label: '全部' },
  { id: 'solid', label: '立体' },
  { id: 'flat', label: '平面' },
  { id: 'track', label: '轨道' },
];

const THEMES = [
  { id: 'all', label: '全部' },
  { id: 'animal', label: '动物' },
  { id: 'building', label: '建筑' },
  { id: 'produce', label: '蔬果' },
  { id: 'home', label: '家居电器' },
];

const THEME_MATCH: Record<string, string[] | null> = {
  all: null,
  animal: ['animal'],
  building: ['building'],
  produce: ['vegetable', 'fruit', 'plant'],
  home: ['appliance', 'daily', 'furniture'],
};

const HOME_CATS = [
  { id: 'all', label: '全部' },
  { id: 'basic', label: '基础认知' },
  { id: 'castle', label: '立体城堡' },
  { id: 'ride', label: '交通工具' },
  { id: 'light', label: '窗和房子' },
];

const HOME_IDS: Record<string, string[] | null> = {
  all: null,
  basic: ['cube', 'flower'],
  castle: ['house', 'castle', 'tower'],
  ride: ['car', 'rocket'],
  light: ['house', 'castle', 'tower', 'robot', 'car'],
};

const SORTS: { id: PlazaSort; label: string }[] = [
  { id: 'hot', label: '最热门' },
  { id: 'new', label: '最新' },
  { id: 'tiles', label: '少片优先' },
];

function candidates(): PlazaCandidate[] {
  return WORK_CATALOG.map((w) => ({
    id: w.id,
    title: w.title,
    subtitle: w.subtitle,
    tags: w.tags,
    form: w.form,
    themes: w.themes,
    sortOrder: w.sortOrder,
    tileCount: w.tileCount,
    level: w.level,
    shapeUsage: w.shapeUsage,
    swatch: w.swatch,
    shortLabel: w.shortLabel,
  }));
}

function piecesShort(usage: PlazaCandidate['shapeUsage'], stock: StockCounts): number {
  let n = 0;
  for (const id of SHIPPED_SHAPES) {
    const need = usage[id] || 0;
    const have = stock[id] || 0;
    if (need > have) n += need - have;
  }
  return n;
}

Page({
  data: {
    forms: FORMS,
    themes: THEMES,
    sorts: SORTS,
    form: 'all',
    theme: 'all',
    sort: 'hot' as PlazaSort,
    keyword: '',
    onlyBuildable: false,
    homeCats: HOME_CATS,
    homeCat: 'all',
    goalText: '今天还没拼过',
    goalPct: 0,
    continueCard: null as null | { id: string; title: string; meta: string; bg: string },
    cards: [] as {
      id: string;
      title: string;
      meta: string;
      heat: string;
      hot: boolean;
      buildable: boolean;
      pieceText: string;
      bg: string;
    }[],
    publicOn: false,
    publicRows: [] as { id: string; title: string; note: string }[],
  },

  onShow() {
    this._refresh();
  },

  _refresh(patch: Partial<{
    homeCat: string;
    keyword: string;
    sort: PlazaSort;
    onlyBuildable: boolean;
    form: string;
    theme: string;
  }> = {}) {
    const homeCat = patch.homeCat ?? this.data.homeCat;
    const keyword = patch.keyword ?? this.data.keyword;
    const sort = patch.sort ?? this.data.sort;
    const onlyBuildable = patch.onlyBuildable ?? this.data.onlyBuildable;
    const form = patch.form ?? this.data.form;
    const theme = patch.theme ?? this.data.theme;
    const state = loadUserState();
    const stock = mergedStock(state);
    const themeIds = THEME_MATCH[theme];
    let rows = filterPlaza(
      candidates(),
      {
        keyword,
        form: form as 'all',
        theme: 'all',
        sort,
        onlyBuildable,
      },
      stock,
      completionCounts(state),
    );
    if (themeIds) {
      rows = rows.filter((row) => row.themes.some((t) => themeIds.includes(t)));
    }
    const homeIds = HOME_IDS[homeCat];
    if (homeIds) rows = rows.filter((row) => homeIds.includes(row.id));
    const cards = rows.map((row) => ({
      id: row.id,
      title: row.title,
      meta: `${row.level} · ${row.tileCount}片`,
      heat: row.completions > 0 ? `拼过 ${row.completions} 次` : '还没拼过',
      hot: row.hot,
      buildable: row.buildable,
      pieceText: row.buildable ? '可拼' : `差 ${piecesShort(row.shapeUsage, stock)} 片`,
      bg: `linear-gradient(145deg, ${row.swatch[0]}, ${row.swatch[1]})`,
    }));
    const pub = publicDiary(state).map((d) => ({
      id: d.id,
      title: d.title,
      note: d.note || '拼好啦',
    }));
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const today = state.diary.filter((d) => d.at >= start.getTime()).length;
    const goalTarget = 3;
    const goalPct = Math.min(100, Math.round((today / goalTarget) * 100));
    const last = state.diary[0];
    const cont = cards.find((c) => c.id === last?.workId) || cards.find((c) => c.id === 'house') || cards[0];
    this.setData({
      ...patch,
      homeCat,
      keyword,
      sort,
      onlyBuildable,
      form,
      theme,
      cards,
      publicOn: state.settings.publicShowcase,
      publicRows: pub,
      goalText: `${today} / ${goalTarget} 个作品`,
      goalPct: Math.max(goalPct, today === 0 ? 8 : goalPct),
      continueCard: cont
        ? { id: cont.id, title: cont.title, meta: cont.meta, bg: cont.bg }
        : null,
    });
  },

  onHomeCat(e: WechatMiniprogram.TouchEvent) {
    this._refresh({ homeCat: (e.currentTarget as any).dataset.id });
  },

  onSearch(e: WechatMiniprogram.Input) {
    this._refresh({ keyword: e.detail.value || '' });
  },

  onForm(e: WechatMiniprogram.TouchEvent) {
    this._refresh({ form: (e.currentTarget as any).dataset.id });
  },

  onTheme(e: WechatMiniprogram.TouchEvent) {
    this._refresh({ theme: (e.currentTarget as any).dataset.id });
  },

  onSort(e: WechatMiniprogram.TouchEvent) {
    this._refresh({ sort: (e.currentTarget as any).dataset.id });
  },

  onOnly() {
    this._refresh({ onlyBuildable: !this.data.onlyBuildable });
  },

  onOpen(e: WechatMiniprogram.TouchEvent) {
    const id = (e.currentTarget as any).dataset.id as string;
    wx.navigateTo({ url: `/pages/build/index?workId=${id}` });
  },
});
