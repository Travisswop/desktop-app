import type { PerpsOpenFillSnapshot } from '@/lib/perps/perpsFeed';

export function shouldSkipPerpsPositionBackfill({
  fillsDegraded,
  openedFill,
}: {
  fillsDegraded: boolean;
  openedFill: PerpsOpenFillSnapshot | null;
}) {
  return fillsDegraded && !openedFill?.timestamp;
}
