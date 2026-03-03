export const RouterABI = [
  {
    "inputs": [{ "internalType": "address", "name": "_usdc", "type": "address" }],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "marketId", "type": "bytes32" },
      { "internalType": "uint256", "name": "usdcIn", "type": "uint256" },
      { "internalType": "uint256", "name": "minOut", "type": "uint256" }
    ],
    "name": "buyYes",
    "outputs": [{ "internalType": "uint256", "name": "tokensOut", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "marketId", "type": "bytes32" },
      { "internalType": "uint256", "name": "usdcIn", "type": "uint256" },
      { "internalType": "uint256", "name": "minOut", "type": "uint256" }
    ],
    "name": "buyNo",
    "outputs": [{ "internalType": "uint256", "name": "tokensOut", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "marketId", "type": "bytes32" },
      { "internalType": "uint256", "name": "tokensIn", "type": "uint256" },
      { "internalType": "uint256", "name": "minOut", "type": "uint256" }
    ],
    "name": "sellYes",
    "outputs": [{ "internalType": "uint256", "name": "usdcOut", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "marketId", "type": "bytes32" },
      { "internalType": "uint256", "name": "tokensIn", "type": "uint256" },
      { "internalType": "uint256", "name": "minOut", "type": "uint256" }
    ],
    "name": "sellNo",
    "outputs": [{ "internalType": "uint256", "name": "usdcOut", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "marketId", "type": "bytes32" },
      { "internalType": "bool", "name": "isYes", "type": "bool" },
      { "internalType": "uint256", "name": "usdcIn", "type": "uint256" }
    ],
    "name": "getAmountOut",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "marketId", "type": "bytes32" }],
    "name": "getYesPrice",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "marketId", "type": "bytes32" }],
    "name": "pools",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "marketId", "type": "bytes32" },
      { "internalType": "address", "name": "pool", "type": "address" }
    ],
    "name": "registerPool",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "marketId", "type": "bytes32" },
      { "indexed": true, "internalType": "address", "name": "trader", "type": "address" },
      { "indexed": false, "internalType": "bool", "name": "isYes", "type": "bool" },
      { "indexed": false, "internalType": "bool", "name": "isBuy", "type": "bool" },
      { "indexed": false, "internalType": "uint256", "name": "amountIn", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "amountOut", "type": "uint256" }
    ],
    "name": "Trade",
    "type": "event"
  }
] as const;
