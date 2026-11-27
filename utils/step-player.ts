import { clamp01, easeOutBack, easeOutCubic, lerp, lerpVec3 } from './easing';

export type Vec3 = [number, number, number];

function safeTransform(el: any): any {
  if (!el || typeof el.getComponent !== 'function') return null;
  try {
    return el.getComponent('transform') || null;
  } catch (e) {
    return null;
  }
}

/**
 * Drives one tile from start → end.
 * Magnet mode: long ease fly-in, then short easeOutBack snap (physical click feel).
 * Mid-flight: imperative transform ONLY (no setData).
 */
export class StepPlayer {
  private el: any;
  private start: Vec3;
  private end: Vec3;
  private startRot: Vec3;
  private endRot: Vec3;
  private duration: number;
  private magnetSnap: boolean;
  /** Progress fraction where fly ends and snap begins. */
  private snapAt: number;

  constructor(options: {
    el: any;
    start?: Vec3;
    end: Vec3;
    startRot?: Vec3;
    endRot?: Vec3;
    duration?: number;
    /** SnapTiles-like two-phase motion */
    magnetSnap?: boolean;
    snapAt?: number;
  }) {
    this.el = options.el;
    this.start = options.start || [10, options.end[1], 0];
    this.end = options.end;
    this.startRot = options.startRot || [0, 0, 0];
    this.endRot = options.endRot || [0, 0, 0];
    this.duration = options.duration ?? 1.2;
    this.magnetSnap = options.magnetSnap !== false;
    this.snapAt = options.snapAt ?? 0.78;
  }

  /** True while in the final snap/overshoot phase. */
  isInSnapPhase(p: number): boolean {
    return this.magnetSnap && clamp01(p) > this.snapAt;
  }

  getDuration(): number {
    return this.duration;
  }

  /** Approach point just outside final pose (pre-snap). */
  private approachPose(): { pos: Vec3; rot: Vec3 } {
    const dx = this.end[0] - this.start[0];
    const dy = this.end[1] - this.start[1];
    const dz = this.end[2] - this.start[2];
    const L = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const gap = Math.min(0.28, L * 0.12);
    return {
      pos: [
        this.end[0] - (dx / L) * gap,
        this.end[1] - (dy / L) * gap,
        this.end[2] - (dz / L) * gap,
      ],
      rot: lerpVec3(this.startRot, this.endRot, 0.92),
    };
  }

  sample(p: number): { pos: Vec3; rot: Vec3 } {
    const t = clamp01(p);
    if (!this.magnetSnap) {
      const eased = easeOutCubic(t);
      return {
        pos: lerpVec3(this.start, this.end, eased),
        rot: lerpVec3(this.startRot, this.endRot, eased),
      };
    }

    const cut = this.snapAt;
    if (t <= cut) {
      const u = easeOutCubic(t / cut);
      const ap = this.approachPose();
      return {
        pos: lerpVec3(this.start, ap.pos, u),
        rot: lerpVec3(this.startRot, ap.rot, u),
      };
    }
    const u = easeOutBack((t - cut) / (1 - cut), 1.7);
    const ap = this.approachPose();
    // Clamp overshoot visually — still snaps past then settles via commit at t=1
    const uu = Math.min(1.08, u);
    return {
      pos: lerpVec3(ap.pos, this.end, Math.min(1, uu)),
      rot: lerpVec3(ap.rot, this.endRot, Math.min(1, uu)),
    };
  }

  setProgress(p: number): void {
    const { pos, rot } = this.sample(p);
    const tr = safeTransform(this.el);
    if (!tr || !tr.position || !tr.rotation) return;
    tr.position.x = pos[0];
    tr.position.y = pos[1];
    tr.position.z = pos[2];
    tr.rotation.x = (rot[0] * Math.PI) / 180;
    tr.rotation.y = (rot[1] * Math.PI) / 180;
    tr.rotation.z = (rot[2] * Math.PI) / 180;
    if (tr.scale) {
      tr.scale.x = 1;
      tr.scale.y = 1;
      tr.scale.z = 1;
    }
  }

  commit(): void {
    this.setProgress(1);
  }

  hide(): void {
    const tr = safeTransform(this.el);
    if (tr && tr.position && tr.scale) {
      tr.position.x = this.start[0];
      tr.position.y = this.start[1];
      tr.position.z = this.start[2];
      tr.scale.x = 1;
      tr.scale.y = 1;
      tr.scale.z = 1;
    }
  }
}

/** Animate a tile sliding back to target (wrong drop / undo). */
export function animateSlideTo(
  el: any,
  from: Vec3,
  to: Vec3,
  durationSec: number,
  onTick: (fn: (dt: number) => boolean) => void,
  onDone?: () => void,
): void {
  let elapsed = 0;
  onTick((dt) => {
    elapsed += dt / 1000;
    const p = clamp01(elapsed / durationSec);
    const e = easeOutCubic(p);
    const tr = safeTransform(el);
    if (tr && tr.position) {
      tr.position.x = lerp(from[0], to[0], e);
      tr.position.y = lerp(from[1], to[1], e);
      tr.position.z = lerp(from[2], to[2], e);
    }
    if (p >= 1) {
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
  setVisible: (el: any, v: boolean) => void,
  onDone?: () => void,
): void {
  let elapsed = 0;
  onTick((dt) => {
    elapsed += dt / 1000;
    const p = clamp01(elapsed / durationSec);
    const s = 1 - easeOutCubic(p);
    const tr = safeTransform(el);
    if (tr && tr.scale) {
      tr.scale.x = Math.max(0.01, s);
      tr.scale.y = Math.max(0.01, s);
      tr.scale.z = Math.max(0.01, s);
    }
    if (p >= 1) {
      setVisible(el, false);
      onDone && onDone();
      return false;
    }
    return true;
  });
}
