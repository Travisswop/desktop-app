'use client';

import { useEffect, useRef } from 'react';

// This boundary previously rendered NextError and threw the error object away,
// so every client-side crash was invisible: no message, no digest, no route,
// no way to tell which user hit it. Report it instead — a crashed client tells
// us nothing else, so this beacon is the only signal we get.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const reportedRef = useRef(false);

  useEffect(() => {
    // React can re-invoke the boundary; only report the first occurrence.
    if (reportedRef.current) return;
    reportedRef.current = true;

    try {
      const userId =
        document.cookie
          .split('; ')
          .find((row) => row.startsWith('user-id='))
          ?.split('=')[1] ?? '';

      const payload = JSON.stringify({
        digest: error?.digest,
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        route: window.location.pathname + window.location.search,
        userId,
      });

      // sendBeacon survives the unload that a reload triggers; fall back to
      // fetch with keepalive where it isn't available.
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/client-error',
          new Blob([payload], { type: 'application/json' }),
        );
      } else {
        void fetch('/api/client-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Reporting must never mask the original error.
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          margin: 0,
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          background: '#fff',
          color: '#0a0a0c',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1
            style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}
          >
            Something went wrong
          </h1>
          <p style={{ marginTop: 12, fontSize: 14, color: '#6b7280' }}>
            This page hit an unexpected error. The details were sent to our
            team automatically.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 20,
              padding: '10px 20px',
              borderRadius: 9999,
              border: 'none',
              background: '#0a0a0c',
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {error?.digest ? (
            <p
              style={{
                marginTop: 20,
                fontSize: 12,
                color: '#9ca3af',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            >
              Reference: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
