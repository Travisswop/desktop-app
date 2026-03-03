export const AMMPoolABI = [
  {
    "inputs": [
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
      { "internalType": "bool", "name": "isYes", "type": "bool" },
      { "internalType": "uint256", "name": "usdcIn", "type": "uint256" }
    ],
    "name": "getAmountOut",
    "outputs": [{ "internalType": "uint256", "name": "tokensOut", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "yesPrice",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "reserveYes",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "reserveNo",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "resolved",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "yesWon",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "yesToken",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "noToken",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bool", "name": "_yesWon", "type": "bool" }],
    "name": "resolve",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "trader", "type": "address" },
      { "indexed": false, "internalType": "bool", "name": "isYes", "type": "bool" },
      { "indexed": false, "internalType": "uint256", "name": "usdcIn", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "tokensOut", "type": "uint256" }
    ],
    "name": "Buy",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "trader", "type": "address" },
      { "indexed": false, "internalType": "bool", "name": "isYes", "type": "bool" },
      { "indexed": false, "internalType": "uint256", "name": "tokensIn", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "usdcOut", "type": "uint256" }
    ],
    "name": "Sell",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "bool", "name": "yesWon", "type": "bool" }
    ],
    "name": "Resolved",
    "type": "event"
  }
] as const;
