import { TokenInfo } from '../types';
import { ethers } from 'ethers';
import {
    ChainId,
    Token,
    Fraction,
    CurrencyAmount,
    TradeType,
    Percent
} from '@uniswap/sdk-core';
import {
    Pool,
    Route,
    SwapQuoter,
    SwapRouter,
    Trade,
    computePoolAddress,
    FeeAmount,
} from '@uniswap/v3-sdk';

// Network configurations
export const NETWORKS = {
    MAINNET: {
        name: 'mainnet',
        chainId: 1,
        // Token addresses on Mainnet
        tokens: {
            WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
            UNI: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
        },
        // Uniswap v3 contract addresses on Mainnet
        contracts: {
            SwapRouter: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
            QuoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
            Factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
            WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        },
        blockExplorer: 'https://etherscan.io',
    },
    SEPOLIA: {
        name: 'sepolia',
        chainId: 11155111,
        // Token addresses on Sepolia Testnet
        tokens: {
            WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
            USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
            DAI: '0x68194a729C2450ad26072b3D33ADaCbcef39D574',
            LINK: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
            UNI: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
        },
        // Uniswap v3 contract addresses on Sepolia
        contracts: {
            SwapRouter: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
            QuoterV2: '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3',
            Factory: '0x0227628f3F023bb0B980b67D528571c95c6DaC1c',
            WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
        },
        blockExplorer: 'https://sepolia.etherscan.io',
    }
};

// Default to mainnet but can be changed
export const ACTIVE_NETWORK = NETWORKS.MAINNET;

// For backward compatibility
export const ETH_TOKEN_ADDRESSES = ACTIVE_NETWORK.tokens;
export const UNISWAP_CONTRACTS = ACTIVE_NETWORK.contracts;
export const ETHEREUM_CHAIN_ID = ACTIVE_NETWORK.chainId;

// Price formatting utilities
export const formatUSDEth = (price: string, amount: string): string => {
    const numAmount = parseFloat(amount);
    const priceNum = parseFloat(price);

    return (numAmount * priceNum).toFixed(2);
};

export const formatEtherAmount = (amount: string): string => {
    return parseFloat(amount).toFixed(6);
};

// Get token by symbol from available tokens
export const getEthTokenInfoBySymbol = (
    symbol: string,
    userToken: TokenInfo[],
    tokenMetaData: TokenInfo[]
): TokenInfo => {
    const baseToken =
        tokenMetaData && Array.isArray(tokenMetaData)
            ? tokenMetaData.find((t) => t.symbol === symbol)
            : undefined;

    const userHeldToken =
        userToken && Array.isArray(userToken)
            ? userToken.find((t) => t.symbol === symbol)
            : undefined;

    // Ensure a valid symbol is returned even if tokens aren't found
    const result: TokenInfo = {
        symbol: symbol,
        name: baseToken?.name || symbol,
        decimals: baseToken?.decimals || 18,
        balance: userHeldToken?.balance || '0',
        price: userHeldToken?.price || baseToken?.price || '0',
        usdPrice: userHeldToken?.usdPrice || '0',
        icon: baseToken?.icon || '',
        address: baseToken?.address || getTokenAddressBySymbol(symbol),
        // Add any other required properties from tokenInfo
        marketData: {
            price: userHeldToken?.marketData?.price || userHeldToken?.price || baseToken?.price || '0',
            iconUrl: userHeldToken?.marketData?.iconUrl || baseToken?.icon || '',
        }
    };

    return result;
};

// Get token address from symbol for a specific network
export const getTokenAddressBySymbol = (symbol: string, network = ACTIVE_NETWORK): string => {
    if (symbol === 'ETH') {
        // ETH is the native currency
        return 'ETH';
    }
    return network.tokens[symbol as keyof typeof network.tokens] || '';
};

// Helper to check if address is native ETH
export const isNativeEth = (address: string): boolean => {
    return address === 'ETH';
};

