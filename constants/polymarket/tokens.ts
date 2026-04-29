// pUSD (Polymarket USD) — collateral token for V2, backed by USDC on Polygon
// Replaced USDC.e (0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174) as of CLOB V2
export const USDC_E_CONTRACT_ADDRESS =
  "0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB" as const;

export const USDC_E_DECIMALS = 6; // pUSD also has 6 decimals

// Legacy USDC.e — Polymarket V1 collateral (pre-CLOB V2). Still held in
// some Safe wallets and must remain withdrawable by users.
export const LEGACY_USDC_E_ADDRESS =
  "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as const;

// Conditional Token Framework (CTF) contract
export const CTF_CONTRACT_ADDRESS =
  "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045" as const;

// CTF Exchange V2 contract for trading
export const CTF_EXCHANGE_ADDRESS =
  "0xE111180000d2663C0091e4f400237545B87B996B" as const;

// Negative Risk CTF Exchange V2
export const NEG_RISK_CTF_EXCHANGE_ADDRESS =
  "0xe2222d279d744050d28e00520010520000310F59" as const;

// Negative Risk Adapter
export const NEG_RISK_ADAPTER_ADDRESS =
  "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296" as const;
