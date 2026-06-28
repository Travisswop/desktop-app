import type { ApprovedActionBoundary } from '@/lib/chat/agentActionHandoff';

type ApprovedActionBoundaryNoticeProps = {
  boundary?: ApprovedActionBoundary | null;
  intro: string;
  accent?: 'blue' | 'emerald';
  className?: string;
};

const ACCENT_STYLES = {
  blue: {
    shell:
      'border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-50 text-slate-900',
    badge: 'bg-blue-600 text-white',
    chip: 'border-blue-200 bg-blue-50 text-blue-700',
    copy: 'text-slate-600',
    label: 'text-slate-500',
    listBullet: 'bg-blue-500',
  },
  emerald: {
    shell:
      'border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 text-slate-900',
    badge: 'bg-emerald-600 text-white',
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    copy: 'text-slate-600',
    label: 'text-slate-500',
    listBullet: 'bg-emerald-500',
  },
} as const;

function formatUsd(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim().replace(/,/g, '');
  if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) return value;

  const [wholePart, fractionalPart] = trimmed.split('.');
  const isNegative = wholePart.startsWith('-');
  const wholeDigits = isNegative ? wholePart.slice(1) : wholePart;
  const groupedWholeDigits = wholeDigits.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ',',
  );

  return `${isNegative ? '-' : ''}$${groupedWholeDigits}${fractionalPart ? `.${fractionalPart}` : ''}`;
}

function formatExpiry(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  });
}

export function hasApprovedActionBoundary(
  boundary?: ApprovedActionBoundary | null,
) {
  return Boolean(
    boundary?.reviewStateLabel ||
      boundary?.maxOrderUsd ||
      boundary?.maxDailySpendUsd ||
      boundary?.maxDailyLossUsd ||
      boundary?.maxOpenPositions ||
      boundary?.expiry ||
      boundary?.riskControls?.length,
  );
}

export function ApprovedActionBoundaryNotice({
  boundary,
  intro,
  accent = 'blue',
  className = '',
}: ApprovedActionBoundaryNoticeProps) {
  if (!hasApprovedActionBoundary(boundary)) return null;

  const tone = ACCENT_STYLES[accent];
  const metrics = [
    {
      label: 'Max order',
      value: formatUsd(boundary?.maxOrderUsd),
    },
    {
      label: 'Daily spend cap',
      value: formatUsd(boundary?.maxDailySpendUsd),
    },
    {
      label: 'Daily loss cap',
      value: formatUsd(boundary?.maxDailyLossUsd),
    },
    {
      label: 'Open positions',
      value: boundary?.maxOpenPositions || null,
    },
    {
      label: 'Expiry',
      value: formatExpiry(boundary?.expiry),
    },
  ].filter((metric) => metric.value);

  return (
    <div
      className={`rounded-2xl border px-4 py-3 shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)] ${tone.shell} ${className}`.trim()}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Approved Boundary
          </div>
          <p className={`mt-1 text-[12.5px] font-medium leading-relaxed ${tone.copy}`}>
            {intro}
          </p>
        </div>
        {boundary?.reviewStateLabel && (
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] ${tone.badge}`}
          >
            {boundary.reviewStateLabel}
          </span>
        )}
      </div>

      {metrics.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-black/[0.06] bg-white/80 px-3 py-2"
            >
              <div className={`text-[10.5px] font-semibold uppercase tracking-[0.12em] ${tone.label}`}>
                {metric.label}
              </div>
              <div className="mt-1 text-[13px] font-semibold text-slate-900">
                {metric.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {boundary?.riskControls?.length ? (
        <div className="mt-3">
          <div className={`text-[10.5px] font-semibold uppercase tracking-[0.12em] ${tone.label}`}>
            Risk Controls
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {boundary.riskControls.map((control) => (
              <span
                key={control}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11.5px] font-medium ${tone.chip}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${tone.listBullet}`} />
                {control}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
