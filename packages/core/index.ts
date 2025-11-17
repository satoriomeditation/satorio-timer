
/**
 * Core, platform-agnostic utilities for the meditation timer.
 * These functions have no DOM dependencies so they can be reused in web and native apps later.
 */

export type BellType = 'start' | 'end'

/** A simple bell using WebAudio-like interface; platform provides an implementation */
export interface BellPlayer {
  playBell: (type: BellType) => Promise<void> | void
}

/** Format seconds to MM:SS */
export function formatMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const mPart = Math.floor(s / 60).toString().padStart(2, '0')
  const sPart = (s % 60).toString().padStart(2, '0')
  return `${mPart}:${sPart}`
}

/** A clock that derives remaining time from a target end timestamp for accuracy on sleep/background. */
export function createCountdown(targetEpochMs: number) {
  const now = () => performance.now ? performance.now() : Date.now()
  // Bridge performance.now() to epoch for stable math
  const perfEpochOffset = Date.now() - now()

  function remainingMs() {
    const epochNow = now() + perfEpochOffset
    return Math.max(0, targetEpochMs - epochNow)
  }
  function remainingSeconds() {
    return Math.ceil(remainingMs() / 1000)
  }
  function isFinished() { return remainingMs() <= 0 }

  return { remainingMs, remainingSeconds, isFinished }
}

/** Utility to compute a future epoch ms from minutes */
export function minutesFromNow(mins: number): number {
  const ms = Math.max(0, mins) * 60_000
  return Date.now() + ms
}
