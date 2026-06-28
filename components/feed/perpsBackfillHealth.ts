'use client';

import { useEffect, useState } from 'react';

export type PerpsFeedBackfillDelayReason = 'userFills' | 'reconcile' | null;

export type PerpsFeedBackfillHealthState = {
  stale: boolean;
  reason: PerpsFeedBackfillDelayReason;
  updatedAt: number | null;
};

export const INITIAL_PERPS_FEED_BACKFILL_HEALTH_STATE: PerpsFeedBackfillHealthState =
  {
    stale: false,
    reason: null,
    updatedAt: null,
  };

type PerpsFeedBackfillHealthUpdate = {
  stale: boolean;
  reason?: Exclude<PerpsFeedBackfillDelayReason, null>;
  updatedAt?: number;
};

export function resolvePerpsFeedBackfillHealthState(
  previous: PerpsFeedBackfillHealthState,
  update: PerpsFeedBackfillHealthUpdate,
): PerpsFeedBackfillHealthState {
  const updatedAt = update.updatedAt ?? Date.now();

  if (!update.stale) {
    return {
      stale: false,
      reason: null,
      updatedAt,
    };
  }

  return {
    stale: true,
    reason: update.reason ?? previous.reason ?? 'reconcile',
    updatedAt,
  };
}

export function getPerpsFeedBackfillDelayLabel(
  state: PerpsFeedBackfillHealthState,
) {
  if (!state.stale) return null;
  return state.reason === 'userFills'
    ? 'fills refresh delayed'
    : 'position sync delayed';
}

let currentState = INITIAL_PERPS_FEED_BACKFILL_HEALTH_STATE;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function setPerpsFeedBackfillHealth(
  update: PerpsFeedBackfillHealthUpdate,
) {
  currentState = resolvePerpsFeedBackfillHealthState(currentState, update);
  emitChange();
}

export function resetPerpsFeedBackfillHealth() {
  currentState = INITIAL_PERPS_FEED_BACKFILL_HEALTH_STATE;
  emitChange();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePerpsFeedBackfillHealthState() {
  const [state, setState] = useState(currentState);

  useEffect(() => {
    return subscribe(() => {
      setState(currentState);
    });
  }, []);

  return state;
}
