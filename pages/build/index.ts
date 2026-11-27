import { WORK_LABELS, WORK_TITLES, WORKS } from '../../utils/works';
import {
  DEFAULT_SPEED_MULTIPLIER,
  SPEED_PRESETS,
} from '../../utils/speed-presets';
import { addDiary, loadUserState } from '../../utils/user-store';

declare function getCurrentPages(): { route?: string }[];

/** Content band heights (safe-area added into total chrome height). */
const TOP_CONTENT = 96;
const BOTTOM_CONTENT = 136;
const SCENE_READY_TIMEOUT_MS = 12000;

function workTitle(id: string): string {
  return WORK_TITLES[id] || WORK_LABELS[id] || id;
}

function progressFromState(d: {
  currentStep?: number;
  totalSteps?: number;
  virtualProgress?: number;
  completed?: boolean;
  showcasing?: boolean;
}): { progressPct: number; stepLabel: string } {
  const total = Math.max(1, Number(d.totalSteps) || 1);
  const step = Math.max(0, Number(d.currentStep) || 0);
  const vp = Math.max(0, Math.min(1, Number(d.virtualProgress) || 0));
  const done = !!(d.completed || d.showcasing);
  const raw = done ? 1 : Math.min(1, (step + vp) / total);
  const progressPct = Math.round(raw * 100);
  const shown = done ? total : Math.min(total, step + 1);
  return {
    progressPct,
    stepLabel: `${shown} / ${total}`,
  };
}

function hintFor(opts: {
  showcasing: boolean;
  completed: boolean;
  title: string;
  diarySaved?: boolean;
}): string {
  if (opts.showcasing) return `看一看 · ${opts.title}`;
  if (opts.completed) {
    return opts.diarySaved ? '已记到日记 · 点黄钮再看一次' : '搭好啦 · 点这里记到日记';
  }
  return '跟着一步步拼吧';
}

