'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Mail,
  Phone,
  MessageSquare,
  Video,
  MapPin,
  Globe,
} from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { OnboardingData } from '@/lib/types';
import { usePrivy } from '@privy-io/react-auth';
import { useToast } from '@/hooks/use-toast';
import astronot from '@/public/onboard/astronot.svg';
import bluePlanet from '@/public/onboard/blue-planet.svg';
import yellowPlanet from '@/public/onboard/yellow-planet.svg';
import whatsapp from '@/public/onboard/whatsapp.png';
import gmail from '@/public/onboard/gmail.png';
import facebook from '@/public/onboard/facebook.png';
import instagram from '@/public/onboard/instagram.png';
import linkedin from '@/public/onboard/linkedin.png';
import location from '@/public/onboard/location.png';
import message from '@/public/onboard/message.png';
import phone from '@/public/onboard/phone.png';
import tiktok from '@/public/onboard/tiktok.png';
import twitter from '@/public/onboard/twitter.png';
import video from '@/public/onboard/video.png';
import website from '@/public/onboard/website.png';
import {
  InfoBarData,
  socialGroup,
  SocialLargeData,
  SocialLargeInfo,
  socialMediaBaseUrls,
  SocialTopData,
  SocialTopInfo,
} from '@/types/smartsite';

interface SmartSiteInformationProps {
  userData: OnboardingData;
  onComplete: (data: Partial<OnboardingData>) => void;
}

