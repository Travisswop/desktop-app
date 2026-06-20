'use client';

import { useSyncExternalStore } from 'react';
import type { PerpsFeedSourceSnapshot } from './perpsFeedHealth';

const listeners = new Set<() => void>();
const snapshotsByMasterAddress = new Map<string, PerpsFeedSourceSnapshot>();

function normalizeMasterAddress(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(masterAddress?: string | null) {
  const key = normalizeMasterAddress(masterAddress);
  if (!key) return null;
  return snapshotsByMasterAddress.get(key) || null;
}

export function publishPerpsFeedSourceSnapshot(
  snapshot: PerpsFeedSourceSnapshot,
) {
  const key = normalizeMasterAddress(snapshot.masterAddress);
  if (!key) return;

  snapshotsByMasterAddress.set(key, snapshot);
  listeners.forEach((listener) => listener());
}

export function usePerpsFeedSourceSnapshot(masterAddress?: string | null) {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot(masterAddress),
    () => null,
  );
}
