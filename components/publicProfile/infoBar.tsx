'use client';

import { FC } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
interface Props {
  data: {
    _id: string;
    micrositeId: string;
    title: string;
    link: string;
    description: string;
    iconName: string;
    iconPath: string;
    group: string;
    buttonName: string;
  };
  socialType: string;
  parentId: string;
  number: number;
}

const variants = {
  hidden: { opacity: 0, x: 0, y: 25 },
  enter: { opacity: 1, x: 0, y: 0 },
  exit: { opacity: 0, x: -0, y: 25 },
};

interface SocialInputTypes {
  [key: string]: string;
}

const socialInputTypes: SocialInputTypes = {
  Twitter: 'username',
  'Linked In': 'username',
  YouTube: 'link',
  Domus: 'link',
  Bluesky: 'link',
  Facebook: 'username',
  Github: 'link',
  Instagram: 'username',
  Rumble: 'link',
  TikTok: 'username',
  Truth: 'link',
  Threads: 'link',
  Snapchat: 'username',
};

const InfoBar: FC<Props> = ({
  data,
  socialType,
  parentId,
  number,
}) => {
  const {
    _id,
    micrositeId,
    title,
    link,
    description,
    iconName,
    iconPath,
    buttonName,
    group,
  } = data;

  const { toast } = useToast();

  const openlink = async () => {
    try {
      fetch(`${API_URL}/api/v1/web/updateCount`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          socialType,
          socialId: _id,
          parentId,
        }),
      });
    } catch (err) {
      console.log(err);
    }

    switch (group) {
      case 'Social Media':
        if (socialInputTypes[iconName] === 'link') {
          return window.open(title, '_self');
        }
        // if (iconName === 'Linked In') {
        //   return window.open(`https://${link}/in/${title}`, '_self');
        // }
        // if (iconName === 'Snapchat') {
        //   return window.open(`${link}/add/${title}`, '_self');
        // }
        // return window.open(`https://${link}/${title}`, '_self');
        if (title.includes('https') || title.includes('http')) {
          return window.open(title, '_self');
        } else {
          return window.open(`https://${link}/${title}`, '_self');
        }
      case 'Chat Links':
        if (iconName === 'Whatsapp') {
          return window.open(`https://wa.me/${title}?`, '_self');
        }
        if (iconName === 'Telegram') {
          return window.open(`https://t.me/${title}?`, '_self');
        }
        return window.open(`${title}`, '_self');
      case 'Copy Address':
        navigator.clipboard.writeText(title);
        toast({
          title: 'Copied to clipboard',
        });
        break;
      case 'Command/Action':
        if (iconName === 'Email') {
          return window.open(`mailto:${title}`, '_self');
        }
        if (iconName === 'Call') {
          return window.open(`tel:${title}`, '_self');
        }
        if (iconName === 'Text Message') {
          return window.open(`sms:${title}`, '_self');
        }

        if (
          iconName === 'Send Crypto' ||
          iconName === 'ENS Message' ||
          iconName === 'Copy'
        ) {
          navigator.clipboard.writeText(title);
          toast({
            title: 'Copied to clipboard',
          });
          break;
        }
        if (title.toLowerCase().startsWith('www')) {
          console.log('www');
          return window.open(`https://${title}`, '_self');
        }
        return window.open(title, '_self');
      case 'General Links':
        if (iconName === 'Invoice' || iconName === 'Card Payment') {
          navigator.clipboard.writeText(title);
          toast({
            title: 'Copied to clipboard',
          });
          break;
        }
        return window.open(title, '_self');
      default:
        return window.open(title, '_self');
    }
  };

  // const delay = number / 0.1;

  const trimIcon = iconName.toLowerCase().trim().replace(' ', '');

  return (
    <motion.div
      initial="hidden"
      animate="enter"
      exit="exit"
      variants={variants}
      transition={{
        duration: 0.4,
        delay: 0.2,
        type: 'easeInOut',
      }}
    >
      <motion.div
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 10,
        }}
        onClick={openlink}
        className="my-2 flex flex-row gap-2 items-center cursor-pointer bg-white shadow-xl p-2 rounded-[12px]"
      >
        <div>
          <Image
            className="object-fill w-14 h-14"
            src={
              iconName.includes('http')
                ? iconName
                : `/images/social_logo/${trimIcon}.svg`
            }
            alt={iconName}
            width={80}
            height={80}
            priority
          />
        </div>
        <div className="max-w-xs overflow-hidden ml-2">
          <div className="text-md font-semibold">{buttonName}</div>
          <div className="text-xs">{description}</div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default InfoBar;
