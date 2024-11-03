export interface UserInfo {
  email: string;
  mobileNo: string;
  apartment?: string;
  address?: string;
  bio?: string;
  birthdate?: number;
  avatar?: string;
  name: string;
  primaryMicrosite: string;
}

export interface SmartSiteInfo {
  email: string;
  phone: string;
  whatsapp: string;
  textMessage: string;
  videoCall: string;
  officeAddress: string;
  facebook: string;
  instagram: string;
  twitter: string;
  linkedin: string;
  tiktok: string;
  website: string;
}

export interface WalletInfo {
  address?: string;
  chainId?: string;
  chainType?: string;
}

export interface OnboardingData {
  userInfo?: UserInfo;
  smartSiteInfo?: SmartSiteInfo;
  walletInfo?: WalletInfo;
}

export interface PrivyUser {
  id: string;
  email: string;
  name?: string;

  wallet?: WalletInfo;
}
