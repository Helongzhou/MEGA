import {
  BASE_DURATION,
  BuildStep,
  BuildWork,
  FLY_DURATION,
  MAX_PRECREATED_TILES,
  SNAP_DISTANCE,
  STEP_HOLD_MS,
  WORKS,
} from '../../utils/works';
import {
  StepPlayer,
  animateScaleFadeOut,
  animateSlideTo,
  Vec3,
} from '../../utils/step-player';
import { clamp01 } from '../../utils/easing';

type TickFn = (dt: number) => boolean;

interface TileSlotData {
  id: string;
  index: number;
  model: string;
  position: string;
  rotation: string;
  scale: string;
  visible: boolean;
}

interface ParticleData {
  id: string;
  uniforms: string;
  position: string;
  scale: string;
  visible: boolean;
}

const PARTICLE_COLORS = [
  '1 0.42 0.42 1',
  '0.3 0.8 0.77 1',
  '1 0.9 0.43 1',
  '0.58 0.88 0.83 1',
  '0.95 0.51 0.51 1',
];

Component({
  properties: {
    /** Work index into WORKS */
    workIndex: { type: Number, value: 0 },
    /** 'manual' | 'watch' */
    mode: { type: String, value: 'manual' },
    isAutoPlaying: { type: Boolean, value: false },
    isPaused: { type: Boolean, value: true },
    speedMultiplier: { type: Number, value: 1 },
    /** External command bump — page increments to trigger actions */
    commandSeq: { type: Number, value: 0 },
    command: { type: String, value: '' },
    commandArg: { type: Number, value: 0 },
  },

  data: {
    tileSlots: [] as TileSlotData[],
    particles: [] as ParticleData[],
    pulseVisible: false,
    showDemoTiles: false,
    assetsReady: false,
  },

  lifetimes: {
    attached() {
      this._initInternalState();
      this._buildSlotData();
      this._buildParticleData();
    },
    detached() {
      this._unloadAssets();
      this._tickFns = [];
      this.scene = null;
    },
  },

  observers: {
    workIndex(idx: number) {
      if (!this.scene) return;
      this._loadWork(idx);
    },
    mode(m: string) {
      if (!this.scene) return;
      this._onModeChange(m);
    },
    'commandSeq, command'(seq: number) {
      if (!seq || !this.scene) return;
      this._handleCommand(this.data.command, this.data.commandArg);
    },
    'isAutoPlaying, isPaused, speedMultiplier'() {
      // driven in handleTick from properties
    },
  },

  methods: {
    _initInternalState() {
      this.scene = null as any;
      this.xrFrameSystem = null as any;
      this.cameraEl = null as any;
      this.orbit = null as any;
      this.pulseEl = null as any;
      this.tileEls = [] as any[];
      this.particleEls = [] as any[];
      this.work = WORKS[0] as BuildWork;
      this.currentStep = 0;
      this.virtualProgress = 0;
      this.activePlayer = null as StepPlayer | null;
      this._tickFns = [] as TickFn[];
      this._holdUntil = 0;
      this._pendingAdvance = null as number | null;
      this._completedBoundary = -1;
      this._celebrating = false;
      this._dragging = false;
      this._dragSlot = -1;
      this._fpsAccum = 0;
      this._fpsFrames = 0;
      this._lastFpsWarn = 0;
      this._orbitYaw = 0;
      this._orbitPitch = 25 * (Math.PI / 180);
      this._orbitDist = 6;
      this._customOrbit = false;
      this._audio = {
        pop: null as WechatMiniprogram.InnerAudioContext | null,
        slide: null as WechatMiniprogram.InnerAudioContext | null,
        celebrate: null as WechatMiniprogram.InnerAudioContext | null,
      };
      this._initAudio();
    },

    _initAudio() {
      const make = (src: string, volume: number) => {
        const a = wx.createInnerAudioContext();
        a.src = src;
        a.volume = volume;
        return a;
      };
      this._audio.pop = make('/sounds/pop.mp3', 0.6);
      this._audio.slide = make('/sounds/slide.mp3', 0.5);
      this._audio.celebrate = make('/sounds/celebrate.mp3', 0.7);
    },

    _playSound(name: 'pop' | 'slide' | 'celebrate') {
      const a = this._audio[name];
      if (!a) return;
      try {
        a.stop();
        a.seek(0);
        a.play();
      } catch (e) {
        // ignore audio errors (silent mode / missing file)
      }
    },

    _buildSlotData() {
      const slots: TileSlotData[] = [];
      for (let i = 0; i < MAX_PRECREATED_TILES; i++) {
        slots.push({
          id: `tile-slot-${i}`,
          index: i,
          model: 'tile-square',
          position: '10 0 0',
          rotation: '0 0 0',
          scale: '1 1 1',
          visible: false,
        });
      }
      this.setData({ tileSlots: slots });
    },

    _buildParticleData() {
      const particles: ParticleData[] = [];
      for (let i = 0; i < 24; i++) {
        const c = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
        particles.push({
          id: `particle-${i}`,
          uniforms: `u_baseColorFactor:${c}`,
          position: `0 -20 0`,
          scale: '0.12 0.12 0.12',
          visible: false,
        });
      }
      this.setData({ particles });
    },

    handleAssetsProgress() {},

    handleAssetsLoaded() {
      this.setData({ assetsReady: true });
    },

    handleReady({ detail }: any) {
      const xrFrameSystem = wx.getXrFrameSystem();
      this.xrFrameSystem = xrFrameSystem;
      this.scene = detail.value as any;

      this.cameraEl = this.scene.getElementById('main-camera');
      this.pulseEl = this.scene.getElementById('pulse-hint');

      // Cache tile elements
      this.tileEls = [];
      for (let i = 0; i < MAX_PRECREATED_TILES; i++) {
        const el = this.scene.getElementById(`tile-slot-${i}`);
        if (el) this.tileEls.push(el);
      }

      this.particleEls = [];
      for (let i = 0; i < 24; i++) {
        const el = this.scene.getElementById(`particle-${i}`);
        if (el) this.particleEls.push(el);
      }

      this._setupCameraControl();
      this._loadWork(this.data.workIndex || 0);
      this.triggerEvent('scene-ready', {});
    },

    /**
     * Limit orbit: lock zoom (no pinch). Prefer CameraOrbitControl + zoom clamp.
     * Also install a soft clamp on distance via zoomMin/zoomMax.
     * Vertical/horizontal soft limits via custom single-finger orbit if needed.
     */
    _setupCameraControl() {
      if (!this.cameraEl) return;
      const orbit = this.cameraEl.getComponent('camera-orbit-control');
      if (orbit) {
        this.orbit = orbit;
        // Disable pinch zoom for kids (P2)
        orbit.isLockZoom = true;
        orbit.isLockMove = true;
        if (typeof orbit.setData === 'function') {
          orbit.setData({
            isLockZoom: true,
            isLockMove: true,
            zoomMin: 4,
            zoomMax: 10,
            rotateSpeed: 0.8,
          });
        } else {
          orbit.zoomMin = 4;
          orbit.zoomMax = 10;
        }
      }

      // Soft-clamp camera spherical angles each tick via transform rewrite
      this._customOrbit = true;
      this._syncOrbitFromCamera();
    },

    _syncOrbitFromCamera() {
      if (!this.cameraEl) return;
      const tr = this.cameraEl.getComponent('transform');
      if (!tr) return;
      const x = tr.position.x;
      const y = tr.position.y;
      const z = tr.position.z;
      const dist = Math.sqrt(x * x + y * y + z * z) || 6;
      this._orbitDist = Math.max(4, Math.min(10, dist));
      this._orbitYaw = Math.atan2(x, z);
      this._orbitPitch = Math.asin(Math.max(-1, Math.min(1, y / dist)));
    },

    _applyOrbitLimits() {
      if (!this.cameraEl || !this._customOrbit) return;
      // Do not fight the celebration orbit
      if (this._celebrating) return;
      // Pitch 10°~60°, yaw -45°~45°, distance 4~10
      const pitchMin = 10 * (Math.PI / 180);
      const pitchMax = 60 * (Math.PI / 180);
      const yawMin = -45 * (Math.PI / 180);
      const yawMax = 45 * (Math.PI / 180);

      this._syncOrbitFromCamera();
      let changed = false;
      if (this._orbitPitch < pitchMin) {
        this._orbitPitch = pitchMin;
        changed = true;
      } else if (this._orbitPitch > pitchMax) {
        this._orbitPitch = pitchMax;
        changed = true;
      }
      if (this._orbitYaw < yawMin) {
        this._orbitYaw = yawMin;
        changed = true;
      } else if (this._orbitYaw > yawMax) {
        this._orbitYaw = yawMax;
        changed = true;
      }
      if (this._orbitDist < 4) {
        this._orbitDist = 4;
        changed = true;
      } else if (this._orbitDist > 10) {
        this._orbitDist = 10;
        changed = true;
      }

      if (changed) {
        const tr = this.cameraEl.getComponent('transform');
        if (!tr) return;
        const cp = Math.cos(this._orbitPitch);
        tr.position.x = this._orbitDist * cp * Math.sin(this._orbitYaw);
        tr.position.y = this._orbitDist * Math.sin(this._orbitPitch);
        tr.position.z = this._orbitDist * cp * Math.cos(this._orbitYaw);
      }
    },

    _loadWork(idx: number) {
      const work = WORKS[Math.max(0, Math.min(WORKS.length - 1, idx))] || WORKS[0];
      this.work = work;
      this.setData({ showDemoTiles: false });
      this._celebrating = false;
      this.virtualProgress = 0;
      this.activePlayer = null;
      this._pendingAdvance = null;
      this._holdUntil = 0;
      this._tickFns = [];
      this.gotoStep(-1);
      this.currentStep = -1;
      this._startManualOrWatch();
      this._emitState();
    },

    _startManualOrWatch() {
      // Begin at step 0 ready-to-place
      this.currentStep = 0;
      this.gotoStep(-1);
      this._prepareStep(0);
      if (this.data.mode === 'watch') {
        // wait for play
      }
    },

    _onModeChange(mode: string) {
      this.virtualProgress = 0;
      this.activePlayer = null;
      // Keep scene consistent: gotoStep(currentStep) then re-enter active step
      const step = Math.max(0, Math.min(this.work.steps.length, this.currentStep));
      this.currentStep = step;
      this.gotoStep(step);
      if (step < this.work.steps.length) {
        this._prepareStep(step);
      } else {
        this._setPulseVisible(false);
      }
      this._emitState();
    },

    _handleCommand(cmd: string, arg: number) {
      switch (cmd) {
        case 'prev':
          this._stepPrev();
          break;
        case 'next':
          this._stepNext();
          break;
        case 'replay':
          this._replay();
          break;
        case 'tapAdvance':
          this._tapAdvance();
          break;
        case 'goto':
          this.gotoStep(arg);
          break;
        default:
          break;
      }
    },

    _emitState() {
      this.triggerEvent('state', {
        currentStep: this.currentStep,
        totalSteps: this.work.steps.length,
        virtualProgress: this.virtualProgress,
        celebrating: this._celebrating,
        completed: this.currentStep >= this.work.steps.length,
      });
    },

    // ---------- Opacity / visibility helpers ----------

    _setVisible(el: any, visible: boolean) {
      if (!el) return;
      // Prefer setAttribute for xr elements
      try {
        el.setAttribute('visible', visible ? 'true' : 'false');
      } catch (e) {
        /* ignore */
      }
    },

    _setOpacity(el: any, opacity: number) {
      if (!el) return;
      const o = clamp01(opacity);
      // Walk glTF meshes and tint alpha if possible
      try {
        const xr = this.xrFrameSystem;
        if (!xr) {
          this._setVisible(el, o > 0.05);
          return;
        }
        const apply = (node: any) => {
          const mesh = node.getComponent && node.getComponent(xr.Mesh);
          if (mesh && mesh.material) {
            const mat = mesh.material;
            if (mat.setRenderState) {
              mat.setRenderState('alphaMode', o >= 0.99 ? 'OPAQUE' : 'BLEND');
            }
            if (mat.setVector) {
              // keep RGB, set A
              const c = mat.getVector && mat.getVector('u_baseColorFactor');
              if (c) {
                mat.setVector('u_baseColorFactor', [c.x ?? c[0] ?? 1, c.y ?? c[1] ?? 1, c.z ?? c[2] ?? 1, o]);
              }
            }
          }
          const children = node.children || (node._children as any[]) || [];
          for (let i = 0; i < children.length; i++) apply(children[i]);
        };
        apply(el);
        this._setVisible(el, o > 0.02);
      } catch (e) {
        this._setVisible(el, o > 0.05);
      }
    },

    _setSlotTransform(index: number, pos: Vec3, rot: Vec3, visible: boolean, opacity: number) {
      const el = this.tileEls[index];
      if (!el) return;
      const tr = el.getComponent('transform');
      if (tr) {
        tr.position.x = pos[0];
        tr.position.y = pos[1];
        tr.position.z = pos[2];
        tr.rotation.x = (rot[0] * Math.PI) / 180;
        tr.rotation.y = (rot[1] * Math.PI) / 180;
        tr.rotation.z = (rot[2] * Math.PI) / 180;
        tr.scale.x = 1;
        tr.scale.y = 1;
        tr.scale.z = 1;
      }
      this._setVisible(el, visible);
      this._setOpacity(el, opacity);
    },

    _ensureSlotModel(index: number, step: BuildStep) {
      const slots = this.data.tileSlots.slice();
      if (!slots[index]) return;
      if (slots[index].model !== step.assetId) {
        slots[index].model = step.assetId;
        this.setData({ [`tileSlots[${index}].model`]: step.assetId });
      }
    },

    /**
     * Sync scene to "step `index` already completed" — no animation.
     * - i < index  → settled at target, opaque
     * - i >= index → hidden
     * index range: -1 (all hidden) … steps.length (all settled)
     */
    gotoStep(index: number) {
      const steps = this.work.steps;
      const clamped = Math.max(-1, Math.min(steps.length, index));
      this._completedBoundary = clamped;

      for (let i = 0; i < MAX_PRECREATED_TILES; i++) {
        const el = this.tileEls[i];
        if (!el) continue;
        if (i < steps.length) {
          this._ensureSlotModel(i, steps[i]);
        }
        if (i < clamped) {
          const s = steps[i];
          this._setSlotTransform(i, s.position, s.rotation, true, 1);
        } else if (i < steps.length) {
          this._setSlotTransform(i, [10, 0, 0], [0, 0, 0], false, 0);
        } else {
          this._setVisible(el, false);
        }
      }

      this.virtualProgress = 0;
      this.activePlayer = null;
      this._setPulseVisible(false);
    },

    _prepareStep(stepIndex: number) {
      const steps = this.work.steps;
      if (stepIndex < 0 || stepIndex >= steps.length) {
        this._setPulseVisible(false);
        return;
      }
      this.currentStep = stepIndex;
      this._completedBoundary = stepIndex; // steps before this are done
      // Show completed with dim, current ready to fly/drag
      for (let i = 0; i < steps.length; i++) {
        this._ensureSlotModel(i, steps[i]);
        if (i < stepIndex) {
          this._setSlotTransform(i, steps[i].position, steps[i].rotation, true, 0.4);
        } else if (i === stepIndex) {
          // park at start for player
          const start: Vec3 = [10, steps[i].position[1], 0];
          this._setSlotTransform(i, start, steps[i].rotation, this.data.mode === 'manual', 1);
          const el = this.tileEls[i];
          this.activePlayer = new StepPlayer({
            el,
            start,
            end: steps[i].position,
            duration: FLY_DURATION,
            setOpacity: (e, o) => this._setOpacity(e, o),
            setVisible: (e, v) => this._setVisible(e, v),
          });
          if (this.data.mode === 'manual') {
            // In manual, tile starts at target as draggable piece? Spec: child drags current tile.
            // Place it near target slightly offset so it's grabable, with pulse at target.
            this._setSlotTransform(i, [steps[i].position[0], steps[i].position[1] + 0.8, steps[i].position[2] + 1.2], steps[i].rotation, true, 1);
          } else {
            this.activePlayer.hide();
          }
        } else {
          this._setSlotTransform(i, [10, 0, 0], [0, 0, 0], false, 0);
        }
      }

      this._placePulse(steps[stepIndex]);
      this.virtualProgress = 0;
      this._emitState();
    },

    _placePulse(step: BuildStep) {
      if (!this.pulseEl) return;
      const tr = this.pulseEl.getComponent('transform');
      if (tr) {
        tr.position.x = step.position[0];
        tr.position.y = step.position[1] + 0.06;
        tr.position.z = step.position[2];
      }
      // tint pulse toward hint color
      try {
        const mesh = this.pulseEl.getComponent('mesh');
        if (mesh && mesh.material && mesh.material.setVector) {
          const hex = step.hintColor.replace('#', '');
          const r = parseInt(hex.slice(0, 2), 16) / 255;
          const g = parseInt(hex.slice(2, 4), 16) / 255;
          const b = parseInt(hex.slice(4, 6), 16) / 255;
          mesh.material.setVector('u_baseColorFactor', [r, g, b, 0.3]);
        }
      } catch (e) {
        /* ignore */
      }
      this._setPulseVisible(true);
    },

    _setPulseVisible(v: boolean) {
      this.setData({ pulseVisible: v });
      if (this.pulseEl) this._setVisible(this.pulseEl, v);
    },

    _commitStep(stepIndex: number) {
      const steps = this.work.steps;
      if (stepIndex < 0 || stepIndex >= steps.length) return;
      // Restore full opacity for all settled tiles (were dimmed during guide)
      for (let i = 0; i <= stepIndex; i++) {
        const s = steps[i];
        this._setSlotTransform(i, s.position, s.rotation, true, 1);
      }
      this._setPulseVisible(false);
      this.activePlayer = null;
      this.virtualProgress = 0;
      this._completedBoundary = stepIndex + 1;
    },

    // ---------- Manual drag ----------

    _resolveSlotIndex(e: any): number {
      const detail = e?.detail?.value || e?.detail || {};
      const target = detail.target || e?.target;
      if (target && this.tileEls?.length) {
        for (let i = 0; i < this.tileEls.length; i++) {
          const el = this.tileEls[i];
          if (!el) continue;
          if (el === target) return i;
          const id = el.id || el.getAttribute?.('node-id') || el.getAttribute?.('id');
          const tid = target.id || target.getAttribute?.('node-id') || target.getAttribute?.('id');
          if (id && tid && id === tid) return i;
        }
      }
      const slot = e?.currentTarget?.dataset?.slot ?? e?.target?.dataset?.slot;
      if (typeof slot === 'number') return slot;
      if (slot != null) return parseInt(slot, 10);
      return -1;
    },

    handleTouchShape(e: any) {
      if (this.data.mode !== 'manual' || this._celebrating) return;
      const idx = this._resolveSlotIndex(e);
      if (idx !== this.currentStep) return;
      this._dragging = true;
      this._dragSlot = idx;
      // Lock camera rotate while dragging tile
      if (this.orbit) {
        this.orbit.isLockRotate = true;
      }
    },

    handleDragShape(e: any) {
      if (!this._dragging || this.data.mode !== 'manual') return;
      const detail = e.detail?.value || e.detail || {};
      const target = detail.target;
      const dir = detail.dir;
      const camera = detail.camera;
      if (!target || !dir || !camera) return;

      try {
        const cameraPos = camera.el.getComponent('transform').worldPosition;
        // Intersect with y = current step height plane
        const steps = this.work.steps;
        const yPlane = steps[this.currentStep]?.position[1] ?? 0;
        const dy = dir[1];
        if (Math.abs(dy) < 1e-5) return;
        const k = (yPlane - cameraPos.y) / dy;
        if (k < 0) return;
        const x = cameraPos.x + k * dir[0];
        const z = cameraPos.z + k * dir[2];
        const tr = target.getComponent('transform');
        if (tr) {
          tr.position.x = x;
          tr.position.y = yPlane + 0.05;
          tr.position.z = z;
        }
      } catch (err) {
        /* ignore */
      }
    },

    handleUntouchShape(e: any) {
      if (!this._dragging) return;
      this._dragging = false;
      if (this.orbit) this.orbit.isLockRotate = false;

      const idx = this._dragSlot;
      this._dragSlot = -1;
      if (idx !== this.currentStep) return;

      const el = this.tileEls[idx];
      const step = this.work.steps[idx];
      if (!el || !step) return;
      const tr = el.getComponent('transform');
      if (!tr) return;

      const dx = tr.position.x - step.position[0];
      const dy = tr.position.y - step.position[1];
      const dz = tr.position.z - step.position[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const from: Vec3 = [tr.position.x, tr.position.y, tr.position.z];

      if (dist <= SNAP_DISTANCE) {
        // Snap success
        animateSlideTo(
          el,
          from,
          step.position,
          0.3,
          (fn) => this._tickFns.push(fn),
          (e, o) => this._setOpacity(e, o),
          () => {
            this._playSound('pop');
            this._onStepSettled(idx);
          },
        );
      } else {
        // Soft slide to correct place — no failure UI (P5)
        animateSlideTo(
          el,
          from,
          step.position,
          0.5,
          (fn) => this._tickFns.push(fn),
          (e, o) => this._setOpacity(e, o),
          () => {
            this._playSound('slide');
            this._onStepSettled(idx);
          },
        );
      }
    },

    _onStepSettled(idx: number) {
      this._commitStep(idx);
      this._holdUntil = Date.now() + STEP_HOLD_MS;
      // After hold, advance (also allow tap)
      this._pendingAdvance = idx + 1;
      this._emitState();
    },

    _tapAdvance() {
      if (this._celebrating) return;
      if (this.data.mode === 'manual' && this._pendingAdvance != null) {
        this._advanceTo(this._pendingAdvance);
      }
    },

    _advanceTo(next: number) {
      this._pendingAdvance = null;
      this._holdUntil = 0;
      if (next >= this.work.steps.length) {
        this.currentStep = this.work.steps.length;
        this._triggerCelebration();
      } else {
        this._prepareStep(next);
      }
      this._emitState();
    },

    // ---------- Auto play ----------

    _stepPrev() {
      // Undo current in-progress / last settled step
      const targetStep = Math.max(0, this.currentStep - 1);
      const fadeIdx = Math.min(this.currentStep, this.work.steps.length - 1);
      const el = this.tileEls[fadeIdx];
      this._pendingAdvance = null;
      this._holdUntil = 0;
      this.virtualProgress = 0;
      this.activePlayer = null;

      const finishPrev = () => {
        this.gotoStep(targetStep);
        this.currentStep = targetStep;
        this._prepareStep(targetStep);
        this.triggerEvent('request-pause', {});
        this._emitState();
      };

      // Fade out the revoked tile, then reset — avoid gotoStep killing the fade
      if (el && fadeIdx >= targetStep && fadeIdx < this.work.steps.length) {
        this._playSound('slide');
        animateScaleFadeOut(
          el,
          0.3,
          (fn) => this._tickFns.push(fn),
          (e, o) => this._setOpacity(e, o),
          (e, v) => this._setVisible(e, v),
          finishPrev,
        );
      } else {
        finishPrev();
      }
    },

    _stepNext() {
      this._pendingAdvance = null;
      this._holdUntil = 0;
      if (this.currentStep < this.work.steps.length) {
        this._commitStep(this.currentStep);
      }
      const next = Math.min(this.work.steps.length, this.currentStep + 1);
      this.gotoStep(next);
      if (next >= this.work.steps.length) {
        this.currentStep = this.work.steps.length;
        this._triggerCelebration();
      } else {
        this.currentStep = next;
        this._prepareStep(next);
      }
      this.triggerEvent('request-pause', {});
      this._emitState();
    },

    _replay() {
      this._celebrating = false;
      this._pendingAdvance = null;
      this._holdUntil = 0;
      this._hideParticles();
      this.gotoStep(-1);
      this.currentStep = 0;
      this._prepareStep(0);
      this.triggerEvent('replay-done', {});
      this._emitState();
    },

    // ---------- Celebration ----------

    _triggerCelebration() {
      if (this._celebrating) return;
      this._celebrating = true;
      this._setPulseVisible(false);
      this._playSound('celebrate');
      this.triggerEvent('celebrate', {});

      // Bounce all tiles
      const steps = this.work.steps;
      const start = Date.now();
      this._tickFns.push((dt) => {
        const t = (Date.now() - start) / 600;
        if (t >= 1) {
          for (let i = 0; i < steps.length; i++) {
            const tr = this.tileEls[i]?.getComponent('transform');
            if (tr) {
              tr.scale.x = 1;
              tr.scale.y = 1;
              tr.scale.z = 1;
            }
          }
          return false;
        }
        const wave = Math.sin(t * Math.PI);
        const s = 1 + 0.08 * wave;
        for (let i = 0; i < steps.length; i++) {
          const tr = this.tileEls[i]?.getComponent('transform');
          if (tr) {
            tr.scale.x = s;
            tr.scale.y = s;
            tr.scale.z = s;
          }
        }
        return true;
      });

      this._startParticles();
      this._orbitCameraCelebrate();
    },

    _startParticles() {
      const start = Date.now();
      const duration = 2000;
      const states = this.particleEls.map((_, i) => ({
        x: (Math.random() - 0.5) * 4,
        z: (Math.random() - 0.5) * 4,
        y: 5 + Math.random() * 1.5,
        vy: -1.2 - Math.random() * 1.2,
        spin: Math.random() * Math.PI,
      }));

      for (let i = 0; i < this.particleEls.length; i++) {
        this._setVisible(this.particleEls[i], true);
      }

      this._tickFns.push((dt) => {
        const elapsed = Date.now() - start;
        if (elapsed > duration) {
          this._hideParticles();
          return false;
        }
        const sec = dt / 1000;
        for (let i = 0; i < this.particleEls.length; i++) {
          const st = states[i];
          st.y += st.vy * sec;
          st.spin += sec * 2;
          const el = this.particleEls[i];
          const tr = el?.getComponent('transform');
          if (tr) {
            tr.position.x = st.x;
            tr.position.y = st.y;
            tr.position.z = st.z;
            tr.rotation.y = st.spin;
          }
        }
        return true;
      });
    },

    _hideParticles() {
      for (let i = 0; i < this.particleEls.length; i++) {
        this._setVisible(this.particleEls[i], false);
        const tr = this.particleEls[i]?.getComponent('transform');
        if (tr) tr.position.y = -20;
      }
    },

    _orbitCameraCelebrate() {
      if (!this.cameraEl) return;
      const start = Date.now();
      const duration = 3000;
      this._syncOrbitFromCamera();
      const baseYaw = this._orbitYaw;
      // Optional — can be cancelled by user touch (orbit still limited)
      this._tickFns.push(() => {
        if (!this._celebrating) return false;
        const t = (Date.now() - start) / duration;
        if (t >= 1) return false;
        this._orbitYaw = baseYaw + t * Math.PI * 2;
        // wrap into soft limits softly during celebrate — temporarily widen
        const tr = this.cameraEl.getComponent('transform');
        if (tr) {
          const cp = Math.cos(this._orbitPitch);
          tr.position.x = this._orbitDist * cp * Math.sin(this._orbitYaw);
          tr.position.y = this._orbitDist * Math.sin(this._orbitPitch);
          tr.position.z = this._orbitDist * cp * Math.cos(this._orbitYaw);
        }
        return true;
      });
    },

    // ---------- Tick ----------

    handleTick({ detail }: any) {
      const dt = typeof detail === 'number' ? detail : detail?.value ?? 16;
      this._updateFps(dt);
      this._applyOrbitLimits();
      this._updatePulse(dt);
      this._runTickFns(dt);

      if (this._celebrating) return;

      // Shared hold gate: manual settle OR autoplay inter-step gap (P6 ≥ 1.5s)
      if (this._pendingAdvance != null) {
        if (Date.now() >= this._holdUntil) {
          this._advanceTo(this._pendingAdvance);
        }
        return;
      }

      if (this.data.mode !== 'watch') return;
      if (!this.data.isAutoPlaying || this.data.isPaused) return;
      if (this.currentStep >= this.work.steps.length) return;
      if (!this.activePlayer) return;

      this.virtualProgress += ((dt / 1000) * this.data.speedMultiplier) / BASE_DURATION;
      if (this.virtualProgress >= 1) {
        this._commitStep(this.currentStep);
        this._playSound('pop');
        this.virtualProgress = 0;
        const next = this.currentStep + 1;
        if (next >= this.work.steps.length) {
          this.currentStep = this.work.steps.length;
          this._triggerCelebration();
          this._emitState();
          return;
        }
        // Hold before next fly-in (plan P6)
        this._pendingAdvance = next;
        this._holdUntil = Date.now() + STEP_HOLD_MS;
        this._setPulseVisible(false);
        this.activePlayer = null;
        this._emitState();
      } else {
        this.activePlayer.setProgress(this.virtualProgress);
      }
    },

    _runTickFns(dt: number) {
      if (!this._tickFns.length) return;
      const next: TickFn[] = [];
      for (let i = 0; i < this._tickFns.length; i++) {
        const keep = this._tickFns[i](dt);
        if (keep) next.push(this._tickFns[i]);
      }
      this._tickFns = next;
    },

    _updatePulse(dt: number) {
      if (!this.data.pulseVisible || !this.pulseEl) return;
      const tr = this.pulseEl.getComponent('transform');
      if (!tr) return;
      const t = Date.now() / 1000;
      const s = 1.0 + 0.2 * Math.sin((t * Math.PI * 2) / 1.5);
      tr.scale.x = s;
      tr.scale.y = 0.15;
      tr.scale.z = s;
    },

    _updateFps(dt: number) {
      this._fpsAccum += dt;
      this._fpsFrames += 1;
      if (this._fpsAccum >= 1000) {
        const fps = (this._fpsFrames * 1000) / this._fpsAccum;
        if (fps < 30 && Date.now() - this._lastFpsWarn > 5000) {
          console.warn(`[xr-builder] FPS low: ${fps.toFixed(1)}`);
          this._lastFpsWarn = Date.now();
        }
        this._fpsAccum = 0;
        this._fpsFrames = 0;
      }
    },

    _unloadAssets() {
      try {
        const scene = this.scene;
        if (!scene || !scene.assets) return;
        const ids = [
          'tile-square',
          'tile-triangle',
          'tile-square-red',
          'tile-square-blue',
          'tile-square-yellow',
          'tile-triangle-green',
          'tile-triangle-orange',
        ];
        ids.forEach((id) => {
          try {
            scene.assets.unloadAsset('gltf', id);
          } catch (e) {
            /* ignore */
          }
        });
      } catch (e) {
        /* ignore */
      }
      ['pop', 'slide', 'celebrate'].forEach((k) => {
        const a = this._audio[k as 'pop'];
        if (a) {
          try {
            a.destroy();
          } catch (e) {
            /* ignore */
          }
        }
      });
    },
  },
});
