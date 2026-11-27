import { SHIPPED_SHAPES } from '../../utils/tile-spec';
import { loadUserState, mergedStock, resetKits, saveSettings } from '../../utils/user-store';

Page({
  data: {
    soundOn: true,
    hintsOn: true,
    publicShowcase: false,
    pieces: 0,
  },

  onShow() {
    const state = loadUserState();
    const stock = mergedStock(state);
    let pieces = 0;
    for (const id of SHIPPED_SHAPES) pieces += stock[id] || 0;
    this.setData({ ...state.settings, pieces });
  },

  onSound(e: WechatMiniprogram.TouchEvent) {
    const soundOn = !!(e.detail && e.detail.value);
    saveSettings({ soundOn });
    this.setData({ soundOn });
  },

  onHints(e: WechatMiniprogram.TouchEvent) {
    const hintsOn = !!(e.detail && e.detail.value);
    saveSettings({ hintsOn });
    this.setData({ hintsOn });
  },

  onPublic(e: WechatMiniprogram.TouchEvent) {
    const next = !!(e.detail && e.detail.value);
    if (!next) {
      saveSettings({ publicShowcase: false });
      this.setData({ publicShowcase: false });
      return;
    }
    wx.showModal({
      title: '公开分享作品？',
      content: '暂未全面开放。打开后，只显示你愿意公开的日记。',
      confirmText: '打开',
      success: (res) => {
        if (!res.confirm) {
          this.setData({ publicShowcase: false });
          return;
        }
        saveSettings({ publicShowcase: true });
        this.setData({ publicShowcase: true });
      },
    });
  },

  onReset() {
    wx.showModal({
      title: '清空库存？',
      content: '片数会清掉，日记还留着。',
      confirmText: '清空',
      success: (res) => {
        if (!res.confirm) return;
        resetKits();
        this.onShow();
      },
    });
  },
});
