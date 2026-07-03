'use client';

// Activity feed tab for the Goldman Sacks console panel.
// Primary source: GET .../agents/goldman-sacks/activity (paginated, newest
// first). While that endpoint has not shipped (404), it falls back to a
// client-side feed assembled from runtime-card events already received over
// the socket during this session, labeled subtly as such.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Radio } from 'lucide-react';
import { formatSignedUsd } from '@/lib/chat/ticketFormat';
import { fetchGoldmanActivity } from './goldmanApi';
import { GoldmanConsoleCard, GoldmanSectionLabel } from './consoleUi';
import type { GoldmanActivityEntry } from './goldmanTypes';

const PAGE_SIZE = 50;

type FeedStatus = 'loading' | 'ready' | 'fallback' | 'error';

function actionBadgeClass(action?: string | null) {
  const normalized = String(action || '').toLowerCase();
  if (normalized === 'entry') {
    return 'border-[#3fe08f]/25 bg-[#3fe08f]/10 text-[#9af7c4]';
  }
  if (normalized === 'exit') {
    return 'border-[#f4c95d]/30 bg-[#f4c95d]/10 text-[#f4c95d]';
  }
  if (normalized === 'redeem') {
    return 'border-[#6b9bff]/25 bg-[#6b9bff]/10 text-[#b8c8ff]';
  }
  if (normalized === 'withdraw') {
    return 'border-[#b893ff]/25 bg-[#b893ff]/10 text-[#d9c6ff]';
  }
  if (normalized === 'fill_adjustment') {
    return 'border-[#67d9ff]/25 bg-[#67d9ff]/10 text-[#9fe8ff]';
  }
  return 'border-white/[0.08] bg-black/25 text-[#9396a0]';
}