export default function SmartSiteInformation({
  userData,
  onComplete,
}: SmartSiteInformationProps) {
  const { getAccessToken } = usePrivy();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [data, setData] = useState({
    name: userData.userInfo?.name || '',
    email: userData?.userInfo?.email || '',
    phone: userData?.userInfo?.mobileNo || '',
    whatsapp: '',
    textMessage: '',
    videoCall: '',
    officeAddress: '',
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    tiktok: '',
    website: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const socialTopInfo: SocialTopInfo = {
        email: data.email,
        whatsapp: data.whatsapp,
        facebook: data.facebook,
        instagram: data.instagram,
        linkedin: data.linkedin,
        twitter: data.twitter,
        tiktok: data.tiktok,
      };

      const socialLargeInfo: SocialLargeInfo = {
        videoCall: data.videoCall,
        textMessage: data.textMessage,
      };

      const infoBarObj = {
        website: data.website,
        address: data.officeAddress,
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
        name: data.name,
        email: data.email,
        mobileNo: data.phone,
        address: data.officeAddress || '',
        websiteUrl: data.website || '',
      };

      // Create user and smartsite
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/createSocial`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            micrositeId: userData?.userInfo?.primaryMicrosite,
            socialTop,
            socialLarge,
            infoBar,
            contact,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create user and smartsite');
      }

      const result = await response.json();

      toast({
        title: 'Success',
        description: 'Your SmartSite has been created successfully!',
      });

      // Pass the data to parent component
      onComplete({
        userInfo: result.data,
        smartSiteInfo: data,
      });
    } catch (error) {
      console.error('Error creating user and smartsite:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create SmartSite. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto border-0 my-20">
      {/* <div className="bg-gradient-to-br from-purple-200 to-blue-300 w-52 h-52 rounded-full absolute -bottom-32 -left-16 -z-10 opacity-80"></div> */}
      <div className="absolute -top-28 left-0">
        <Image
          src={astronot}
          alt="astronot image"
          className="w-40 h-auto"
        />
      </div>
      <div className="absolute -bottom-28 -left-10">
        <Image
          src={yellowPlanet}
          alt="astronot image"
          className="w-48 h-auto"
        />
      </div>
      <div className="absolute -top-14 -right-24">
        <Image
          src={bluePlanet}
          alt="astronot image"
          className="w-56 h-auto"
        />
      </div>
      <div className="backdrop-blur-[50px] bg-white bg-opacity-25 shadow-uniform rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Smartsite Information
          </CardTitle>
          <p className="text-xs">
            Input Below For AI SmartSite Build.
            <br />
            You Can Edit After Site Is Generated.
          </p>
        </CardHeader>
        <CardContent className="px-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Contact Details
          </h2>
          <form
            className="grid grid-cols-2 gap-6"
            onSubmit={handleSubmit}
          >
            <div className="space-y-4">
              <ContactField
                icon={
                  <Image
                    src={gmail}
                    alt="gmail"
                    className="w-7 h-auto"
                  />
                }
                placeholder="Email"
                defaultValue={data.email}
                onChange={(value: string) =>
                  handleInputChange('email', value)
                }
              />
              <ContactField
                icon={
                  <Image
                    src={phone}
                    alt="gmail"
                    className="w-7 h-auto"
                  />
                }
                placeholder="Phone"
                defaultValue={data.phone}
                onChange={(value: string) =>
                  handleInputChange('phone', value)
                }
              />
              <ContactField
                icon={
                  <Image
                    src={whatsapp}
                    alt="gmail"
                    className="w-7 h-auto"
                  />
                }
                placeholder="WhatsApp"
                defaultValue={data.whatsapp}
                onChange={(value: string) =>
                  handleInputChange('whatsapp', value)
                }
              />
              <ContactField
                icon={
                  <Image
                    src={message}
                    alt="gmail"
                    className="w-7 h-auto"
                  />
                }
                placeholder="Text Message"
                defaultValue={data.textMessage}
                onChange={(value: string) =>
                  handleInputChange('textMessage', value)
                }
              />
              <ContactField
                icon={
                  <Image
                    src={video}
                    alt="gmail"
                    className="w-7 h-auto"
                  />
                }
                placeholder="Video Call"
                defaultValue={data.videoCall}
                onChange={(value: string) =>
                  handleInputChange('videoCall', value)
                }
              />
              <ContactField
                icon={
                  <Image
                    src={location}
                    alt="gmail"
                    className="w-7 h-auto"
                  />
                }
                placeholder="Office Address"
                defaultValue={data.officeAddress}
                onChange={(value: string) =>
                  handleInputChange('officeAddress', value)
                }
              />
            </div>
            <div className="space-y-4">
              <ContactField
                icon={
                  <Image
                    src={facebook}
                    alt="gmail"
                    className="w-7 h-auto"
                  />
                }
                placeholder="Facebook"
                onChange={(value: string) =>
                  handleInputChange('facebook', value)
                }
              />
              <ContactField
                icon={
                  <Image
                    src={instagram}
                    alt="gmail"
                    className="w-7 h-auto"
                  />
                }
                placeholder="Instagram"
                onChange={(value: string) =>
                  handleInputChange('instagram', value)
                }
              />
              <ContactField
                icon={
                  <Image
                    src={twitter}
                    alt="gmail"
                    className="w-7 h-auto"
                  />
                }
                placeholder="Twitter"
                onChange={(value: string) =>
                  handleInputChange('twitter', value)
                }
              />
              <ContactField
                icon={
                  <Image
                    src={linkedin}
                    alt="gmail"
                    className="w-7 h-auto"
                  />
                }
                placeholder="LinkedIn"
                onChange={(value: string) =>
                  handleInputChange('linkedin', value)
                }
              />
              <ContactField
                icon={
                  <Image
                    src={tiktok}
                    alt="gmail"
                    className="w-7 h-auto"
                  />
                }
                placeholder="TikTok"
                onChange={(value: string) =>
                  handleInputChange('tiktok', value)
                }
              />
              <ContactField
                icon={
                  <Image
                    src={website}
                    alt="gmail"
                    className="w-7 h-auto"
                  />
                }
                placeholder="Website"
                onChange={(value: string) =>
                  handleInputChange('website', value)
                }
              />
            </div>
            <div className="flex justify-center col-span-2">
              <Button
                className="bg-black text-white w-1/4 hover:bg-gray-800"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Next'}
              </Button>
            </div>
          </form>
        </CardContent>
      </div>
    </div>
  );
}

interface ContactFieldProps {
  icon: React.ReactNode;
  placeholder: string;
  defaultValue?: string;
  onChange: (value: string) => void;
}

function ContactField({
  icon,
  placeholder,
  defaultValue = '',
  onChange,
}: ContactFieldProps) {
  const [value, setValue] = useState(defaultValue);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    onChange(e.target.value);
  };

  return (
    <div className="flex items-center space-x-2 bg-white rounded-md shadow-sm overflow-hidden">
      <div className="p-2 border-r border-gray-300 h-full">
        {icon}
      </div>
      <Input
        className="flex-grow border-0 focus-visible:!ring-0 rounded-none px-1"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
      />
    </div>
  );
}
