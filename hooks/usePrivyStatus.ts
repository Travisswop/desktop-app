'use client';

import { useEffect, useState } from 'react';

export interface PrivyIncident {
  id: string;
  name: string;
  status: string;
  impact: string;
  started: string;
  url: string;
}

export interface PrivyStatus {
  /** True while Privy's status page reports an active incident. */
  hasIssues: boolean;
  incidents: PrivyIncident[];
}

const POLL_INTERVAL_MS = 60_000;

/**
 * Polls /api/privy-status (a cached proxy of status.privy.io) so auth and
 * signing surfaces can attribute failures to a Privy outage instead of
 * showing generic errors. Returns { hasIssues: false } until the first
 * successful fetch — never blocks or breaks the flow it decorates.
 */
export function usePrivyStatus(): PrivyStatus {
  const [status, setStatus] = useState<PrivyStatus>({
    hasIssues: false,
    incidents: [],
  });

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch('/api/privy-status');
        if (!res.ok) return;
        const data = (await res.json()) as PrivyStatus;
        if (!cancelled && data && typeof data.hasIssues === 'boolean') {
          setStatus({
            hasIssues: data.hasIssues,
            incidents: Array.isArray(data.incidents) ? data.incidents : [],
          });
        }
      } catch {
        // Status check is best-effort; keep the last known state.
      }
    };

    void check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return status;
}
