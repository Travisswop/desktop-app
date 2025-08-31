export type BotType = 'crypto' | 'ai' | 'trading' | 'defi' | 'nft' | 'custom';

export type BotCapability = 
  | 'price_check' 
  | 'swap_tokens' 
  | 'send_crypto'
  | 'check_balance' 
  | 'transaction_history' 
  | 'portfolio_analysis'
  | 'defi_yields' 
  | 'nft_floor_prices' 
  | 'market_analysis'
  | 'trading_signals' 
  | 'gas_tracker' 
  | 'bridge_tokens';

export type TransactionType = 'send' | 'swap' | 'bridge' | 'stake' | 'unstake';
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface BotMetadata {
  version?: string;
  provider?: string;
  apiEndpoint?: string;
  supportedNetworks?: string[];
  maxTransactionAmount?: number;
  permissions?: string[];
}

export interface BotCommand {
  command: string;
  description: string;
  parameters?: Record<string, {
    type: string;
    required: boolean;
    description: string;
    example?: string;
  }>;
  requiredCapabilities: BotCapability[];
  examples?: string[];
}

export interface BotResponse {
  success: boolean;
  data?: any;
  error?: string;
  actionRequired?: boolean;
  transactionHash?: string;
  networkFee?: string;
  quickReplies?: Array<{
    text: string;
    action: string;
    data?: any;
  }>;
}

export interface CryptoBotCommands {
  '/price': BotCommand;
  '/balance': BotCommand;
  '/send': BotCommand;
  '/swap': BotCommand;
  '/history': BotCommand;
  '/gas': BotCommand;
  '/portfolio': BotCommand;
  '/yields': BotCommand;
  '/bridge': BotCommand;
  '/help': BotCommand;
}

export interface TransactionData {
  type: TransactionType;
  fromToken?: string;
  toToken?: string;
  amount?: string;
  network?: string;
  gasPrice?: string;
  status?: TransactionStatus;
  hash?: string;
  blockNumber?: number;
  toAddress?: string;
  fromAddress?: string;
  fee?: string;
  timestamp?: number;
}

export interface BotUser {
  id: string;
  name: string;
  displayName: string;
  botType: BotType;
  capabilities: BotCapability[];
  metadata: BotMetadata;
  isActive: boolean;
  avatar?: string;
  description?: string;
  commands: Record<string, BotCommand>;
}

