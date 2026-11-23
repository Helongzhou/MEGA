import { WORKS } from '../../utils/works';

Page({
  data: {
    width: 300,
    height: 600,
    renderWidth: 300,
    renderHeight: 600,
    dpi: 1,

    works: WORKS.map((w) => ({ id: w.id, swatch: w.swatch })),
    workIndex: 0,

    mode: 'manual' as 'manual' | 'watch',
    isAutoPlaying: false,
    isPaused: true,
    speedMultiplier: 1,

    currentStep: -1,
    totalSteps: 3,
    completed: false,
    celebrating: false,

    commandSeq: 0,
    command: '',
    commandArg: 0,

    sceneReady: false,
  },

  onLoad() {
    this._computeCanvasSize();
  },

  onReady() {
    this._computeCanvasSize();
  },

  onUnload() {
    // xr-builder releases assets in detached
  },

  _computeCanvasSize() {
    const info = wx.getSystemInfoSync();
    const width = info.windowWidth;
    const height = info.windowHeight;
    const dpi = info.pixelRatio || 1;
    // Cap pixel ratio at 2 to protect mid/low-end GPUs
    const scale = Math.min(dpi, 2);
    this.setData({
      width,
      height,
      dpi,
      renderWidth: Math.floor(width * scale),
      renderHeight: Math.floor(height * scale),
    });
  },

  noop() {},

  onSceneReady() {
    this.setData({ sceneReady: true });
  },

  onBuilderState(e: WechatMiniprogram.CustomEvent) {
    const d = e.detail || {};
    this.setData({
      currentStep: d.currentStep,
      totalSteps: d.totalSteps,
      completed: !!d.completed,
      celebrating: !!d.celebrating,
    });
  },

  onCelebrate() {
    this.setData({
      completed: true,
      isPaused: true,
      isAutoPlaying: false,
      celebrating: true,
    });
  },

  onRequestPause() {
    this.setData({ isPaused: true });
  },

  onReplayDone() {
    this.setData({
      completed: false,
      celebrating: false,
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

  onPageTap() {
    // Tap anywhere to advance after a manual settle (P7 / step 7)
    if (this.data.mode === 'manual') {
      this._sendCommand('tapAdvance');
    }
  },

  onSwitchWork(e: WechatMiniprogram.TouchEvent) {
    const index = Number((e.currentTarget as any).dataset.index);
    if (Number.isNaN(index) || index === this.data.workIndex) return;
    this.setData({
      workIndex: index,
      completed: false,
      celebrating: false,
      isPaused: true,
      isAutoPlaying: this.data.mode === 'watch',
      speedMultiplier: this.data.speedMultiplier,
    });
  },

  onModeManual() {
    if (this.data.mode === 'manual') return;
    this.setData({
      mode: 'manual',
      isAutoPlaying: false,
      isPaused: true,
    });
  },

  onModeWatch() {
    if (this.data.mode === 'watch') return;
    this.setData({
      mode: 'watch',
      isAutoPlaying: true,
      isPaused: true,
    });
  },

  onTogglePlay() {
    if (this.data.completed) {
      this._sendCommand('replay');
      this.setData({
        completed: false,
        celebrating: false,
        isPaused: this.data.mode === 'watch',
        isAutoPlaying: this.data.mode === 'watch',
      });
      return;
    }

    if (this.data.mode === 'manual') {
      // In manual, play icon still useful as "soft start" → switch to watch play
      this.setData({ mode: 'watch', isAutoPlaying: true, isPaused: false });
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
    const speed = Number((e.currentTarget as any).dataset.speed);
    if (!speed) return;
    // Keep virtualProgress — only rate changes (handled inside builder via property)
    this.setData({ speedMultiplier: speed });
  },
});
