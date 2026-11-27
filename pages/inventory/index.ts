import { SHIPPED_SHAPES, type TileShapeId } from '../../utils/tile-spec';
import { canBuild } from '../../utils/inventory-logic';
import { WORK_CATALOG } from '../../utils/works';
import {
  addKit,
  bumpShape,
  loadUserState,
  mergedStock,
  patchKit,
  resetKits,
  type InventoryKit,
} from '../../utils/user-store';

const FACE: Record<
  TileShapeId,
  { name: string; face: string; color: string; mm: string; family: '75' | '71' }
> = {
  square: { name: '正方形', face: 'square', color: '#38BDF8', mm: '', family: '75' },
  window: { name: '窗户片', face: 'window', color: '#34D399', mm: '', family: '75' },
  rectangle: { name: '长方形', face: 'rectangle', color: '#FB923C', mm: '', family: '75' },
  'right-triangle': { name: '直角三角', face: 'right', color: '#FACC15', mm: '', family: '75' },
  'large-triangle': { name: '大三角', face: 'large', color: '#F87171', mm: '', family: '75' },
  triangle: { name: '正三角', face: 'triangle', color: '#A78BFA', mm: '', family: '71' },
  hexagon: { name: '六边形', face: 'hexagon', color: '#10B981', mm: '', family: '71' },
};

function rows(kit: InventoryKit | undefined, family: '75' | '71') {
  return SHIPPED_SHAPES.filter((id) => FACE[id].family === family).map((id) => ({
    id,
    name: FACE[id].name,
    face: FACE[id].face,
    color: FACE[id].color,
    mm: FACE[id].mm,
    count: kit?.counts[id] || 0,
  }));
}

Page({
  data: {
    kits: [] as { id: string; name: string; included: boolean }[],
    kitId: '',
    totalPieces: 0,
    canCount: 0,
    summary: '当前可用共 0 片（可拼 0 个作品）',
    family75: [] as ReturnType<typeof rows>,
    family71: [] as ReturnType<typeof rows>,
  },

  onShow() {
    this._refresh();
  },

  _refresh(state = loadUserState()) {
    const kit = state.kits.find((k) => k.id === this.data.kitId) || state.kits[0];
    const stock = mergedStock(state);
    const totalPieces = SHIPPED_SHAPES.reduce((sum, id) => sum + (stock[id] || 0), 0);
    const canCount = WORK_CATALOG.filter((work) => canBuild(work.shapeUsage, stock)).length;
    this.setData({
      kits: state.kits.map((k) => ({ id: k.id, name: k.name, included: k.included })),
      kitId: kit?.id || '',
      totalPieces,
      canCount,
      summary: `当前可用共 ${totalPieces} 片（可拼 ${canCount} 个作品）`,
      family75: rows(kit, '75'),
      family71: rows(kit, '71'),
    });
  },

  onPickKit(e: WechatMiniprogram.TouchEvent) {
    const kitId = (e.currentTarget as any).dataset.id as string;
    this.setData({ kitId }, () => this._refresh());
  },

  onInclude(e: WechatMiniprogram.TouchEvent) {
    const id = (e.currentTarget as any).dataset.id as string;
    const included = !!(e.detail && e.detail.value);
    this._refresh(patchKit(id, { included }));
  },

  onBump(e: WechatMiniprogram.TouchEvent) {
    const shape = (e.currentTarget as any).dataset.shape as TileShapeId;
    const delta = Number((e.currentTarget as any).dataset.delta);
    if (!this.data.kitId) return;
    this._refresh(bumpShape(this.data.kitId, shape, delta));
  },

  onAddKit() {
    const state = addKit();
    const last = state.kits[state.kits.length - 1];
    this.setData({ kitId: last.id });
    this._refresh(state);
  },

  onReset() {
    wx.showModal({
      title: '清空库存？',
      content: '片数会清掉，日记还留着。',
      confirmText: '清空',
      success: (res) => {
        if (res.confirm) this._refresh(resetKits());
      },
    });
  },

  onPhotoPromo() {
    wx.showModal({
      title: '拍包装盒识片数',
      content: '即将上线。现在还不能自动数片。',
      showCancel: false,
      confirmText: '知道了',
    });
  },
});
