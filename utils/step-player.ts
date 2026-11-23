import { clamp01, easeOutCubic, lerp, lerpVec3 } from './easing';

export type Vec3 = [number, number, number];

export interface TransformLike {
  position: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

/**
 * Drives one tile from off-screen start → target with fade-in.
 * setProgress(0~1) is pure and sync — used by both manual & auto play.
 */
export class StepPlayer {
  private el: any;
  private start: Vec3;
  private end: Vec3;
  private duration: number;
  private setOpacity: (el: any, opacity: number) => void;
  private setVisible: (el: any, visible: boolean) => void;

  constructor(options: {
    el: any;
    start?: Vec3;
    end: Vec3;
    duration?: number;
    setOpacity: (el: any, opacity: number) => void;
    setVisible: (el: any, visible: boolean) => void;
  }) {
    this.el = options.el;
    this.start = options.start || [10, options.end[1], 0];
    this.end = options.end;
    this.duration = options.duration ?? 1.2;
    this.setOpacity = options.setOpacity;
    this.setVisible = options.setVisible;
  }

  getDuration(): number {
    return this.duration;
  }

  setProgress(p: number): void {
    const t = clamp01(p);
    const eased = easeOutCubic(t);
    const pos = lerpVec3(this.start, this.end, eased);
    const tr = this.el.getComponent('transform');
    if (!tr) return;

    this.setVisible(this.el, true);
    tr.position.x = pos[0];
    tr.position.y = pos[1];
    tr.position.z = pos[2];

    // Opacity fades in over first 30% of progress
    const fade = clamp01(t / 0.3);
    this.setOpacity(this.el, fade);
  }

  /** Snap instantly to end state. */
  commit(): void {
    this.setProgress(1);
    this.setOpacity(this.el, 1);
  }

  /** Hide and park off-screen. */
  hide(): void {
    const tr = this.el.getComponent('transform');
    if (tr) {
      tr.position.x = this.start[0];
      tr.position.y = this.start[1];
      tr.position.z = this.start[2];
      tr.scale.x = 1;
      tr.scale.y = 1;
      tr.scale.z = 1;
    }
    this.setOpacity(this.el, 0);
    this.setVisible(this.el, false);
  }
}

/** Animate a tile sliding back to target (wrong drop / undo). */
export function animateSlideTo(
  el: any,
  from: Vec3,
  to: Vec3,
  durationSec: number,
  onTick: (fn: (dt: number) => boolean) => void,
  setOpacity: (el: any, o: number) => void,
  onDone?: () => void,
): void {
  let elapsed = 0;
  onTick((dt) => {
    elapsed += dt / 1000;
    const p = clamp01(elapsed / durationSec);
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // easeInOutQuad
    const pos = lerpVec3(from, to, e);
    const tr = el.getComponent('transform');
    if (tr) {
      tr.position.x = pos[0];
      tr.position.y = pos[1];
      tr.position.z = pos[2];
    }
    if (p >= 1) {
      setOpacity(el, 1);
      onDone && onDone();
      return false;
    }
    return true;
  });
}

export function animateScaleFadeOut(
  el: any,
  durationSec: number,
  onTick: (fn: (dt: number) => boolean) => void,
  setOpacity: (el: any, o: number) => void,
  setVisible: (el: any, v: boolean) => void,
  onDone?: () => void,
): void {
  let elapsed = 0;
  const tr = el.getComponent('transform');
  const startScale = tr ? tr.scale.x : 1;
  onTick((dt) => {
    elapsed += dt / 1000;
    const p = clamp01(elapsed / durationSec);
    const s = lerp(startScale, 0.2, p);
    if (tr) {
      tr.scale.x = s;
      tr.scale.y = s;
      tr.scale.z = s;
    }
    setOpacity(el, 1 - p);
    if (p >= 1) {
      setVisible(el, false);
      if (tr) {
        tr.scale.x = 1;
        tr.scale.y = 1;
        tr.scale.z = 1;
      }
      onDone && onDone();
      return false;
    }
    return true;
  });
}
