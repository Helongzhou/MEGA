/**
 * Pure build-session state machine — shared semantics for runtime + offline tests.
 * Scene mutations stay in xr-builder; this module only owns step / progress rules.
 */

import { BASE_DURATION, STEP_HOLD_MS } from './works';

export type PlayMode = 'manual' | 'watch';

export interface BuildSessionState {
  mode: PlayMode;
  currentStep: number;
  totalSteps: number;
  /** Completed boundary for gotoStep semantics (i < boundary settled). */
  completedBoundary: number;
  virtualProgress: number;
  isAutoPlaying: boolean;
  isPaused: boolean;
  speedMultiplier: number;
  celebrating: boolean;
  completed: boolean;
  /** When > 0 (epoch ms), hold before advancing. */
  holdUntil: number;
  pendingAdvance: number | null;
}

export function createSession(totalSteps: number, mode: PlayMode = 'manual'): BuildSessionState {
  return {
    mode,
    currentStep: 0,
    totalSteps,
    completedBoundary: 0,
    virtualProgress: 0,
    isAutoPlaying: mode === 'watch',
    isPaused: true,
    speedMultiplier: 1,
    celebrating: false,
    completed: false,
    holdUntil: 0,
    pendingAdvance: null,
  };
}

/** Visibility after gotoStep(index): i < index → visible. */
export function visibilityAfterGoto(totalSteps: number, index: number): boolean[] {
  const clamped = Math.max(-1, Math.min(totalSteps, index));
  return Array.from({ length: totalSteps }, (_, i) => i < clamped);
}

export function prepareStep(state: BuildSessionState, stepIndex: number): BuildSessionState {
  if (stepIndex < 0 || stepIndex >= state.totalSteps) {
    return { ...state, pendingAdvance: null, holdUntil: 0 };
  }
  return {
    ...state,
    currentStep: stepIndex,
    completedBoundary: stepIndex,
    virtualProgress: 0,
    pendingAdvance: null,
    holdUntil: 0,
    celebrating: false,
    completed: false,
  };
}

export function commitStep(state: BuildSessionState, stepIndex: number): BuildSessionState {
  if (stepIndex < 0 || stepIndex >= state.totalSteps) return state;
  return {
    ...state,
    completedBoundary: stepIndex + 1,
    virtualProgress: 0,
  };
}

export function settleManualStep(state: BuildSessionState, stepIndex: number, now: number): BuildSessionState {
  const next = commitStep(state, stepIndex);
  return {
    ...next,
    holdUntil: now + STEP_HOLD_MS,
    pendingAdvance: stepIndex + 1,
  };
}

export function advanceTo(state: BuildSessionState, next: number): BuildSessionState {
  const cleared = { ...state, pendingAdvance: null, holdUntil: 0 };
  if (next >= state.totalSteps) {
    return {
      ...cleared,
      currentStep: state.totalSteps,
      completedBoundary: state.totalSteps,
      celebrating: true,
      completed: true,
      isPaused: true,
      isAutoPlaying: false,
      virtualProgress: 0,
    };
  }
  return prepareStep(cleared, next);
}

export function tickAutoplay(
  state: BuildSessionState,
  dtMs: number,
  now: number,
): { state: BuildSessionState; committed: boolean; celebrated: boolean } {
  if (state.celebrating || state.completed) {
    return { state, committed: false, celebrated: false };
  }

  // Shared hold gate (manual settle OR autoplay inter-step gap)
  if (state.pendingAdvance != null) {
    if (now >= state.holdUntil) {
      const advanced = advanceTo(state, state.pendingAdvance);
      return { state: advanced, committed: false, celebrated: advanced.celebrating };
    }
    return { state, committed: false, celebrated: false };
  }

  if (state.mode !== 'watch' || !state.isAutoPlaying || state.isPaused) {
    return { state, committed: false, celebrated: false };
  }
  if (state.currentStep >= state.totalSteps) {
    return { state, committed: false, celebrated: false };
  }

  let virtualProgress = state.virtualProgress + ((dtMs / 1000) * state.speedMultiplier) / BASE_DURATION;
  if (virtualProgress < 1) {
    return { state: { ...state, virtualProgress }, committed: false, celebrated: false };
  }

  const afterCommit = commitStep(state, state.currentStep);
  const next = state.currentStep + 1;
  if (next >= state.totalSteps) {
    const done = advanceTo(afterCommit, next);
    return { state: done, committed: true, celebrated: true };
  }

  // Hold ≥ 1.5s before next fly-in (P6). currentStep stays on settled index until advance.
  return {
    state: {
      ...afterCommit,
      virtualProgress: 0,
      holdUntil: now + STEP_HOLD_MS,
      pendingAdvance: next,
    },
    committed: true,
    celebrated: false,
  };
}

export function stepPrev(state: BuildSessionState): BuildSessionState {
  const target = Math.max(0, state.currentStep - 1);
  return {
    ...prepareStep(state, target),
    isPaused: true,
    virtualProgress: 0,
  };
}

export function stepNext(state: BuildSessionState): BuildSessionState {
  const committed =
    state.currentStep < state.totalSteps ? commitStep(state, state.currentStep) : state;
  const next = Math.min(state.totalSteps, state.currentStep + 1);
  if (next >= state.totalSteps) {
    return advanceTo(committed, next);
  }
  return {
    ...prepareStep(committed, next),
    isPaused: true,
  };
}

export function switchMode(state: BuildSessionState, mode: PlayMode): BuildSessionState {
  const step = Math.max(0, Math.min(state.totalSteps, state.currentStep));
  const base =
    step >= state.totalSteps
      ? { ...state, mode, currentStep: step, isPaused: true, isAutoPlaying: false }
      : prepareStep({ ...state, mode }, step);
  return {
    ...base,
    mode,
    isAutoPlaying: mode === 'watch',
    isPaused: true,
    virtualProgress: 0,
  };
}

export function switchWork(totalSteps: number, mode: PlayMode): BuildSessionState {
  return createSession(totalSteps, mode);
}

export function setSpeed(state: BuildSessionState, speed: number): BuildSessionState {
  // Keep virtualProgress (plan step 11)
  return { ...state, speedMultiplier: speed };
}

export function replay(state: BuildSessionState): BuildSessionState {
  return {
    ...prepareStep(state, 0),
    celebrating: false,
    completed: false,
    isPaused: true,
    isAutoPlaying: state.mode === 'watch',
    completedBoundary: 0,
  };
}
