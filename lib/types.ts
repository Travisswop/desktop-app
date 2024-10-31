export interface UserInfo {
  name: string;
  bio: string;
  phone: string;
  email: string;
  birthdate: string;
  apartment: string;
  address: string;
  avatar: string;
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

export interface walletInfo {
  address?: string;
  chainId?: string;
  chainType?: string;
}

export interface OnboardingData {
  userInfo?: UserInfo;
  smartSiteInfo?: SmartSiteInfo;
  walletInfo?: walletInfo;
}

export interface PrivyUser {
  id: string;
  email: string;
  name?: string;
  wallet?: walletInfo;
}
