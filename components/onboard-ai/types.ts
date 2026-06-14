import type { PrivyUser } from "@/lib/types";

export type OnboardingChatSender = "assistant" | "user";

export interface OnboardingChatMessage {
  id: string;
  sender: OnboardingChatSender;
  text: string;
}

export interface SelectedSwopId {
  handle: string;
  ens: string;
  claimed?: boolean;
  ownerAddress?: string;
}

export interface AiOnboardingProfile {
  name: string;
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
  bio: string;
}

export type DiscoverableSocialPlatform =
  | "website"
  | "twitter"
  | "linkedin"
  | "facebook"
  | "instagram"
  | "tiktok";

export interface DiscoveredSocialCandidate {
  platform: DiscoverableSocialPlatform;
  label: string;
  value: string;
  url: string;
  sourceTitle: string;
  sourceUrl: string;
  snippet: string;
  confidence: number;
}

export interface OnboardAiUser extends PrivyUser {
  linkedAccounts?: any[];
}
