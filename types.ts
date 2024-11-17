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
  primaryMicrosite: string;
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
}