// Utility functions for bot interactions
export const CRYPTO_BOT_COMMANDS: CryptoBotCommands = {
  '/price': {
    command: '/price',
    description: 'Get current price of a cryptocurrency',
    parameters: {
      token: {
        type: 'string',
        required: true,
        description: 'Token symbol or contract address',
        example: 'ETH, BTC, SOL'
      }
    },
    requiredCapabilities: ['price_check'],
    examples: ['/price ETH', '/price BTC', '/price SOL']
  },
  '/balance': {
    command: '/balance',
    description: 'Check wallet balance',
    parameters: {
      address: {
        type: 'string',
        required: false,
        description: 'Wallet address (defaults to connected wallet)',
      },
      network: {
        type: 'string',
        required: false,
        description: 'Network to check (ETH, SOL, MATIC)',
        example: 'ETH'
      }
    },
    requiredCapabilities: ['check_balance'],
    examples: ['/balance', '/balance ETH', '/balance 0x123...abc']
  },
  '/send': {
    command: '/send',
    description: 'Send cryptocurrency to another address',
    parameters: {
      amount: {
        type: 'number',
        required: true,
        description: 'Amount to send',
        example: '0.1'
      },
      token: {
        type: 'string',
        required: true,
        description: 'Token to send',
        example: 'ETH'
      },
      to: {
        type: 'string',
        required: true,
        description: 'Recipient address',
        example: '0x123...abc'
      }
    },
    requiredCapabilities: ['send_crypto'],
    examples: ['/send 0.1 ETH 0x123...abc']
  },
  '/swap': {
    command: '/swap',
    description: 'Swap one token for another',
    parameters: {
      amount: {
        type: 'number',
        required: true,
        description: 'Amount to swap',
        example: '100'
      },
      from: {
        type: 'string',
        required: true,
        description: 'Token to swap from',
        example: 'USDC'
      },
      to: {
        type: 'string',
        required: true,
        description: 'Token to swap to',
        example: 'ETH'
      }
    },
    requiredCapabilities: ['swap_tokens'],
    examples: ['/swap 100 USDC ETH', '/swap 1 ETH USDT']
  },
  '/history': {
    command: '/history',
    description: 'View transaction history',
    parameters: {
      limit: {
        type: 'number',
        required: false,
        description: 'Number of transactions to show',
        example: '10'
      },
      network: {
        type: 'string',
        required: false,
        description: 'Network to check',
        example: 'ETH'
      }
    },
    requiredCapabilities: ['transaction_history'],
    examples: ['/history', '/history 10', '/history 5 ETH']
  },
  '/gas': {
    command: '/gas',
    description: 'Check current gas prices',
    parameters: {
      network: {
        type: 'string',
        required: false,
        description: 'Network to check gas for',
        example: 'ETH'
      }
    },
    requiredCapabilities: ['gas_tracker'],
    examples: ['/gas', '/gas ETH', '/gas MATIC']
  },
  '/portfolio': {
    command: '/portfolio',
    description: 'View portfolio analysis',
    parameters: {
      address: {
        type: 'string',
        required: false,
        description: 'Wallet address (defaults to connected wallet)',
      }
    },
    requiredCapabilities: ['portfolio_analysis'],
    examples: ['/portfolio', '/portfolio 0x123...abc']
  },
  '/yields': {
    command: '/yields',
    description: 'Check DeFi yield opportunities',
    parameters: {
      token: {
        type: 'string',
        required: false,
        description: 'Token to find yields for',
        example: 'USDC'
      },
      protocol: {
        type: 'string',
        required: false,
        description: 'Specific protocol to check',
        example: 'Compound'
      }
    },
    requiredCapabilities: ['defi_yields'],
    examples: ['/yields', '/yields USDC', '/yields ETH Compound']
  },
  '/bridge': {
    command: '/bridge',
    description: 'Bridge tokens between networks',
    parameters: {
      amount: {
        type: 'number',
        required: true,
        description: 'Amount to bridge',
        example: '100'
      },
      token: {
        type: 'string',
        required: true,
        description: 'Token to bridge',
        example: 'USDC'
      },
      from: {
        type: 'string',
        required: true,
        description: 'Source network',
        example: 'ETH'
      },
      to: {
        type: 'string',
        required: true,
        description: 'Destination network',
        example: 'MATIC'
      }
    },
    requiredCapabilities: ['bridge_tokens'],
    examples: ['/bridge 100 USDC ETH MATIC']
  },
  '/help': {
    command: '/help',
    description: 'Show available commands',
    requiredCapabilities: [],
    examples: ['/help']
  }
};

export const getBotCommandHelp = (command: string): string => {
  const cmd = CRYPTO_BOT_COMMANDS[command as keyof CryptoBotCommands];
  if (!cmd) return 'Command not found. Type /help to see available commands.';
  
  let help = `**${cmd.command}** - ${cmd.description}\n`;
  
  if (cmd.parameters) {
    help += '\nParameters:\n';
    Object.entries(cmd.parameters).forEach(([key, param]) => {
      help += `• ${key}${param.required ? ' (required)' : ' (optional)'}: ${param.description}`;
      if (param.example) help += ` (e.g., ${param.example})`;
      help += '\n';
    });
  }
  
  if (cmd.examples) {
    help += '\nExamples:\n';
    cmd.examples.forEach(example => {
      help += `• ${example}\n`;
    });
  }
  
  return help;
};

export const getAllBotCommands = (): string => {
  let help = '**Available Bot Commands:**\n\n';
  
  Object.values(CRYPTO_BOT_COMMANDS).forEach(cmd => {
    help += `**${cmd.command}** - ${cmd.description}\n`;
  });
  
  help += '\nType any command followed by parameters, or use `/help [command]` for detailed help.';
  return help;
};

export const parseBotCommand = (message: string): { command: string; parameters: Record<string, string> } | null => {
  if (!message.startsWith('/')) return null;
  
  const parts = message.trim().split(/\s+/);
  const command = parts[0];
  const parameters: Record<string, string> = {};
  
  // Simple parameter parsing - can be enhanced for more complex commands
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part.includes('=')) {
      const [key, value] = part.split('=');
      parameters[key] = value;
    } else {
      // Positional parameters based on command
      if (command === '/price' && i === 1) parameters.token = part;
      if (command === '/send') {
        if (i === 1) parameters.amount = part;
        if (i === 2) parameters.token = part;
        if (i === 3) parameters.to = part;
      }
      if (command === '/swap') {
        if (i === 1) parameters.amount = part;
        if (i === 2) parameters.from = part;
        if (i === 3) parameters.to = part;
      }
      // Add more command-specific parsing as needed
    }
  }
  
  return { command, parameters };
};