// Map fee tier to FeeAmount from Uniswap SDK
export const mapFeeAmountToSdk = (fee: number): FeeAmount => {
    if (fee === 100) return FeeAmount.LOWEST;
    if (fee === 500) return FeeAmount.LOW;
    if (fee === 3000) return FeeAmount.MEDIUM;
    if (fee === 10000) return FeeAmount.HIGH;
    return FeeAmount.MEDIUM; // Default to medium fee
};

// Convert TokenInfo to Uniswap SDK Token
export const createSdkToken = (tokenInfo: TokenInfo, network = ACTIVE_NETWORK): Token => {
    const address = (tokenInfo.address as string) || '';
    return new Token(
        network.chainId,
        address,
        tokenInfo.decimals || 18,
        tokenInfo.symbol || '',
        tokenInfo.name || ''
    );
};

// Get default token list for a specific network
export const getDefaultTokens = (network = ACTIVE_NETWORK) => {
    return [
        {
            symbol: 'ETH',
            name: 'Ethereum',
            decimals: 18,
            address: 'ETH', // Special case for native ETH
            icon: 'https://ethereum.org/static/6b935ac0e6194247347855dc3d328e83/6ed5f/eth-diamond-black.png',
        },
        {
            symbol: 'WETH',
            name: 'Wrapped Ethereum',
            decimals: 18,
            address: network.tokens.WETH,
            icon: 'https://ethereum.org/static/6b935ac0e6194247347855dc3d328e83/6ed5f/eth-diamond-black.png',
        },
        {
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
            address: network.tokens.USDC,
            icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
        },
        {
            symbol: 'DAI',
            name: 'Dai Stablecoin',
            decimals: 18,
            address: network.tokens.DAI,
            icon: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png',
        },
        {
            symbol: 'LINK',
            name: 'Chainlink',
            decimals: 18,
            address: network.tokens.LINK,
            icon: 'https://cryptologos.cc/logos/chainlink-link-logo.png',
        },
        {
            symbol: 'UNI',
            name: 'Uniswap',
            decimals: 18,
            address: network.tokens.UNI,
            icon: 'https://cryptologos.cc/logos/uniswap-uni-logo.png',
        },
    ];
};

// Default Ethereum token list with basic info for backward compatibility
export const DEFAULT_ETH_TOKENS = getDefaultTokens();

// Interface for Uniswap quote response
export interface EthQuoteResponse {
    inputAmount: string;
    outputAmount: string;
    priceImpact: string;
    route: {
        path: string[];
        fees: number[];
    };
    gasEstimate: string;
    estimatedGasUsedUSD: string;
    estimatedPriceAfterImpact: string;
    slippage: number;
}

// Function to parse a token amount with decimals
export function parseTokenAmount(amount: string, decimals: number): bigint {
    const parsedAmount = ethers.parseUnits(amount, decimals);
    return parsedAmount;
}

// Function to format a token amount with decimals
export function formatTokenAmount(amount: bigint, decimals: number): string {
    return ethers.formatUnits(amount, decimals);
}

// ERC20 Interface ABI for token interactions
export const ERC20_ABI = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function transfer(address to, uint256 amount) returns (bool)',
];

// Simplified Uniswap Router ABI for swaps
export const UNISWAP_ROUTER_ABI = [
    'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256)',
    'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256)',
    'function exactOutputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) external payable returns (uint256)',
];

// Simplified Uniswap Quoter ABI for getting quotes
export const UNISWAP_QUOTER_ABI = [
    'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
    'function quoteExactOutputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountOut, uint160 sqrtPriceLimitX96) external returns (uint256 amountIn, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
];

// Common pool fees on Uniswap v3
export const UNISWAP_FEES = {
    LOWEST: 100, // 0.01%
    LOW: 500,    // 0.05%
    MEDIUM: 3000, // 0.3%
    HIGH: 10000,  // 1%
};

// Map to SDK FeeAmount values
export const FEE_AMOUNT_MAPPING = {
    100: FeeAmount.LOWEST,
    500: FeeAmount.LOW,
    3000: FeeAmount.MEDIUM,
    10000: FeeAmount.HIGH,
};

// Constants for ethers
export const MAX_UINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"); 