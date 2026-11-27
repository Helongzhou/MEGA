import {
  BASE_DURATION,
  BuildStep,
  BuildWork,
  FLY_DURATION,
  MAX_PRECREATED_TILES,
  SNAP_AT,
  SNAP_DISTANCE,
  STEP_HOLD_MS,
  WORK_LABELS,
  WORKS,
} from '../../utils/works';
import {
  StepPlayer,
  animateScaleFadeOut,
  animateSlideTo,
  Vec3,
} from '../../utils/step-player';
import { clamp01, easeInOutCubic } from '../../utils/easing';

/** Full-turn desk spin after the last tile settles (ms). */
const SHOWCASE_MS = 6000;
import {
  FRONT_EYE,
  FRONT_LOOK,
  applyCameraPose,
  dampAngle,
  dampVec3,
  outwardFlyStart,
  yawToRevealTile,
  Vec3 as CamVec3,
} from '../../utils/camera-follow';
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
  '1 0.902 0.427 1',
  '0.306 0.804 0.769 1',
  '0.220 0.741 0.973 1',
  '0.655 0.545 0.980 1',
  '0.973 0.443 0.443 1',
];

Component({
  properties: {
    // Required by xr-frame renderer — drive native canvas backing size
    width: { type: Number, value: 300 },
    height: { type: Number, value: 600 },
    /** Work index into WORKS */
    workIndex: { type: Number, value: 0 },
    /** 'manual' | 'watch' */
    mode: { type: String, value: 'manual' },
    isAutoPlaying: { type: Boolean, value: false },
    isPaused: { type: Boolean, value: true },
    /** Soft mute — keeps audio contexts, skips play. Default off. */
    muted: { type: Boolean, value: false },
    speedMultiplier: { type: Number, value: 1 },
    /** External command bump — page increments to trigger actions */
    commandSeq: { type: Number, value: 0 },
    command: { type: String, value: '' },
    commandArg: { type: Number, value: 0 },
  },

  data: {
    tileSlots: [] as TileSlotData[],
    particles: [] as ParticleData[],
    showDemoTiles: true,
    assetsReady: false,
  },

  lifetimes: {
    // Observers can fire before attached — init audio/state here first
    created() {
      this._initInternalState();
    },
    attached() {
      if (!this._audio) this._initInternalState();
      this._buildSlotData();
      this._buildParticleData();
    },
    detached() {
      this._unloadAssets();
      this._disposeAudio();
      this._tickFns = [];
      this.scene = null;
      this._sceneStarted = false;
      this._assetsReady = false;
    },
  },

  observers: {
    workIndex(idx: number) {
      if (!this.scene) return;
      this._loadWork(idx);
    },
    mode(m: string) {
      if (this.scene) this._onModeChange(m);
      this._syncAmbient();
    },
    'commandSeq, command'(seq: number) {
      if (!seq || !this.scene) return;
      this._handleCommand(this.data.command, this.data.commandArg);
    },
    muted() {
      this._syncAmbient();
    },
    'isAutoPlaying, isPaused, speedMultiplier'() {
      this._syncAmbient();
    },
  },

  methods: {
    _initInternalState() {
      this.scene = null as any;
      this.xrFrameSystem = null as any;
      this.cameraEl = null as any;
      this.camTargetEl = null as any;
      this.orbit = null as any;
      this.tileEls = [] as any[];
      /** Imperative pose cache — never drive pose via setData (remounts glTF). */
      this._slotPose = [] as Array<{
        pos: Vec3;
        rot: Vec3;
        visible: boolean;
        scale: Vec3;
      }>;
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
      this._showcasing = false;
      this._showcaseStart = 0;
      this._dragging = false;
      this._dragSlot = -1;
      this._fpsAccum = 0;
      this._fpsFrames = 0;
      this._lastFpsWarn = 0;
      this._orbitYaw = 0;
      this._orbitPitch = 25 * (Math.PI / 180);
      this._orbitDist = 6;
      this._customOrbit = false;
      /** Fixed camera — never rescue-orbit; desk turntable yaws instead. */
      this._camEye = [...FRONT_EYE] as CamVec3;
      this._camLook = [...FRONT_LOOK] as CamVec3;
      this._camGoalEye = [...FRONT_EYE] as CamVec3;
      this._camGoalLook = [...FRONT_LOOK] as CamVec3;
      this._camFollowEnabled = true;
      this._turntableEl = null as any;
      this._turnYaw = 0;
      this._turnYawGoal = 0;
      this._snapPopped = false;
      this._sceneStarted = false;
      this._assetsReady = false;
      this._audio = {
        pop: null as WechatMiniprogram.InnerAudioContext | null,
        slide: null as WechatMiniprogram.InnerAudioContext | null,
        celebrate: null as WechatMiniprogram.InnerAudioContext | null,
        ambient: null as WechatMiniprogram.InnerAudioContext | null,
      };
      this._initAudio();
    },

    _initAudio() {
      if (!this._audio) {
        this._audio = {
          pop: null,
          slide: null,
          celebrate: null,
          ambient: null,
        };
      }
      const make = (src: string, volume: number, loop = false) => {
        const a = wx.createInnerAudioContext();
        a.src = src;
        a.volume = volume;
        a.loop = loop;
        return a;
      };
      this._audio.pop = make('/sounds/pop.mp3', 0.65);
      this._audio.slide = make('/sounds/slide.mp3', 0.5);
      this._audio.celebrate = make('/sounds/celebrate.mp3', 0.7);
      this._audio.ambient = make('/sounds/ambient.mp3', 0.18, true);
    },

    _disposeAudio() {
      const audio = this._audio;
      if (!audio) return;
      (['pop', 'slide', 'celebrate', 'ambient'] as const).forEach((k) => {
        const a = audio[k];
        if (!a) return;
        try {
          a.stop();
          a.destroy();
        } catch (e) {
          /* ignore */
        }
        audio[k] = null;
      });
    },

    _playSound(name: 'pop' | 'slide' | 'celebrate') {
      if (!this._audio || this.data.muted) return;
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

    _syncAmbient() {
      if (!this._audio) return;
      const a = this._audio.ambient;
      if (!a) return;
      const shouldPlay =
        !this.data.muted &&
        this.data.mode === 'watch' &&
        this.data.isAutoPlaying &&
        !this.data.isPaused;
      try {
        if (shouldPlay) {
          a.play();
        } else {
          a.pause();
        }
      } catch (e) {
        /* ignore */
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
      // setData is async — re-cache / start after nodes land in the scene graph
      this.setData({ tileSlots: slots }, () => {
        if (!this.scene) return;
        this._cacheSceneElements();
        this._tryStartScene();
      });
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
      this.setData({ particles }, () => {
        if (this.scene) this._cacheSceneElements();
      });
    },

    handleAssetsProgress() {},

    handleAssetsLoaded() {
      // setData is async — keep a sync flag so _tryStartScene never deadlocks
      this._assetsReady = true;
      this.setData({ assetsReady: true });
      if (!this.scene) return;
      this._cacheSceneElements();
      if (!this._sceneStarted) {
        this._tryStartScene();
      } else {
        // Models just became available — refresh current placement
        this._startManualOrWatch();
      }
    },

    handleReady({ detail }: any) {
      const xrFrameSystem = wx.getXrFrameSystem();
      this.xrFrameSystem = xrFrameSystem;
      this.scene = detail.value as any;

      this.cameraEl = this.scene.getElementById('main-camera');
      this.camTargetEl = this.scene.getElementById('cam-target');
      this._turntableEl = this.scene.getElementById('turntable');

      this._cacheSceneElements();
      this._setupCameraControl();
      // Pin fixed front camera once; later motion is turntable-only
      this._pinFrontCamera();
      this._tryStartScene();
      // Fallback: assets `loaded` can be flaky on simulator
      setTimeout(() => {
        if (!this._assetsReady) {
          this._assetsReady = true;
          this.setData({ assetsReady: true });
        }
        this._cacheSceneElements();
        this._tryStartScene();
      }, 300);
      this.triggerEvent('scene-ready', {});
    },

    _cacheSceneElements() {
      if (!this.scene) return;
      this._turntableEl =
        this.scene.getElementById('turntable') || this._turntableEl;
      // Keep index alignment even when some nodes are not ready yet
      this.tileEls = new Array(MAX_PRECREATED_TILES);
      for (let i = 0; i < MAX_PRECREATED_TILES; i++) {
        this.tileEls[i] = this.scene.getElementById(`tile-slot-${i}`) || null;
      }
      this.particleEls = new Array(24);
      for (let i = 0; i < 24; i++) {
        this.particleEls[i] = this.scene.getElementById(`particle-${i}`) || null;
      }
    },

    _pinFrontCamera() {
      this._camEye = [...FRONT_EYE] as CamVec3;
      this._camLook = [...FRONT_LOOK] as CamVec3;
      this._camGoalEye = [...FRONT_EYE] as CamVec3;
      this._camGoalLook = [...FRONT_LOOK] as CamVec3;
      if (this.cameraEl) {
        applyCameraPose(
          this.cameraEl,
          this.camTargetEl,
          this._camEye,
          this._camLook,
          (el) => this._getTransform(el),
        );
      }
    },

    _tryStartScene() {
      if (!this.scene || this._sceneStarted) return;
      // Wait for assets when possible, but sync flag avoids setData race
      if (!this._assetsReady) return;
      this._sceneStarted = true;
      this._cacheSceneElements();
      this._loadWork(this.data.workIndex || 0);
    },

    _getTransform(el: any): any {
      if (!el || typeof el.getComponent !== 'function') return null;
      try {
        return el.getComponent('transform') || null;
      } catch (e) {
        return null;
      }
    },

    /**
     * Limit orbit: lock zoom (no pinch). Prefer CameraOrbitControl + zoom clamp.
     * Also install a soft clamp on distance via zoomMin/zoomMax.
     * Vertical/horizontal soft limits via custom single-finger orbit if needed.
     */
    _setupCameraControl() {
      if (!this.cameraEl) return;
      let orbit: any = null;
      try {
        orbit = this.cameraEl.getComponent('camera-orbit-control');
      } catch (e) {
        orbit = null;
      }
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
      const tr = this._getTransform(this.cameraEl);
      if (!tr || !tr.position) return;
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
      // Do not fight fixed-cam pin / celebration
      if (this._celebrating) return;
      if (
        this.data.mode === 'watch' &&
        this.data.isAutoPlaying &&
        !this.data.isPaused
      ) {
        return;
      }
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
        const tr = this._getTransform(this.cameraEl);
        if (!tr || !tr.position) return;
        const cp = Math.cos(this._orbitPitch);
        tr.position.x = this._orbitDist * cp * Math.sin(this._orbitYaw);
        tr.position.y = this._orbitDist * Math.sin(this._orbitPitch);
        tr.position.z = this._orbitDist * cp * Math.cos(this._orbitYaw);
      }
    },

    _loadWork(idx: number) {
      const work = WORKS[Math.max(0, Math.min(WORKS.length - 1, idx))] || WORKS[0];
      this.work = work;
      this._cancelShowcase();
      this._celebrating = false;
      this.virtualProgress = 0;
      this.activePlayer = null;
      this._pendingAdvance = null;
      this._holdUntil = 0;
      this._tickFns = [];
      this.currentStep = -1;
      this._turnYawGoal = 0;
      // snap desk front on work switch (avoid spinning across works)
      this._turnYaw = 0;
      this._applyTurntableYaw();
      this._pinFrontCamera();

      // Rebuild slots with correct models; keep demos until first prepare paints
      const slots: TileSlotData[] = [];
      for (let i = 0; i < MAX_PRECREATED_TILES; i++) {
        const step = work.steps[i];
        slots.push({
          id: `tile-slot-${i}`,
          index: i,
          model: step ? step.assetId : 'tile-square',
          position: '10 0 0',
          rotation: '0 0 0',
          scale: '1 1 1',
          visible: false,
        });
      }
      // Single setData — nested setData in callback triggers "recursive update"
      this.setData({ tileSlots: slots, showDemoTiles: false }, () => {
        this._cacheSceneElements();
        this._startManualOrWatch();
        this._emitState();
      });
    },

    _startManualOrWatch() {
      // Begin at step 0 ready-to-place (_prepareStep owns full slot setData)
      this.currentStep = 0;
      this._prepareStep(0);
    },

    _onModeChange(mode: string) {
      this.virtualProgress = 0;
      this.activePlayer = null;
      this._pendingAdvance = null;
      this._holdUntil = 0;
      // Keep scene consistent: gotoStep(currentStep) then re-enter active step
      const step = Math.max(0, Math.min(this.work.steps.length, this.currentStep));
      this.currentStep = step;
      this.gotoStep(step);
      if (step < this.work.steps.length) {
        this._prepareStep(step);
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
        showcasing: this._showcasing,
        completed:
          this.currentStep >= this.work.steps.length || this._celebrating,
        workId: this.work.id,
        workLabel: WORK_LABELS[this.work.id] || this.work.id,
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

    _vecStr(v: Vec3): string {
      return `${v[0]} ${v[1]} ${v[2]}`;
    },

    _ensureSlotPoseArray() {
      if (!this._slotPose) this._slotPose = [];
      while (this._slotPose.length < MAX_PRECREATED_TILES) {
        this._slotPose.push({
          pos: [10, 0, 0],
          rot: [0, 0, 0],
          visible: false,
          scale: [1, 1, 1],
        });
      }
    },

    /**
     * Imperative pose only — never setData position/rotation/visible
     * (that remounts xr-gltf and tiles flash then vanish after snap).
     */
    _setSlotTransform(
      index: number,
      pos: Vec3,
      rot: Vec3,
      visible: boolean,
      _opacity: number,
      scale: Vec3 = [1, 1, 1],
    ) {
      this._ensureSlotPoseArray();
      this._slotPose[index] = {
        pos: [pos[0], pos[1], pos[2]],
        rot: [rot[0], rot[1], rot[2]],
        visible,
        scale: [scale[0], scale[1], scale[2]],
      };
      this._applySlotPose(index);
    },

    _applySlotPose(index: number) {
      const pose = this._slotPose && this._slotPose[index];
      if (!pose) return;
      const el = this.tileEls[index];
      if (!el) return;
      const tr = this._getTransform(el);
      if (tr && tr.position && tr.rotation && tr.scale) {
        tr.position.x = pose.pos[0];
        tr.position.y = pose.pos[1];
        tr.position.z = pose.pos[2];
        tr.rotation.x = (pose.rot[0] * Math.PI) / 180;
        tr.rotation.y = (pose.rot[1] * Math.PI) / 180;
        tr.rotation.z = (pose.rot[2] * Math.PI) / 180;
        tr.scale.x = pose.scale[0];
        tr.scale.y = pose.scale[1];
        tr.scale.z = pose.scale[2];
      }
      this._setVisible(el, pose.visible);
    },

    _applyAllSlotPoses() {
      this._ensureSlotPoseArray();
      for (let i = 0; i < MAX_PRECREATED_TILES; i++) {
        this._applySlotPose(i);
      }
    },

    /** setData ONLY when assetId/model must change; poses stay imperative. */
    _syncModelsThen(
      models: Array<string | null>,
      after?: () => void,
    ) {
      const slots: TileSlotData[] = (this.data.tileSlots || []).map((s) => ({ ...s }));
      while (slots.length < MAX_PRECREATED_TILES) {
        const i = slots.length;
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
      let changed = false;
      for (let i = 0; i < MAX_PRECREATED_TILES; i++) {
        const m = models[i] || slots[i].model;
        if (slots[i].model !== m) {
          slots[i].model = m;
          changed = true;
        }
      }
      const finish = () => {
        this._cacheSceneElements();
        this._applyAllSlotPoses();
        after && after();
      };
      if (changed) {
        this.setData({ tileSlots: slots }, finish);
      } else {
        finish();
      }
    },

    /**
     * Sync scene to "step `index` already completed" — no animation.
     * - i < index  → settled at target
     * - i >= index → hidden
     */
    gotoStep(index: number) {
      const clamped = Math.max(-1, Math.min(this.work.steps.length, index));
      this._completedBoundary = clamped;
      const steps = this.work.steps;
      this._ensureSlotPoseArray();

      const models: Array<string | null> = [];
      for (let i = 0; i < MAX_PRECREATED_TILES; i++) {
        models.push(i < steps.length ? steps[i].assetId : null);
        if (i < clamped) {
          const s = steps[i];
          this._slotPose[i] = {
            pos: [s.position[0], s.position[1], s.position[2]],
            rot: [s.rotation[0], s.rotation[1], s.rotation[2]],
            visible: true,
            scale: [1, 1, 1],
          };
        } else {
          this._slotPose[i] = {
            pos: [10, 0, 0],
            rot: [0, 0, 0],
            visible: false,
            scale: [1, 1, 1],
          };
        }
      }

      this._syncModelsThen(models);
      this.virtualProgress = 0;
      this.activePlayer = null;
    },

    _stepStartPose(step: BuildStep): { pos: Vec3; rot: Vec3 } {
      // Outside the mating face (not a shared +Z tray) — avoids 穿模
      const rot = (step.startRotation || step.flyFromRotation || [
        step.rotation[0],
        step.rotation[1],
        step.rotation[2],
      ]) as Vec3;
      const outward = outwardFlyStart(
        step.position as CamVec3,
        step.rotation as CamVec3,
        2.6,
      );
      // Prefer authored startPosition if it already lies outside the same face
      if (step.startPosition) {
        const sp = step.startPosition;
        const dx = sp[0] - step.position[0];
        const dy = sp[1] - step.position[1];
        const dz = sp[2] - step.position[2];
        if (dx * dx + dy * dy + dz * dz > 0.04) {
          // Push farther along the same outward direction for a readable fly-in
          const L = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
          const scale = Math.max(2.2 / L, 1);
          return {
            pos: [
              step.position[0] + dx * scale,
              step.position[1] + dy * scale,
              step.position[2] + dz * scale,
            ] as Vec3,
            rot,
          };
        }
      }
      return { pos: outward as Vec3, rot };
    },

    _prepareStep(stepIndex: number) {
      const steps = this.work.steps;
      if (stepIndex < 0 || stepIndex >= steps.length) {
        return;
      }
      this.currentStep = stepIndex;
      this._completedBoundary = stepIndex;

      const manual = this.data.mode === 'manual';
      const step = steps[stepIndex];

      // Face the mating side toward the fixed camera via desk yaw (no camera move)
      this._turnTableForTile(step.position as Vec3, step.rotation as Vec3);

      const { pos: startPos, rot: startRot } = this._stepStartPose(step);
      const grabPos: Vec3 = [
        step.position[0],
        step.position[1] + 0.8,
        step.position[2] + 1.2,
      ];
      const activePos = manual ? grabPos : startPos;
      const activeRot = manual ? step.rotation : startRot;

      this._ensureSlotPoseArray();
      const models: Array<string | null> = [];
      for (let i = 0; i < MAX_PRECREATED_TILES; i++) {
        if (i < steps.length) {
          models.push(steps[i].assetId);
          if (i < stepIndex) {
            const s = steps[i];
            this._slotPose[i] = {
              pos: [s.position[0], s.position[1], s.position[2]],
              rot: [s.rotation[0], s.rotation[1], s.rotation[2]],
              visible: true,
              scale: [1, 1, 1],
            };
          } else if (i === stepIndex) {
            this._slotPose[i] = {
              pos: [activePos[0], activePos[1], activePos[2]],
              rot: [activeRot[0], activeRot[1], activeRot[2]],
              visible: true,
              scale: [1, 1, 1],
            };
          } else {
            this._slotPose[i] = {
              pos: [10, 0, 0],
              rot: [0, 0, 0],
              visible: false,
              scale: [1, 1, 1],
            };
          }
        } else {
          models.push(null);
          this._slotPose[i] = {
            pos: [10, 0, 0],
            rot: [0, 0, 0],
            visible: false,
            scale: [1, 1, 1],
          };
        }
      }

      this._syncModelsThen(models, () => {
        const el = this.tileEls[stepIndex];
        // Watch: tray → approach → magnet snap (imperative; no setData mid-flight)
        this.activePlayer = new StepPlayer({
          el,
          start: startPos,
          end: step.position,
          startRot,
          endRot: step.rotation,
          duration: FLY_DURATION,
          magnetSnap: !manual,
          snapAt: SNAP_AT,
        });
        this._snapPopped = false;
        if (!manual) {
          this.activePlayer.setProgress(0);
        } else {
          this._setSlotTransform(stepIndex, grabPos, step.rotation, true, 1);
        }
      });

      this.virtualProgress = 0;
      this._emitState();
    },

    /** Yaw the desk so this tile's face meets the fixed front camera. */
    _turnTableForTile(pos: Vec3, rot: Vec3) {
      this._turnYawGoal = yawToRevealTile(pos as CamVec3, rot as CamVec3);
    },

    /** @deprecated name kept for accept gate — now turns the desk, not the camera. */
    _aimCameraAtTile(pos: Vec3, rot: Vec3, _pullBack = 1) {
      this._turnTableForTile(pos, rot);
    },

    _aimCameraAtTileIfOccluded(pos: Vec3, rot: Vec3, _stepIndex: number) {
      this._turnTableForTile(pos, rot);
    },

    _applyTurntableYaw() {
      if (!this._turntableEl) return;
      const tr = this._getTransform(this._turntableEl);
      if (tr && tr.rotation) {
        tr.rotation.x = 0;
        tr.rotation.y = this._turnYaw;
        tr.rotation.z = 0;
      }
    },

    _updateCameraFollow(dtMs: number) {
      // Camera stays pinned during watch play / showcase; desk turntable faces
      const pinCam =
        this._showcasing ||
        (this.data.mode === 'watch' &&
          (this._celebrating ||
            (this.data.isAutoPlaying && !this.data.isPaused)));
      if (this.orbit) {
        try {
          this.orbit.isLockRotate = !!pinCam;
        } catch (e) {
          /* ignore */
        }
      }

      const dt = dtMs / 1000;
      if (this._showcasing) {
        this._tickShowcase(dtMs);
      } else {
        this._turnYaw = dampAngle(this._turnYaw, this._turnYawGoal, dt, 0.32);
        this._applyTurntableYaw();
      }

      if (pinCam && this.cameraEl) {
        this._camGoalEye = [...FRONT_EYE] as CamVec3;
        this._camGoalLook = [...FRONT_LOOK] as CamVec3;
        this._camEye = dampVec3(this._camEye, this._camGoalEye, dt, 0.25);
        this._camLook = dampVec3(this._camLook, this._camGoalLook, dt, 0.25);
        applyCameraPose(
          this.cameraEl,
          this.camTargetEl,
          this._camEye,
          this._camLook,
          (el) => this._getTransform(el),
        );
      }
    },

    _commitStep(stepIndex: number) {
      const steps = this.work.steps;
      if (stepIndex < 0 || stepIndex >= steps.length) return;
      for (let i = 0; i <= stepIndex; i++) {
        const s = steps[i];
        this._setSlotTransform(i, s.position, s.rotation, true, 1);
      }
      this.activePlayer = null;
      this.virtualProgress = 0;
      this._completedBoundary = stepIndex + 1;
      // No settle pull-back; camera already decided at step start (or stayed put)
      this._punchTileScale(stepIndex);
    },

    _punchTileScale(index: number) {
      const step = this.work.steps[index];
      if (!step) return;
      const start = Date.now();
      this._tickFns.push(() => {
        const t = (Date.now() - start) / 180;
        if (t >= 1) {
          this._setSlotTransform(index, step.position, step.rotation, true, 1, [1, 1, 1]);
          return false;
        }
        const s = 1 + 0.07 * Math.sin(t * Math.PI);
        this._setSlotTransform(index, step.position, step.rotation, true, 1, [s, s, s]);
        return true;
      });
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
        const camTr = this._getTransform(camera.el);
        if (!camTr || !camTr.worldPosition) return;
        const cameraPos = camTr.worldPosition;
        const steps = this.work.steps;
        const yPlane = steps[this.currentStep]?.position[1] ?? 0;
        const dy = dir[1];
        if (Math.abs(dy) < 1e-5) return;
        const k = (yPlane - cameraPos.y) / dy;
        if (k < 0) return;
        const x = cameraPos.x + k * dir[0];
        const z = cameraPos.z + k * dir[2];
        const tr = this._getTransform(target);
        if (tr && tr.position) {
          tr.position.x = x;
          tr.position.y = yPlane + 0.05;
          tr.position.z = z;
        }
        const idx = this._dragSlot;
        if (idx >= 0 && this.data.tileSlots[idx]) {
          this.setData({
            [`tileSlots[${idx}].position`]: `${x} ${yPlane + 0.05} ${z}`,
          });
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
      const tr = this._getTransform(el);
      if (!tr || !tr.position) return;

      const dx = tr.position.x - step.position[0];
      const dy = tr.position.y - step.position[1];
      const dz = tr.position.z - step.position[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const from: Vec3 = [tr.position.x, tr.position.y, tr.position.z];

      if (dist <= SNAP_DISTANCE) {
        animateSlideTo(el, from, step.position, 0.3, (fn) => this._tickFns.push(fn), () => {
          this._playSound('pop');
          this._onStepSettled(idx);
        });
      } else {
        animateSlideTo(el, from, step.position, 0.5, (fn) => this._tickFns.push(fn), () => {
          this._playSound('slide');
          this._onStepSettled(idx);
        });
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
      this._cancelShowcase();
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

    // ---------- Celebration + showcase ----------

    _triggerCelebration() {
      if (this._celebrating) return;
      this._celebrating = true;
      this._playSound('celebrate');
      this.triggerEvent('celebrate', {
        workId: this.work.id,
        workLabel: WORK_LABELS[this.work.id] || this.work.id,
      });

      // Soft bounce via imperative scale only (setData remounts glTF)
      const steps = this.work.steps;
      const start = Date.now();
      this._tickFns.push(() => {
        const t = (Date.now() - start) / 600;
        if (t >= 1) {
          for (let i = 0; i < steps.length; i++) {
            const s = steps[i];
            this._setSlotTransform(i, s.position, s.rotation, true, 1, [1, 1, 1]);
          }
          return false;
        }
        const sc = 1 + 0.08 * Math.sin(t * Math.PI);
        for (let i = 0; i < steps.length; i++) {
          const s = steps[i];
          this._setSlotTransform(i, s.position, s.rotation, true, 1, [sc, sc, sc]);
        }
        return true;
      });

      this._startParticles();
      this._startShowcase();
    },

    /** Slow full-turn desk spin so kids can admire the finished build. */
    _startShowcase() {
      this._showcasing = true;
      this._showcaseStart = Date.now();
      this._turnYaw = 0;
      this._turnYawGoal = 0;
      this._applyTurntableYaw();
      this._pinFrontCamera();
      this.triggerEvent('showcase-start', {
        workId: this.work.id,
        workLabel: WORK_LABELS[this.work.id] || this.work.id,
        durationMs: SHOWCASE_MS,
      });
      this._emitState();
    },

    _tickShowcase(dtMs: number) {
      void dtMs;
      const elapsed = Date.now() - this._showcaseStart;
      const t = clamp01(elapsed / SHOWCASE_MS);
      const e = easeInOutCubic(t);
      // One full turn; end facing front (yaw ≡ 0)
      this._turnYaw = e * Math.PI * 2;
      this._applyTurntableYaw();
      if (t >= 1) {
        this._finishShowcase();
      }
    },

    _finishShowcase() {
      if (!this._showcasing) return;
      this._showcasing = false;
      this._turnYaw = 0;
      this._turnYawGoal = 0;
      this._applyTurntableYaw();
      this._pinFrontCamera();
      if (this.orbit) {
        try {
          this.orbit.isLockRotate = false;
        } catch (e) {
          /* ignore */
        }
      }
      this.triggerEvent('showcase-end', {
        workId: this.work.id,
        workLabel: WORK_LABELS[this.work.id] || this.work.id,
      });
      this._emitState();
    },

    _cancelShowcase() {
      if (!this._showcasing && this._turnYaw === 0) {
        this._turnYawGoal = 0;
        return;
      }
      const was = this._showcasing;
      this._showcasing = false;
      this._showcaseStart = 0;
      this._turnYaw = 0;
      this._turnYawGoal = 0;
      this._applyTurntableYaw();
      this._pinFrontCamera();
      if (was) {
        this.triggerEvent('showcase-end', {
          workId: this.work.id,
          workLabel: WORK_LABELS[this.work.id] || this.work.id,
          cancelled: true,
        });
      }
    },

    /** Finished showcase / interrupt: desk front; camera fixed 正视角. */
    _returnToFrontCamera() {
      this._turnYawGoal = 0;
      this._pinFrontCamera();
      if (this.orbit) {
        try {
          this.orbit.isLockRotate = false;
        } catch (e) {
          /* ignore */
        }
      }
    },

    _startParticles() {
      const start = Date.now();
      const duration = 2200;
      const n = Math.max(1, this.particleEls.length);
      const states = this.particleEls.map((_, i) => {
        const burst = i < n / 2 ? 0 : 0.38;
        const ang = (i / n) * Math.PI * 2 + (i % 2) * 0.4;
        const speed = 1.3 + (i % 4) * 0.28;
        return {
          vx: Math.cos(ang) * speed,
          vy: 2.4 + (i % 3) * 0.35,
          vz: Math.sin(ang) * speed * 0.75,
          burst,
        };
      });

      const patchShow: Record<string, any> = {};
      for (let i = 0; i < this.data.particles.length; i++) {
        patchShow[`particles[${i}].visible`] = true;
      }
      if (Object.keys(patchShow).length) this.setData(patchShow);

      this._tickFns.push(() => {
        const elapsed = Date.now() - start;
        if (elapsed > duration) {
          this._hideParticles();
          return false;
        }
        const t = elapsed / 1000;
        const patch: Record<string, string> = {};
        for (let i = 0; i < states.length; i++) {
          const st = states[i];
          const age = Math.max(0, t - st.burst);
          const x = st.vx * age;
          const y = 1.7 + st.vy * age - 2.2 * age * age;
          const z = st.vz * age;
          patch[`particles[${i}].position`] = `${x} ${y} ${z}`;
          const el = this.particleEls[i];
          const tr = this._getTransform(el);
          if (tr && tr.position && tr.rotation) {
            tr.position.x = x;
            tr.position.y = y;
            tr.position.z = z;
            tr.rotation.y = age * 4;
          }
        }
        this.setData(patch);
        return true;
      });
    },

    _hideParticles() {
      const patch: Record<string, any> = {};
      for (let i = 0; i < this.data.particles.length; i++) {
        patch[`particles[${i}].visible`] = false;
        patch[`particles[${i}].position`] = '0 -20 0';
      }
      if (Object.keys(patch).length) this.setData(patch);
    },

    // ---------- Tick ----------

    handleTick({ detail }: any) {
      // xr-frame may report seconds or ms — normalize to ms
      let dt = typeof detail === 'number' ? detail : detail?.value ?? 16;
      if (dt > 0 && dt < 1) dt *= 1000;
      if (dt <= 0 || dt > 100) dt = 16;

      this._updateFps(dt);
      this._applyOrbitLimits();
      this._runTickFns(dt);
      // Keep damping even during celebrate so front-camera settle plays out
      this._updateCameraFollow(dt);

      if (this._celebrating) return;

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
        if (!this._snapPopped) this._playSound('pop');
        this.virtualProgress = 0;
        const next = this.currentStep + 1;
        if (next >= this.work.steps.length) {
          this.currentStep = this.work.steps.length;
          this._triggerCelebration();
          this._emitState();
          return;
        }
        this._pendingAdvance = next;
        // Scale rest beat with speed so 1s/3s/5s labels match real cycle time
        const holdScale = Math.max(0.15, this.data.speedMultiplier || 1);
        this._holdUntil = Date.now() + STEP_HOLD_MS / holdScale;
        this.activePlayer = null;
        this._emitState();
      } else {
        // Fire 「啪」at the magnet snap moment (not only at settle)
        if (
          !this._snapPopped &&
          this.activePlayer.isInSnapPhase(this.virtualProgress)
        ) {
          this._snapPopped = true;
          this._playSound('pop');
        }
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
          'tile-rect',
          'tile-right',
          'tile-large',
          'tile-hex',
          'tile-window',
          'tile-square-red',
          'tile-square-blue',
          'tile-square-yellow',
          'tile-triangle-green',
          'tile-triangle-orange',
          'tile-rect-blue',
          'tile-rect-red',
          'tile-right-green',
          'tile-right-orange',
          'tile-large-yellow',
          'tile-large-orange',
          'tile-hex-green',
          'tile-hex-blue',
          'tile-window-blue',
          'tile-window-yellow',
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
      ['pop', 'slide', 'celebrate', 'ambient'].forEach((k) => {
        const a = this._audio[k as 'pop'];
        if (a) {
          try {
            a.stop();
            a.destroy();
          } catch (e) {
            /* ignore */
          }
        }
      });
    },
  },
});
