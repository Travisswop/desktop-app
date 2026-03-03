export { RouterABI } from './RouterABI';
export { AMMPoolABI } from './AMMPoolABI';
export { ResolutionABI } from './ResolutionABI';

// AMM contract addresses — fill in after deployment
export const AMM_ROUTER_ADDRESS = (process.env.NEXT_PUBLIC_AMM_ROUTER_ADDRESS || '') as `0x${string}`;
export const AMM_RESOLUTION_ADDRESS = (process.env.NEXT_PUBLIC_AMM_RESOLUTION_ADDRESS || '') as `0x${string}`;
