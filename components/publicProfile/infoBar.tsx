"use client";

import { FC } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import InfoCardContent from "./InfoCardContent";

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
  accessToken: string;
  fontColor?: string;
  secondaryFontColor?: string;
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

const InfoBar: FC<Props> = ({
  data,
  socialType,
  parentId,
  number,
  accessToken,
  fontColor,
  secondaryFontColor,
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

  console.log("iconName", iconName);

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
      case "Social Media":
        if (socialInputTypes[iconName] === "link") {
          return window.open(title, "_blank");
        }
        if (title.includes("https") || title.includes("http")) {
          return window.open(title, "_blank");
        } else {
          return window.open(`https://${link}/${title}`, "_blank");
        }
      case "Call To Action":
        if ("Email" === iconName) {
          return window.open(`mailto:${title}`, "_blank");
        }
        if (iconName === "Call" || iconName === "Mobile") {
          const phone = title.replace(/[^+\d]/g, "");
          window.location.href = `tel:${phone}`;
          return;
        } else {
          window.open(title, "_blank");
          return;
        }
      case "Chat Links":
        if (iconName === "Whatsapp") {
          return window.open(`https://wa.me/${title}?`, "_blank");
        }
        if (iconName === "Telegram") {
          return window.open(`https://t.me/${title}?`, "_blank");
        }
        return window.open(`${title}`, "_blank");
      case "Copy Address":
        navigator.clipboard.writeText(title);
        toast.success("Copied to clipboard", {
          position: "top-right",
        });
        break;
      case "Command/Action":
        if (iconName === "Email") {
          window.location.href = `mailto:${title}`;
          return;
        }
        if (iconName === "Address" || iconName === "Map") {
          window.open(
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title)}`,
            "_blank",
          );
          return;
        }
        if (iconName === "Call") {
          window.location.href = `tel:${title}`;
          return;
        }

        if (iconName === "Text Message") {
          window.location.href = `sms:${title}`;
          return;
        }

        if (
          iconName === "Send Crypto" ||
          iconName === "ENS Message" ||
          iconName === "Copy"
        ) {
          navigator.clipboard.writeText(title);
          toast.success("Copied to clipboard", {
            position: "top-right",
          });
          break;
        }
        if (title.toLowerCase().startsWith("www")) {
          return window.open(`https://${title}`, "_blank");
        }
        return window.open(title, "_blank");
      case "General Links":
        if (iconName === "Invoice" || iconName === "Card Payment") {
          navigator.clipboard.writeText(title);
          toast.success("Copied to clipboard", {
            position: "top-right",
          });
          break;
        }
        return window.open(title, "_blank");
      default:
        return window.open(title, "_blank");
    }
  };

  // const delay = number / 0.1;

  const trimIcon = iconName.toLowerCase().trim().replace(" ", "");

  return (
    <motion.div
      initial="hidden"
      animate="enter"
      exit="exit"
      variants={variants}
      transition={{
        duration: 0.4,
        delay: 0.2,
        type: "easeInOut",
      }}
      className="w-full"
    >
      <motion.div
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 10,
        }}
        onClick={openlink}
        className="my-2 flex flex-row items-center cursor-pointer bg-white shadow-xl p-2 rounded-[12px] w-full"
      >
        <div>
          <Image
            className="object-fill w-10 h-auto"
            src={
              iconName.includes("http")
                ? iconName
                : `/images/social_logo/${trimIcon}.svg`
            }
            alt={iconName}
            width={80}
            height={80}
            priority
          />
        </div>
        {
          <InfoCardContent
            title={buttonName}
            description={description}
            fontColor={fontColor}
            secondaryFontColor={secondaryFontColor}
          />
        }
      </motion.div>
    </motion.div>
  );
};

export default InfoBar;
