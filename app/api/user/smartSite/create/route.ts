import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface SocialTopData {
  name: string;
  value: string;
  iconName: string;
  iconPath: string;
  url: string;
  group: string;
}

interface SocialLargeData {
  name: string;
  value: string;
  iconName: string;
  iconPath: string;
  url: string;
  group: string;
}

interface SocialInfo {
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

interface SocialTopInfo {
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  email: string;
  whatsapp: string;
  facebook?: string;
  tiktok?: string;
}

interface SocialLargeInfo {
  videoCall?: string;
  textMessage?: string;
}

interface InfoBarData {
  buttonName: string;
  title: string;
  link: string;
  description: string;
  iconName: string;
  iconPath: string;
  group: string;
}

const socialMediaBaseUrls: Record<string, string> = {
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

const socialGroup: Record<string, string> = {
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

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();
    console.log('🚀 ~ POST ~ data:', data);
    const smartSiteInfo: SocialInfo = data.social;

    const socialTopInfo: SocialTopInfo = {
      email: smartSiteInfo.email,
      whatsapp: smartSiteInfo.whatsapp,
      facebook: smartSiteInfo.facebook,
      instagram: smartSiteInfo.instagram,
      linkedin: smartSiteInfo.linkedin,
      twitter: smartSiteInfo.twitter,
      tiktok: smartSiteInfo.tiktok,
    };

    const socialLargeInfo: SocialLargeInfo = {
      videoCall: smartSiteInfo.videoCall,
      textMessage: smartSiteInfo.textMessage,
    };

    const infoBarObj = {
      website: smartSiteInfo.website,
      address: smartSiteInfo.officeAddress,
    };

    const infoBar = [];
    for (const key in infoBarObj) {
      if (infoBarObj.hasOwnProperty(key)) {
        const value = infoBarObj[key as keyof typeof infoBarObj];
        if (value) {
          const data: InfoBarData = {
            buttonName: key === 'website' ? 'Website' : 'Location',
            iconName: key === 'website' ? 'Website' : 'Location',
            iconPath: '',
            description:
              key === 'website'
                ? 'This is my personal Website'
                : 'This is my Office Address',
            group: 'custom',
            title: value,
            link: value,
          };
          infoBar.push(data);
        }
      }
    }

    const socialTop = [];
    for (const key in socialTopInfo) {
      if (socialTopInfo.hasOwnProperty(key)) {
        const value = socialTopInfo[key as keyof SocialTopInfo];
        if (value) {
          const data: SocialTopData = {
            name:
              key === 'twitter'
                ? 'X'
                : key.charAt(0).toUpperCase() + key.slice(1), // Capitalize name
            value,
            iconName: key,
            iconPath: '',
            url: socialMediaBaseUrls[key],
            group: socialGroup[key],
          };
          socialTop.push(data);
        }
      }
    }

    const socialLarge = [];
    for (const key in socialLargeInfo) {
      if (socialLargeInfo.hasOwnProperty(key)) {
        const value = socialLargeInfo[key as keyof SocialLargeInfo];
        if (value) {
          const data: SocialLargeData = {
            name: key.charAt(0).toUpperCase() + key.slice(1),
            value,
            iconName: key,
            iconPath: '',
            url: socialMediaBaseUrls[key],
            group: socialGroup[key],
          };
          socialLarge.push(data);
        }
      }
    }

    const contact = {
      name: smartSiteInfo.name,
      email: smartSiteInfo.email,
      mobileNo: smartSiteInfo.phone,
      address: smartSiteInfo.officeAddress || '',
      websiteUrl: smartSiteInfo.website || '',
    };

    // Call your backend API with the sanitized data
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/createSocial`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          micrositeId: data.micrositeId,
          socialTop,
          socialLarge,
          infoBar,
          contact,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Backend API error:', errorData);
      throw new Error(errorData.message || 'Failed to create user');
    }

    const result = await response.json();
    console.log('🚀 ~ POST ~ result:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      {
        error: 'Failed to create user and smartsite',
        details:
          error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
