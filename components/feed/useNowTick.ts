"use client";

import { useSyncExternalStore } from "react";

// One shared interval drives every subscribed timestamp, so a feed of N cards
// costs a single timer instead of N.
const TICK_MS = 30_000;

const listeners = new Set<() => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;
let now = Date.now();

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (intervalId === null) {
    intervalId = setInterval(() => {
      now = Date.now();
      listeners.forEach((notify) => notify());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

function getSnapshot() {
  return now;
}

export function useNowTick() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
