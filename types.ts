export interface UserData {
  _id?: string;
  address: string;
  apt: string;
  bio: string;
  connections: {
    followers: string[];
    following: string[];
    parentConnection: string[];
    childConnection: string[];
  };
  correlationId: string;
  countryCode: string;
  countryFlag: string;
  createdAt: string;
  deleted: boolean;
  dob: number; // Unix timestamp (milliseconds)
  email: string;
  isPremiumUser: boolean;
  microsites: string[];
  mobileNo: string;
  name: string;
  notificationToken: string;
  password: string;
  paymentInfo: {
    subscribe: {
      [key: string]: any;
    };
    referral: any[];
  };
  primaryMicrosite?: string;
  profilePic: string;
  referralCode: string;
  referralLink: string;
  rewardAmount: number;
  socialSignup: boolean;
  subscriber: string[];
  tap: Record<string, any>[];
  totalConnection: number;
  updatedAt?: string;
  __v?: number;
  swopensId?: string;
  solanaAddress?: string;
  user_id?: string;
  privyId?: string;
  ethAddress?: string;
  ensName?: string;
  displayName?: string;
  
  // Bot-related fields
  isBot?: boolean;
  botType?: 'crypto' | 'ai' | 'trading' | 'defi' | 'nft' | 'custom';
  botCapabilities?: Array<
    'price_check' | 'swap_tokens' | 'send_crypto' | 
    'check_balance' | 'transaction_history' | 'portfolio_analysis' |
    'defi_yields' | 'nft_floor_prices' | 'market_analysis' |
    'trading_signals' | 'gas_tracker' | 'bridge_tokens'
  >;
  botMetadata?: {
    version?: string;
    provider?: string;
    apiEndpoint?: string;
    supportedNetworks?: string[];
    maxTransactionAmount?: number;
    permissions?: string[];
  };
  
  // User preferences
  preferences?: {
    language?: string;
    currency?: string;
    notifications?: boolean;
    privacy?: {
      showOnlineStatus?: boolean;
      allowBotInteractions?: boolean;
    };
  };
  
  // Crypto-related fields
  walletConnections?: Array<{
    network: string;
    address: string;
    isActive: boolean;
    lastUsed: Date;
  }>;
  
  // Social features
  reputation?: number;
  verificationStatus?: 'unverified' | 'email_verified' | 'wallet_verified' | 'kyc_verified';
  isActive?: boolean;
}
