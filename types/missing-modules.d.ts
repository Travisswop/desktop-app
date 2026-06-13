declare module 'ai' {
  export interface Message {
    id: string;
    role: 'system' | 'user' | 'assistant' | 'data' | string;
    content: string;
    [key: string]: unknown;
  }
}

declare module 'ai/react' {
  import type { Message } from 'ai';

  export function useChat(options?: {
    api?: string;
    onResponse?: (response: Response) => void | Promise<void>;
    onError?: (error: Error) => void;
    streamProtocol?: string;
    [key: string]: unknown;
  }): {
    messages: Message[];
    input: string;
    setInput: (value: string) => void;
    handleInputChange: (
      event:
        | import('react').ChangeEvent<HTMLInputElement>
        | import('react').ChangeEvent<HTMLTextAreaElement>
    ) => void;
    handleSubmit: (
      event?: import('react').FormEvent<HTMLFormElement>
    ) => void;
    isLoading: boolean;
    setMessages: (
      messages: Message[] | ((messages: Message[]) => Message[])
    ) => void;
    [key: string]: unknown;
  };
}

declare module '@uniswap/sdk-core' {
  export enum ChainId {
    MAINNET = 1,
    SEPOLIA = 11155111,
  }

  export class Token {
    constructor(
      chainId: number,
      address: string,
      decimals: number,
      symbol?: string,
      name?: string
    );
  }

  export class Fraction {
    constructor(
      numerator: string | number | bigint,
      denominator?: string | number | bigint
    );
    toFixed(decimalPlaces?: number): string;
    toSignificant(significantDigits?: number): string;
  }

  export class CurrencyAmount<T = Token> {
    static fromRawAmount<TCurrency = Token>(
      currency: TCurrency,
      rawAmount: string | number | bigint
    ): CurrencyAmount<TCurrency>;
    quotient: bigint;
    toFixed(decimalPlaces?: number): string;
    toSignificant(significantDigits?: number): string;
  }

  export enum TradeType {
    EXACT_INPUT = 'EXACT_INPUT',
    EXACT_OUTPUT = 'EXACT_OUTPUT',
  }

  export class Percent {
    constructor(
      numerator: string | number | bigint,
      denominator?: string | number | bigint
    );
  }
}

declare module '@uniswap/v3-sdk' {
  export enum FeeAmount {
    LOWEST = 100,
    LOW = 500,
    MEDIUM = 3000,
    HIGH = 10000,
  }

  export class Pool {
    constructor(...args: any[]);
  }

  export class Route<TInput = any, TOutput = any> {
    constructor(...args: any[]);
  }

  export class Trade<TInput = any, TOutput = any, TTradeType = any> {
    constructor(...args: any[]);
    static createUncheckedTrade(...args: any[]): any;
    static exactIn(...args: any[]): Promise<any>;
    static exactOut(...args: any[]): Promise<any>;
  }

  export const SwapQuoter: any;
  export const SwapRouter: any;

  export function computePoolAddress(...args: any[]): string;
}
