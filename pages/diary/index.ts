import { WORKS } from '../../utils/works';
import { loadUserState, setDiaryPublic, type DiaryEntry } from '../../utils/user-store';

function formatAt(at: number): string {
  const d = new Date(at);
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${p(d.getHours())}:${p(d.getMinutes())}`;
}

Page({
  data: {
    lit: 0,
    streak: 0,
    badgeLit: 0,
    badges: [] as { id: string; name: string; hint: string; on: boolean }[],
    rows: [] as {
      id: string;
      title: string;
      note: string;
      when: string;
      photo: string;
      wantPublic: boolean;
      workId: string;
    }[],
  },

  onShow() {
    const state = loadUserState();
    const ids = new Set(state.diary.map((d) => d.workId));
    const lit = ids.size;
    const dayKeys = state.diary.map((d) => {
      const day = new Date(d.at);
      day.setHours(0, 0, 0, 0);
      return day.getTime();
    });
    const unique = Array.from(new Set(dayKeys));
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    while (unique.indexOf(cursor.getTime()) >= 0) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    const badges = [
      { id: 'first', name: '第一片', hint: '拼完第一个作品', on: lit >= 1 },
      { id: 'three', name: '连搭三样', hint: '三种不同作品', on: lit >= 3 },
      { id: 'house', name: '小房子', hint: '记下小房子', on: ids.has('house') },
      { id: 'days', name: '连续两天', hint: '两天都来搭', on: streak >= 2 },
    ];
    this.setData({
      lit,
      streak,
      badgeLit: badges.filter((b) => b.on).length,
      badges,
      rows: state.diary.map((d: DiaryEntry) => ({
        id: d.id,
        title: d.title,
        note: d.note || '今天也拼得很开心',
        when: formatAt(d.at),
        photo: d.photo,
        wantPublic: d.wantPublic,
        workId: d.workId,
      })),
    });
  },

  onPublic(e: WechatMiniprogram.TouchEvent) {
    const id = (e.currentTarget as any).dataset.id as string;
    const wantPublic = !!(e.detail && e.detail.value);
    setDiaryPublic(id, wantPublic);
    this.onShow();
  },

  onRebuild(e: WechatMiniprogram.TouchEvent) {
    const id = (e.currentTarget as any).dataset.work as string;
    if (!WORKS.some((w) => w.id === id)) {
      wx.showToast({ title: '这个作品还不能搭', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/build/index?workId=${id}` });
  },

  onGoPlaza() {
    wx.switchTab({ url: '/pages/plaza/index' });
  },
});
