// Single source of truth for the Goldman Sacks "autonomy gate" derivation.
//
// The core concept this encodes: turning a strategy on is NOT the same as
// autonomous trading. A strategy runs in *Proposal mode* — Goldman asks the
// user to approve each trade — UNTIL an Access Station venue gate is opened for
// a relevant venue (that venue set to trade without per-action approval). So a
// strategy is autonomous only when BOTH hold:
//   1. its runtime executionMode would run without per-action approval, and
//   2. at least one venue it uses has its Access Station gate open
//      (enabled === true && approvalRequired === false).
//
// Both the StrategyApprovalModal and the console status chip read from these
// helpers so they never drift apart. The Access Station config lives on the
// group agent as per-venue { enabled, approvalRequired } controls; the strategy
// executionMode lives on strategy.runtime.executionMode.

import type { GoldmanTradingStrategy } from './goldmanTypes';

// Minimal shape of a single Access Station venue control. Both the modal's
// GoldmanAccessStation.access values and the console's local GoldmanAccessState
// entries satisfy this (partial in the modal case).
export type AccessControlLike = {
  enabled?: boolean;
  approvalRequired?: boolean;
};

// A lookup of venue-access controls keyed by Access Station access key.
export type AccessLookup = Partial<Record<string, AccessControlLike | undefined>>;

export type VenueAutonomyState =
  | 'autonomous'
  | 'asks_first'
  | 'off'
  | 'unknown';

export type VenueAutonomy = {
  venue: string;
  state: VenueAutonomyState;
};

// Maps a strategy venue name onto the Access Station access key that gates it.
export function accessKeyForVenue(venue: string): string {
  const normalized = venue.trim().toLowerCase();
  if (normalized.includes('polymarket') || normalized.includes('prediction')) {
    return 'predictions';
  }
  if (normalized.includes('hyperliquid') || normalized.includes('perp')) {
    return 'perps';
  }
  if (normalized.includes('aave')) return 'aave';
  if (
    normalized.includes('lifi') ||
    normalized.includes('jupiter') ||
    normalized.includes('swap')
  ) {
    return 'swaps';
  }
  return normalized;
}

function controlForVenue(
  access: AccessLookup | undefined,
  venue: string
): AccessControlLike | undefined {
  if (!access) return undefined;
  return access[accessKeyForVenue(venue)];
}

// Per-venue autonomy state for a list of strategy venues, given the current
// Access Station access lookup.
export function deriveVenueAutonomy(
  venues: string[],
  access: AccessLookup | undefined
): VenueAutonomy[] {
  return venues.map((venue) => {
    const control = controlForVenue(access, venue);
    if (!control || typeof control.enabled !== 'boolean') {
      return { venue, state: 'unknown' as const };
    }
    if (!control.enabled) return { venue, state: 'off' as const };
    return {
      venue,
      state: control.approvalRequired
        ? ('asks_first' as const)
        : ('autonomous' as const),
    };
  });
}

export function venueAutonomyLabel(state: VenueAutonomyState) {
  switch (state) {
    case 'autonomous':
      return 'trades autonomously';
    case 'asks_first':
      return 'asks first';
    case 'off':
      return 'access off';
    default:
      return 'not configured';
  }
}

export function venueAutonomyClass(state: VenueAutonomyState) {
  switch (state) {
    case 'autonomous':
      return 'border-[#3fe08f]/25 bg-[#3fe08f]/10 text-[#9af7c4]';
    case 'asks_first':
      return 'border-[#f4c95d]/30 bg-[#f4c95d]/10 text-[#f4c95d]';
    case 'off':
      return 'border-[#ff5d63]/30 bg-[#ff5d63]/10 text-[#ff8585]';
    default:
      return 'border-white/[0.08] bg-black/25 text-[#9396a0]';
  }
}

// An executionMode that runs proposals (or only monitors) never trades without
// per-action approval. 'execute' is the only mode that *could* run autonomously
// — and only then if a venue gate is also open.
function executionModeRunsWithoutApproval(executionMode?: string | null) {
  return (executionMode || 'proposal').trim().toLowerCase() === 'execute';
}

export type StrategyAutonomy = {
  isAutonomous: boolean;
  // The venues (if any) whose Access Station gate is open (autonomous).
  openVenues: string[];
  label: string;
  caption: string;
};

// Derives the per-strategy autonomy summary shown as the console chip.
//
// "Autonomous" only when the executionMode would run without per-action
// approval AND at least one relevant venue gate is open; otherwise the strategy
// is in "Proposal mode" and Goldman asks before each trade.
export function deriveStrategyAutonomy(
  strategy: Pick<GoldmanTradingStrategy, 'venues' | 'runtime'>,
  access: AccessLookup | undefined
): StrategyAutonomy {
  const venues = Array.isArray(strategy.venues) ? strategy.venues : [];
  const openVenues = deriveVenueAutonomy(venues, access)
    .filter((item) => item.state === 'autonomous')
    .map((item) => item.venue);

  const isAutonomous =
    executionModeRunsWithoutApproval(strategy.runtime?.executionMode) &&
    openVenues.length > 0;

  return {
    isAutonomous,
    openVenues,
    label: isAutonomous ? 'Autonomous' : 'Proposal mode',
    caption: isAutonomous ? 'trades on its own' : 'approves each trade',
  };
}

// One-line explainer of the two-part autonomy gate, reused as tooltip/helper
// copy so the wording stays consistent across surfaces.
export const AUTONOMY_GATE_EXPLAINER =
  "Goldman asks before each trade until you open a venue's Access Station to autonomous.";