Page({
  data: {
    width: 300,
    height: 600,
    stageHeight: 400,
    topChromeHeight: 120,
    bottomChromeHeight: 88,
    renderWidth: 300,
    renderHeight: 600,
    dpi: 1,
    statusBarHeight: 20,
    safeBottom: 0,

    workIndex: 0,
    activeWorkTitle: workTitle(WORKS[0]?.id || 'cube'),

    mode: 'watch' as 'manual' | 'watch',
    isAutoPlaying: true,
    isPaused: false,
    muted: false,
    speedMultiplier: DEFAULT_SPEED_MULTIPLIER,
    speedPresets: SPEED_PRESETS,
    speedIndex: SPEED_PRESETS.findIndex((p) => p.intervalSec === 3),
    hasWorks: WORKS.length > 0,

    currentStep: -1,
    totalSteps: WORKS[0]?.steps.length || 6,
    progressPct: 0,
    stepLabel: `0 / ${WORKS[0]?.steps.length || 6}`,
    completed: false,
    celebrating: false,
    showcasing: false,
    showcaseHint: '',
        hintText: '跟着一步步拼吧',

    commandSeq: 0,
    command: '',
    commandArg: 0,

    sceneReady: false,
    sceneError: false,
    sceneErrorText: '',
    hintsOn: true,
    publicShowcase: false,
    diarySaved: false,
  },

  onLoad(query: { workId?: string }) {
    const settings = loadUserState().settings;
    const patch: Record<string, unknown> = {
      muted: !settings.soundOn,
      hintsOn: settings.hintsOn,
      publicShowcase: settings.publicShowcase,
    };
    if (query?.workId) {
      const index = WORKS.findIndex((w) => w.id === query.workId);
      if (index >= 0) {
        const w = WORKS[index];
        patch.workIndex = index;
        patch.activeWorkTitle = workTitle(w.id);
        patch.totalSteps = w.steps.length;
        patch.stepLabel = `0 / ${w.steps.length}`;
      }
    }
    this.setData(patch);
    this._computeLayout();
    this._armSceneTimeout();
  },

  onBack() {
    const stack = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
    if (stack.length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.switchTab({ url: '/pages/plaza/index' });
  },

  onReady() {
    this._computeLayout();
  },

  onUnload() {
    if (this._sceneTimer) {
      clearTimeout(this._sceneTimer);
      this._sceneTimer = 0;
    }
  },

  _armSceneTimeout() {
    if (this._sceneTimer) clearTimeout(this._sceneTimer);
    this._sceneTimer = setTimeout(() => {
      if (!this.data.sceneReady) {
        this.setData({
          sceneError: true,
          sceneErrorText: '再进一次看看吧',
        });
      }
    }, SCENE_READY_TIMEOUT_MS) as unknown as number;
  },

  _computeLayout() {
    const info = wx.getSystemInfoSync();
    const width = info.windowWidth;
    const height = info.windowHeight;
    const dpi = info.pixelRatio || 1;
    const scale = Math.min(dpi, 2);
    const statusBarHeight = info.statusBarHeight || 20;
    const safeBottom =
      (info.safeArea && height > info.safeArea.bottom
        ? height - info.safeArea.bottom
        : 0) || 0;

    // Total chrome includes padding-top/bottom already in these heights
    const topChromeHeight = statusBarHeight + TOP_CONTENT;
    const bottomChromeHeight = BOTTOM_CONTENT + safeBottom;
    const stageHeight = Math.max(220, Math.floor(height - topChromeHeight - bottomChromeHeight));

    this.setData({
      width,
      height,
      stageHeight,
      topChromeHeight,
      bottomChromeHeight,
      statusBarHeight,
      safeBottom,
      dpi,
      renderWidth: Math.floor(width * scale),
      renderHeight: Math.floor(stageHeight * scale),
    });
  },

  onSceneReady() {
    if (this._sceneTimer) {
      clearTimeout(this._sceneTimer);
      this._sceneTimer = 0;
    }
    this.setData({ sceneReady: true, sceneError: false, sceneErrorText: '' });
  },

  onBuilderState(e: WechatMiniprogram.CustomEvent) {
    if (!this.data.sceneReady) {
      if (this._sceneTimer) {
        clearTimeout(this._sceneTimer);
        this._sceneTimer = 0;
      }
      this.setData({ sceneReady: true, sceneError: false });
    }
    const d = e.detail || {};
    const showcasing = !!d.showcasing;
    const completed = !!d.completed;
    const id = d.workId || WORKS[this.data.workIndex]?.id;
    const title = workTitle(id);
    const prog = progressFromState({
      currentStep: d.currentStep,
      totalSteps: d.totalSteps,
      virtualProgress: d.virtualProgress,
      completed,
      showcasing,
    });
    this.setData({
      currentStep: d.currentStep,
      totalSteps: d.totalSteps,
      completed,
      celebrating: !!d.celebrating,
      showcasing,
      activeWorkTitle: title,
      progressPct: prog.progressPct,
      stepLabel: prog.stepLabel,
      showcaseHint: showcasing ? `看一看 · ${title}` : '',
      hintText: hintFor({
        showcasing,
        completed,
        title,
        diarySaved: this.data.diarySaved,
      }),
    });
  },

  onCelebrate(e: WechatMiniprogram.CustomEvent) {
    const d = e.detail || {};
    const id = d.workId || WORKS[this.data.workIndex]?.id;
    const title = workTitle(id);
    const total = this.data.totalSteps;
    this.setData({
      completed: true,
      isPaused: true,
      isAutoPlaying: false,
      celebrating: true,
      showcasing: true,
      progressPct: 100,
      stepLabel: `${total} / ${total}`,
      activeWorkTitle: title,
      showcaseHint: `看一看 · ${title}`,
      hintText: hintFor({ showcasing: true, completed: true, title }),
    });
  },

  onShowcaseStart(e: WechatMiniprogram.CustomEvent) {
    const d = e.detail || {};
    const id = d.workId || WORKS[this.data.workIndex]?.id;
    const title = workTitle(id);
    const total = this.data.totalSteps;
    this.setData({
      showcasing: true,
      completed: true,
      celebrating: true,
      progressPct: 100,
      stepLabel: `${total} / ${total}`,
      activeWorkTitle: title,
      showcaseHint: `看一看 · ${title}`,
      hintText: hintFor({ showcasing: true, completed: true, title }),
    });
  },

  onHintTap() {
    if (this.data.completed && !this.data.showcasing && this.data.hintsOn) {
      this.onSaveDiary();
    }
  },

  onSaveDiary() {
    const index = this.data.workIndex;
    const work = WORKS[index];
    if (!work || this.data.diarySaved) return;
    const title = workTitle(work.id);
    wx.showModal({
      title: '记到日记',
      editable: true,
      placeholderText: '写一句（可以空着）',
      confirmText: '记下',
      success: (res) => {
        if (!res.confirm) return;
        const note = res.content || '';
        addDiary({ workId: work.id, title, note, photo: '' });
        this.setData({
          diarySaved: true,
          hintText: hintFor({
            showcasing: false,
            completed: true,
            title,
            diarySaved: true,
          }),
        });
        wx.showToast({ title: '已记到日记', icon: 'none' });
      },
    });
  },

  onShowcaseEnd() {
    const total = this.data.totalSteps;
    const title = this.data.activeWorkTitle;
    this.setData({
      showcasing: false,
      showcaseHint: '',
      celebrating: false,
      completed: true,
      progressPct: 100,
      stepLabel: `${total} / ${total}`,
      hintText: hintFor({ showcasing: false, completed: true, title }),
    });
  },

  onRequestPause() {
    this.setData({ isPaused: true });
  },

  onReplayDone() {
    const total = this.data.totalSteps;
    this.setData({
      completed: false,
      celebrating: false,
      showcasing: false,
      showcaseHint: '',
      hintText: '跟着一步步拼吧',
      progressPct: 0,
      stepLabel: `1 / ${total}`,
      isPaused: true,
      isAutoPlaying: this.data.mode === 'watch',
    });
  },

  _sendCommand(command: string, commandArg = 0) {
    this.setData({
      command,
      commandArg,
      commandSeq: this.data.commandSeq + 1,
    });
  },

  onTogglePlay() {
    if (this.data.completed || this.data.showcasing) {
      this._sendCommand('replay');
      const total = this.data.totalSteps;
      this.setData({
        completed: false,
        celebrating: false,
        showcasing: false,
        showcaseHint: '',
        hintText: '跟着一步步拼吧',
        progressPct: 0,
        stepLabel: `1 / ${total}`,
        isPaused: false,
        isAutoPlaying: true,
      });
      return;
    }
    if (!this.data.isAutoPlaying) {
      this.setData({ isAutoPlaying: true, isPaused: false });
    } else {
      this.setData({ isPaused: !this.data.isPaused });
    }
  },

  onPrev() {
    this._sendCommand('prev');
  },

  onNext() {
    this._sendCommand('next');
  },

  onSpeed(e: WechatMiniprogram.TouchEvent) {
    const index = Number((e.currentTarget as any).dataset.index);
    const preset = SPEED_PRESETS[index];
    if (!preset) return;
    this.setData({
      speedIndex: index,
      speedMultiplier: preset.multiplier,
    });
  },

  onToggleMute() {
    this.setData({ muted: !this.data.muted });
  },

  onToggleMode() {
    // Default remains watch; toggle only when user asks
    if (this.data.mode === 'watch') {
      this.setData({
        mode: 'manual',
        isAutoPlaying: false,
        isPaused: true,
        hintText: '你来拼，把片片放到亮处',
      });
    } else {
      this.setData({
        mode: 'watch',
        isAutoPlaying: true,
        isPaused: false,
        hintText: '跟着一步步拼吧',
      });
    }
  },
});
