import { cn } from "@/lib/utils";

type MarketPriceDelayNoticeProps = {
  degraded?: boolean;
  className?: string;
};

export function MarketPriceDelayNotice({
  degraded = false,
  className,
}: MarketPriceDelayNoticeProps) {
  if (!degraded) return null;

  return (
    <span
      className={cn(
        "font-mono text-[10px] font-black uppercase tracking-[0.16em] text-amber-600",
        className,
      )}
    >
      Price delayed
    </span>
  );
}
