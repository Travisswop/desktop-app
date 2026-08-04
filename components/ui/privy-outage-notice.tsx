'use client';

import { usePrivyStatus } from '@/hooks/usePrivyStatus';

/**
 * Amber notice shown while Privy (the wallet/auth provider) reports an
 * active incident on status.privy.io. Renders nothing when all is well.
 * Place near auth or signing surfaces so provider outages don't read as
 * Swop bugs or user error.
 */
const PrivyOutageNotice = ({ className = '' }: { className?: string }) => {
  const { hasIssues, incidents } = usePrivyStatus();

  if (!hasIssues) return null;

  const incident = incidents[0];

  return (
    <div
      className={`rounded-2xl border border-amber-200 bg-amber-50 p-4 ${className}`}
    >
      <p className="text-[13px] leading-relaxed text-amber-800">
        <span className="font-semibold">
          Our wallet provider is having issues.
        </span>{' '}
        {incident?.name ? `${incident.name} — ` : ''}sign-ins, sends, swaps,
        and predictions may fail until it&apos;s resolved. This is not a
        problem with your account.{' '}
        <a
          href={incident?.url || 'https://status.privy.io'}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline underline-offset-2 hover:text-amber-900"
        >
          Check status
        </a>
      </p>
    </div>
  );
};

export default PrivyOutageNotice;
