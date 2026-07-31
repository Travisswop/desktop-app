// Swop's registered Li.Fi integrator identity.
//
// Li.Fi accrues the integrator fee against whatever identity a quote is
// requested under, so this string is what makes a swap billable to Swop.
// `SWOP` is the identity that actually collects (fee wallet
// 0x74fF564b68c1416227a108604bA65f747bDBbEaf) and is what the backend
// (`checkoutIntentController`, `goldmanLifiExecutor`) and the mobile app
// already use — desktop was the only surface still defaulting to the
// separate `Swop-Desktop` identity.
export const LIFI_INTEGRATOR_NAME = 'SWOP';

// Swop's platform fee on Li.Fi routes, as the fractional rate Li.Fi's
// `fee` query param expects (50 bps).
export const LIFI_PLATFORM_FEE_RATE = 0.005;
