// ─── DeFi (Aave) Components ──────────────────────────────────────────────────
export { DefiSection } from './DefiSection';
export { AaveActionModal } from './AaveActionModal';
export { AaveTokenIcon } from './AaveTokenIcon';

// ─── Hooks ───────────────────────────────────────────────────────────────────
export { useAaveMarkets, useAavePositions } from './hooks/useAaveData';
export { useAaveActions, getAaveReadProvider } from './hooks/useAaveActions';
