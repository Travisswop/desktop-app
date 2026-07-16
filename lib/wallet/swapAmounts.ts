const DEFAULT_DISPLAY_DECIMALS = 8;
const PERCENTAGE_SCALE = 10_000n;
export const SOLANA_WRAPPED_SOL_RENT_LAMPORTS = 2_039_280n;
export const SOLANA_SWAP_LAMPORT_BUFFER = 15_000n;
export const SOLANA_NATIVE_SWAP_RESERVE_LAMPORTS =
  SOLANA_WRAPPED_SOL_RENT_LAMPORTS + SOLANA_SWAP_LAMPORT_BUFFER;

export function normalizeTokenDecimals(decimals: number | bigint | undefined, fallback = 6) {
  const value = typeof decimals === 'bigint' ? Number(decimals) : decimals;
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(Math.trunc(value as number), 100));
}

function normalizeDecimalString(value: string | number): string | null {
  const raw = String(value).trim().replace(/[$,_\s]/g, '');
  if (!raw || raw.startsWith('-')) return null;

  const expanded = /e/i.test(raw) ? expandExponentialDecimal(raw) : raw;
  if (!expanded || !/^\d*\.?\d*$/.test(expanded) || !/\d/.test(expanded)) {
    return null;
  }

  const [wholeRaw = '0', fractionRaw = ''] = expanded.split('.');
  const whole = wholeRaw.replace(/^0+(?=\d)/, '') || '0';
  const fraction = fractionRaw.replace(/\D/g, '');

  return fraction ? `${whole}.${fraction}` : whole;
}

function expandExponentialDecimal(value: string): string | null {
  const match = value.match(/^(\d*\.?\d+)[eE]([+-]?\d+)$/);
  if (!match) return null;

  const coefficient = match[1];
  const exponent = Number(match[2]);
  if (!Number.isInteger(exponent)) return null;

  const [whole = '', fraction = ''] = coefficient.split('.');
  const digits = `${whole}${fraction}`.replace(/^0+(?=\d)/, '') || '0';
  const decimalIndex = whole.length + exponent;

  if (decimalIndex <= 0) {
    return `0.${'0'.repeat(Math.abs(decimalIndex))}${digits}`;
  }

  if (decimalIndex >= digits.length) {
    return `${digits}${'0'.repeat(decimalIndex - digits.length)}`;
  }

  return `${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`;
}

/** Parse a base-unit integer string (e.g. the backend's `rawAmount`) into a
 * bigint. Returns null for anything that isn't a plain non-negative integer,
 * so callers can fall back to converting the human balance. */
export function parseRawAmount(value: string | number | undefined | null): bigint | null {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) return null;
  return BigInt(raw);
}

export function decimalAmountToRawUnits(
  amount: string | number,
  decimals: number | bigint | undefined,
): bigint | null {
  const normalized = normalizeDecimalString(amount);
  if (!normalized) return null;

  const safeDecimals = normalizeTokenDecimals(decimals);
  const [whole, fractionRaw = ''] = normalized.split('.');
  const fraction = fractionRaw
    .slice(0, safeDecimals)
    .padEnd(safeDecimals, '0');
  const raw = `${whole}${fraction}`.replace(/^0+(?=\d)/, '') || '0';

  return BigInt(raw);
}

export function formatRawUnitsToDecimal(
  units: bigint,
  decimals: number | bigint | undefined,
  maxFractionDigits?: number,
): string {
  const safeDecimals = normalizeTokenDecimals(decimals);
  const isNegative = units < 0n;
  const absoluteUnits = isNegative ? -units : units;

  if (safeDecimals === 0) {
    return `${isNegative ? '-' : ''}${absoluteUnits.toString()}`;
  }

  const padded = absoluteUnits.toString().padStart(safeDecimals + 1, '0');
  const whole = padded.slice(0, -safeDecimals) || '0';
  const fractionLimit =
    maxFractionDigits === undefined
      ? safeDecimals
      : Math.max(0, Math.min(Math.trunc(maxFractionDigits), safeDecimals));
  const fraction = padded
    .slice(-safeDecimals)
    .slice(0, fractionLimit)
    .replace(/0+$/, '');

  return `${isNegative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

export function formatSwapInputAmount(
  units: bigint,
  decimals: number | bigint | undefined,
  maxDisplayDecimals = DEFAULT_DISPLAY_DECIMALS,
): string {
  const safeDecimals = normalizeTokenDecimals(decimals);
  return formatRawUnitsToDecimal(
    units,
    safeDecimals,
    Math.min(safeDecimals, maxDisplayDecimals),
  );
}

export function getSafeSwapInputAmount({
  balance,
  decimals,
  percent,
  reserveRawUnits = 0n,
  subtractOneRawUnit = false,
  maxDisplayDecimals = DEFAULT_DISPLAY_DECIMALS,
  balanceRawUnits,
}: {
  balance: string | number;
  decimals: number | bigint | undefined;
  percent: number;
  reserveRawUnits?: bigint;
  subtractOneRawUnit?: boolean;
  maxDisplayDecimals?: number;
  /** Exact base-unit balance (e.g. backend `rawAmount`) — when provided it
   * wins over the lossy human `balance`. */
  balanceRawUnits?: bigint | null;
}): string {
  const safeDecimals = normalizeTokenDecimals(decimals);
  const balanceUnits = balanceRawUnits ?? decimalAmountToRawUnits(balance, safeDecimals);
  if (balanceUnits === null || balanceUnits <= 0n) return '0';

  const spendableUnits =
    balanceUnits > reserveRawUnits ? balanceUnits - reserveRawUnits : 0n;
  const pctBps = BigInt(
    Math.max(0, Math.min(10_000, Math.floor(percent * 10_000))),
  );
  let amountUnits = (spendableUnits * pctBps) / PERCENTAGE_SCALE;

  if (subtractOneRawUnit && amountUnits > 0n) {
    amountUnits -= 1n;
  }

  if (amountUnits <= 0n) return '0';
  return formatSwapInputAmount(amountUnits, safeDecimals, maxDisplayDecimals);
}
