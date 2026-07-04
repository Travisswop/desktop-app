import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Bento design-system primitives.
 *
 * Shared building blocks for the light "bento" theme — white hairline-bordered
 * cards, pill chips, and section headers. See DESIGN_SYSTEM.md for the full token
 * reference. Prefer these over restyling cards/chips/headers from scratch so the
 * look stays consistent as components are added and updated.
 */

// Hairline-bordered card — the base surface of the bento theme.
const BentoCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { padding?: string }
>(({ className, padding = '', children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'bg-white rounded-2xl border border-black/[0.06] shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)]',
      padding,
      className,
    )}
    {...props}
  >
    {children}
  </div>
));
BentoCard.displayName = 'BentoCard';

const chipClassName = (active: boolean) =>
  cn(
    'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] font-medium whitespace-nowrap border transition',
    active
      ? 'bg-gray-900 text-white border-gray-900'
      : 'bg-white text-gray-900 border-black/[0.06] hover:border-black/[0.15]',
  );

// Pill-shaped chip used for filters and section actions.
// Pass `asLabel` to render a non-interactive display pill (a <span>) instead of a button.
const Chip = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    active?: boolean;
    asLabel?: boolean;
  }
>(
  (
    {
      className,
      active = false,
      asLabel = false,
      type = 'button',
      children,
      ...props
    },
    ref,
  ) => {
    if (asLabel) {
      return (
        <span className={cn(chipClassName(active), 'cursor-default', className)}>
          {children}
        </span>
      );
    }
    return (
      <button
        ref={ref}
        type={type}
        className={cn(chipClassName(active), className)}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Chip.displayName = 'Chip';

// Small non-interactive pill that marks a recipient as an agent vault (not a
// person) in lists like the Send recipient search. Reuses the pill tokens.
function AgentBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10.5px] font-semibold whitespace-nowrap border border-black/[0.06] bg-gray-50 text-gray-600 flex-shrink-0',
        className,
      )}
    >
      <span aria-hidden>🤖</span>
      Agent
    </span>
  );
}

// Section header — title + caption + optional action, matching the wallet layout.
function SectionHead({
  title,
  caption,
  action,
  className,
}: {
  title: string;
  caption?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('flex items-end justify-between gap-3 mb-3', className)}
    >
      <div className="min-w-0">
        <h2 className="text-[22px] leading-tight font-semibold tracking-[-0.02em] text-gray-900">
          {title}
        </h2>
        {caption && (
          <p className="text-[13px] text-gray-500 mt-0.5 tracking-tight">
            {caption}
          </p>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-1.5 flex-shrink-0">{action}</div>
      )}
    </div>
  );
}

export { BentoCard, Chip, AgentBadge, SectionHead };
