import { BASE_DURATION, STEP_HOLD_MS } from './works';

/** One full step cycle at 1× (fly + hold), seconds. */
export const STEP_CYCLE_SEC = BASE_DURATION + STEP_HOLD_MS / 1000;

export interface SpeedPreset {
  /** Display label, e.g. "5s" */
  label: string;
  /** Target seconds between tile snaps (includes hold). */
  intervalSec: number;
  /** Multiplier applied to fly progress (and scaled hold). */
  multiplier: number;
}

/**
 * Build presets so the on-screen seconds match real cycle time:
 * cycle ≈ STEP_CYCLE_SEC / multiplier  (hold is also scaled by 1/multiplier).
 */
export function makeSpeedPresets(intervals: number[] = [1, 3, 5]): SpeedPreset[] {
  return intervals.map((intervalSec) => ({
    label: `${intervalSec}s`,
    intervalSec,
    multiplier: Math.round((STEP_CYCLE_SEC / intervalSec) * 1000) / 1000,
  }));
}

export const SPEED_PRESETS: SpeedPreset[] = makeSpeedPresets([1, 3, 5]);

/** Default = middle interval (3s). */
export const DEFAULT_SPEED_MULTIPLIER =
  SPEED_PRESETS.find((p) => p.intervalSec === 3)?.multiplier ?? 1;
