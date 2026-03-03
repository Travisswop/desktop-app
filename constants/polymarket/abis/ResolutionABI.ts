export const ResolutionABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "pool", "type": "address" },
      { "internalType": "uint256", "name": "tokensIn", "type": "uint256" }
    ],
    "name": "redeem",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "pool", "type": "address" },
      { "internalType": "address", "name": "trader", "type": "address" }
    ],
    "name": "getRedeemableAmount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "pool", "type": "address" }],
    "name": "registeredPools",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "pool", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "trader", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "tokensIn", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "usdcOut", "type": "uint256" }
    ],
    "name": "Redeemed",
    "type": "event"
  }
] as const;