function formatEntryTime(ts?: string | null) {
  if (!ts) return '';
  const date = new Date(ts);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ActivityEntryRow({ entry }: { entry: GoldmanActivityEntry }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const pnlUsd =
    entry.pnlUsd === null || entry.pnlUsd === undefined
      ? null
      : Number(entry.pnlUsd);
  const longText = [entry.thesis, entry.lesson, entry.detail]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' — ');
  const canExpand = longText.length > 90;

  return (
    <div className="border-t border-white/[0.045] px-3 py-2.5 first:border-t-0">
      <div className="flex items-center gap-2">
        <span
          className={`dm-mono flex-shrink-0 rounded-[6px] border px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.08em] ${actionBadgeClass(
            entry.action
          )}`}
        >
          {entry.action || entry.label || 'event'}
        </span>
        {entry.venue && (
          <span className="dm-mono flex-shrink-0 text-[9.5px] font-bold uppercase tracking-[0.06em] text-[#737783]">
            {entry.venue}
          </span>
        )}
        <span className="min-w-0 flex-1" />
        {pnlUsd !== null && Number.isFinite(pnlUsd) && (
          <span
            className={`dm-mono flex-shrink-0 text-[10.5px] font-bold ${
              pnlUsd >= 0 ? 'text-[#3fe08f]' : 'text-[#ff8585]'
            }`}
          >
            {formatSignedUsd(pnlUsd)}
          </span>
        )}
        <span className="dm-mono flex-shrink-0 text-[9px] font-semibold text-[#5a5e69]">
          {formatEntryTime(entry.ts)}
        </span>
      </div>
      {entry.label && entry.action && (
        <div className="mt-1 text-[11px] font-semibold leading-snug text-[#d7dae2]">
          {entry.label}
        </div>
      )}
      {entry.outcome && (
        <div className="dm-mono mt-1 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-[#9396a0]">
          {entry.outcome}
        </div>
      )}
      {longText && (
        <div className="mt-1">
          <p
            className={`text-[10.5px] leading-snug text-[#9396a0] ${
              isExpanded ? '' : 'line-clamp-2'
            }`}
          >
            {longText}
          </p>
          {canExpand && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="dm-btn dm-mono mt-0.5 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#737783] hover:text-[#eceef2]"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  more
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function GoldmanActivityFeed({
  groupId,
  accessToken,
  sessionEntries,
}: {
  groupId?: string;
  accessToken?: string | null;
  // Fallback feed assembled from runtime-card socket events this session.
  sessionEntries: GoldmanActivityEntry[];
}) {
  const [status, setStatus] = useState<FeedStatus>('loading');
  const [entries, setEntries] = useState<GoldmanActivityEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;

    if (!groupId || !accessToken) {
      setStatus('fallback');
      setEntries([]);
      return;
    }

    setStatus('loading');
    setError(null);

    fetchGoldmanActivity({ groupId, accessToken, limit: PAGE_SIZE })
      .then((page) => {
        if (requestId !== requestIdRef.current) return;
        if (!page.supported) {
          setStatus('fallback');
          setEntries([]);
          return;
        }
        setEntries(page.entries);
        setHasMore(page.entries.length >= PAGE_SIZE);
        setStatus('ready');
      })
      .catch((fetchError) => {
        if (requestId !== requestIdRef.current) return;
        setStatus('error');
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Could not load Goldman activity.'
        );
      });
  }, [accessToken, groupId]);

  const handleLoadMore = useCallback(() => {
    if (!groupId || !accessToken || isLoadingMore) return;
    const oldest = entries[entries.length - 1];
    if (!oldest?.ts) {
      setHasMore(false);
      return;
    }

    setIsLoadingMore(true);
    fetchGoldmanActivity({
      groupId,
      accessToken,
      limit: PAGE_SIZE,
      before: oldest.ts,
    })
      .then((page) => {
        if (!page.supported || page.entries.length === 0) {
          setHasMore(false);
          return;
        }
        setEntries((current) => {
          const seen = new Set(current.map((entry) => entry.id));
          return [
            ...current,
            ...page.entries.filter((entry) => !seen.has(entry.id)),
          ];
        });
        setHasMore(page.entries.length >= PAGE_SIZE);
      })
      .catch(() => {
        setHasMore(false);
      })
      .finally(() => {
        setIsLoadingMore(false);
      });
  }, [accessToken, entries, groupId, isLoadingMore]);

  const displayEntries = useMemo(
    () => (status === 'ready' ? entries : sessionEntries),
    [entries, sessionEntries, status]
  );

  return (
    <div data-testid="goldman-activity-feed">
      <GoldmanSectionLabel>
        {status === 'fallback' ? (
          <span className="inline-flex items-center gap-1.5">
            activity
            <span className="normal-case tracking-normal text-[#454952]">
              · live session activity
            </span>
          </span>
        ) : (
          'activity'
        )}
      </GoldmanSectionLabel>

      {status === 'loading' && (
        <GoldmanConsoleCard padClass="px-3 py-4">
          <div className="flex items-center justify-center gap-2 text-[10.5px] font-semibold text-[#737783]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading activity...
          </div>
        </GoldmanConsoleCard>
      )}

      {status === 'error' && (
        <GoldmanConsoleCard padClass="px-3 py-3">
          <div className="text-[10.5px] font-semibold leading-snug text-[#ff8585]">
            {error || 'Could not load Goldman activity.'}
          </div>
        </GoldmanConsoleCard>
      )}

      {status !== 'loading' && status !== 'error' && (
        <>
          {displayEntries.length === 0 ? (
            <GoldmanConsoleCard padClass="px-3 py-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <Radio className="h-4 w-4 text-[#5a5e69]" />
                <div className="text-[10.5px] font-semibold leading-snug text-[#737783]">
                  No activity yet. Run a strategy and entries, exits, and
                  redemptions will land here.
                </div>
              </div>
            </GoldmanConsoleCard>
          ) : (
            <GoldmanConsoleCard padClass="p-0">
              {displayEntries.map((entry) => (
                <ActivityEntryRow key={entry.id} entry={entry} />
              ))}
              {status === 'ready' && hasMore && (
                <div className="border-t border-white/[0.045] p-2">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="dm-btn dm-mono flex h-8 w-full items-center justify-center gap-1.5 rounded-[8px] border border-white/[0.07] bg-black/20 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#9396a0] hover:text-[#eceef2] disabled:cursor-default disabled:opacity-50"
                  >
                    {isLoadingMore ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    Load older
                  </button>
                </div>
              )}
            </GoldmanConsoleCard>
          )}
        </>
      )}
    </div>
  );
}
