'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
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

interface SmartSiteInformationProps {
  userData: OnboardingData;
  onComplete: (data: Partial<OnboardingData>) => void;
}

export default function SmartSiteInformation({
  userData,
  onComplete,
}: SmartSiteInformationProps) {
  console.log(userData);
  const [data, setData] = useState({
    email: userData?.userInfo?.email || '',
    phone: userData?.userInfo?.phone || '',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      smartSiteInfo: data,
    });
  };

  return (
    <Card className="w-full max-w-3xl mx-auto bg-gradient-to-br from-blue-50 to-white">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-navy-blue">
          SmartSite Information
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Input Below For AI SmartSite Build.
          <br />
          You Can Edit After Site Is Generated.
        </p>
      </CardHeader>
      <CardContent>
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          Contact Details
        </h2>
        <form
          className="grid grid-cols-2 gap-4"
          onSubmit={handleSubmit}
        >
          <div className="space-y-4">
            <ContactField
              icon={<Mail className="text-blue-500" />}
              placeholder="Email"
              defaultValue={data.email}
              onChange={(value: string) =>
                handleInputChange('email', value)
              }
            />
            <ContactField
              icon={<Phone className="text-green-500" />}
              placeholder="Phone"
              defaultValue={data.phone}
              onChange={(value: string) =>
                handleInputChange('phone', value)
              }
            />
            <ContactField
              icon={
                <Image
                  src="/whatsapp-icon.png"
                  width={24}
                  height={24}
                  alt="WhatsApp"
                />
              }
              placeholder="WhatsApp"
              defaultValue={data.whatsapp}
              onChange={(value: string) =>
                handleInputChange('whatsapp', value)
              }
            />
            <ContactField
              icon={<MessageSquare className="text-blue-600" />}
              placeholder="Text Message"
              defaultValue={data.textMessage}
              onChange={(value: string) =>
                handleInputChange('textMessage', value)
              }
            />
            <ContactField
              icon={<Video className="text-green-400" />}
              placeholder="Video Call"
              defaultValue={data.videoCall}
              onChange={(value: string) =>
                handleInputChange('videoCall', value)
              }
            />
            <ContactField
              icon={<MapPin className="text-red-400" />}
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
                  src="/facebook-icon.png"
                  width={24}
                  height={24}
                  alt="Facebook"
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
                  src="/instagram-icon.png"
                  width={24}
                  height={24}
                  alt="Instagram"
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
                  src="/twitter-icon.png"
                  width={24}
                  height={24}
                  alt="Twitter"
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
                  src="/linkedin-icon.png"
                  width={24}
                  height={24}
                  alt="LinkedIn"
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
                  src="/tiktok-icon.png"
                  width={24}
                  height={24}
                  alt="TikTok"
                />
              }
              placeholder="TikTok"
              onChange={(value: string) =>
                handleInputChange('tiktok', value)
              }
            />
            <ContactField
              icon={<Globe className="text-blue-400" />}
              placeholder="Website"
              onChange={(value: string) =>
                handleInputChange('website', value)
              }
            />
          </div>
          <div className="flex justify-center col-span-2">
            <Button
              className="bg-black text-white w-1/4 hover:bg-gray-800  "
              type="submit"
            >
              Next
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
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
    <div className="flex items-center space-x-2 bg-white rounded-md shadow-sm">
      <div className="p-2">{icon}</div>
      <Input
        className="flex-grow border-0 focus-visible:ring-0"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
      />
    </div>
  );
}
