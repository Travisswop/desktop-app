export interface SocialTopData {
  name: string;
  value: string;
  iconName: string;
  iconPath: string;
  url: string;
  group: string;
}

export interface SocialLargeData {
  name: string;
  value: string;
  iconName: string;
  iconPath: string;
  url: string;
  group: string;
}

export interface SocialInfo {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  textMessage: string;
  videoCall: string;
  officeAddress: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  tiktok?: string;
  website?: string;
}

export interface SocialTopInfo {
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  email: string;
  whatsapp: string;
  facebook?: string;
  tiktok?: string;
}

export interface SocialLargeInfo {
  videoCall?: string;
  textMessage?: string;
}

export interface InfoBarData {
  buttonName: string;
  title: string;
  link: string;
  description: string;
  iconName: string;
  iconPath: string;
  group: string;
}

export const socialMediaBaseUrls: Record<string, string> = {
  email: 'www.email.com',
  phone: 'www.call.com',
  whatsapp: 'www.whatsapp.com',
  textMessage: 'www.text.com',
  videoCall: 'www.facetime.com',
  officeAddress: 'www.map.com',
  facebook: 'www.facebook.com',
  instagram: 'www.instagram.com',
  twitter: 'www.x.com',
  linkedin: 'www.linkedin.com',
  tiktok: 'www.tiktok.com',
  website: 'www.link.com',
};

export const socialGroup: Record<string, string> = {
  twitter: 'Social Media',
  facebook: 'Social Media',
  instagram: 'Social Media',
  linkedin: 'Social Media',
  tiktok: 'Social Media',
  whatsapp: 'Chat Links',
  email: 'Commands',
  textMessage: 'Call To Action',
  videoCall: 'Call To Action',
};
