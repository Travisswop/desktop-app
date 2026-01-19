"use client";
import { FC } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Props {
  data: {
    _id: string;
    micrositeId: string;
    name: string;
    value: string;
    url: string;
    iconName: string;
    iconPath: string;
    group: string;
  };
  socialType: string;
  parentId: string;
  number: number;
  accessToken: string;
  fontColor?: string;
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
  Twitter: "username",
  "Linked In": "username",
  YouTube: "link",
  Domus: "link",
  Bluesky: "link",
  Facebook: "username",
  Github: "link",
  Instagram: "username",
  Rumble: "link",
  TikTok: "username",
  Truth: "link",
  Threads: "link",
  Snapchat: "username",
};

const SocialLarge: FC<Props> = ({
  data,
  socialType,
  parentId,
  number,
  accessToken,
  fontColor,
}) => {
  const { _id, micrositeId, name, value, url, iconName, iconPath, group } =
    data;

  console.log("data social large", data);

  const openlink = async () => {
    // if (!accessToken) {
    //   window.location.href =
    //     'https://apps.apple.com/us/app/swop-connecting-the-world/id1593201322';
    //   return;
    // }
    try {
      fetch(`${API_URL}/api/v1/web/updateCount`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
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
      case "Call To Action":
        if (iconName.startsWith("Copy")) {
          navigator.clipboard.writeText(value);
          toast.success("Copied to clipboard", {
            position: "top-right",
          });
          return;
        } else if (iconName === "Call" || iconName === "Mobile") {
          const phone = value.replace(/[^+\d]/g, "");
          window.location.href = `tel:${phone}`;
          return;
        } else if (iconName === "Email") {
          window.location.href = `mailto:${value}`;
          return;
        } else {
          return window.open(value, "_blank");
        }
      case "Link":
        return window.open(`https://${url}`, "_blank");

      case "Social Media":
        if (socialInputTypes[name] === "link") {
          return window.open(value, "_blank");
        }
        if (name === "Linked In") {
          return window.open(`https://${url}/in/${value}`, "_blank");
        }
        // if (name === 'Snapchat') {
        //   return window.open(`${url}/add/${value}`, '_self');
        // }
        // return window.open(`https://${url}/${value}`, '_blank');
        if (value.includes("https") || value.includes("http")) {
          return window.open(value, "_blank");
        } else {
          return window.open(`https://${url}/${value}`, "_blank");
        }
      case "Chat Links":
        if (name === "Whatsapp") {
          return window.open(`https://wa.me/${value}?`, "_blank");
        }
        if (name === "Telegram") {
          return window.open(`https://t.me/${value}?`, "_blank");
        }
        return window.open(`${value}`, "_self");
      case "Copy Address":
        navigator.clipboard.writeText(value);
        toast.success("Copied to clipboard", {
          position: "top-right",
        });
        break;
      case "Command/Action":
        if (name === "Email") {
          return window.open(`mailto:${value}`, "_self");
        }
        if (name === "Call") {
          return window.open(`tel:${value}`, "_self");
        }
        if (name === "Text Message") {
          return window.open(`sms:${value}`, "_self");
        }

        if (
          name === "Send Crypto" ||
          name === "ENS Message" ||
          name === "Copy"
        ) {
          navigator.clipboard.writeText(value);
          toast.success("Copied to clipboard", {
            position: "top-right",
          });
          break;
        }
        return window.open(value, "_blank");
      case "General Links":
        if (name === "Invoice" || name === "Card Payment") {
          navigator.clipboard.writeText(value);
          toast.success("Copied to clipboard", {
            position: "top-right",
          });
          break;
        }
        return window.open(value, "_blank");
      default:
        return window.open(value, "_blank");
    }
  };

  const delay = 0.5;

  const trimIcon = iconName.toLowerCase().trim().replace(" ", "");

  return (
    <motion.div
      initial="hidden"
      animate="enter"
      exit="exit"
      variants={variants}
      transition={{
        duration: 0.4,
        delay,
        type: "easeInOut",
      }}
      onClick={openlink}
      className="flex flex-col gap-3 items-center justify-between cursor-pointer"
    >
      <motion.div
        whileHover={{ scale: 1.05 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 10,
        }}
        className="w-20 h-20 sm:w-24 sm:h-24"
      >
        <Image
          className="w-full h-auto rounded-2xl"
          src={
            iconName.includes("http")
              ? iconName
              : `/images/social_logo/${trimIcon}.svg`
          }
          alt={iconName}
          width={230}
          height={230}
          priority
        />
      </motion.div>
      <div
        style={{ color: fontColor && fontColor }}
        className="text-sm font-medium truncate"
      >
        {name}
      </div>
    </motion.div>
  );
};

export default SocialLarge;
