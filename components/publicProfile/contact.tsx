"use client";
import { FC } from "react";
import Image from "next/image";
import { downloadVCard } from "@/lib/vCardUtils";
import { motion } from "framer-motion";
import InfoCardContent from "./InfoCardContent";
const API_URL = process.env.NEXT_PUBLIC_API_URL;
interface Props {
  data: {
    _id: string;
    micrositeId: string;
    name: string;
    mobileNo: string;
    email: string;
    address: string;
    websiteUrl: string;
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

const download = async (data: any, parentId: string, accessToken: string) => {
  // if (!accessToken) {
  //   window.location.href =
  //     'https://apps.apple.com/us/app/swop-connecting-the-world/id1593201322';
  //   return;
  // }

  const vCard = await downloadVCard(data);
  const blob = new Blob([vCard], { type: "text/vcard" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.setAttribute("hidden", "");
  a.setAttribute("href", url);
  a.setAttribute("download", `${data.name}.vcf`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  try {
    fetch(`${API_URL}/api/v1/web/updateCount`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        socialType: "contact",
        socialId: data._id,
        parentId,
      }),
    });
  } catch (err) {
    console.log(err);
  }
};

const Contact: FC<Props> = ({
  data,
  socialType,
  parentId,
  number,
  accessToken,
  fontColor,
  secondaryFontColor,
}) => {
  const { _id, micrositeId, name, mobileNo, email, address, websiteUrl } = data;
  const delay = number + 1 * 0.2;
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
      className="w-full"
    >
      <motion.div
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 10,
        }}
        onClick={() => download(data, parentId, accessToken)}
        className="my-2 mx-1 flex flex-row items-center cursor-pointer bg-white shadow-small p-2 rounded-[12px] max-w-full"
      >
        <div>
          <Image
            className="object-fill w-10 h-auto"
            src="/images/outline-icons/contact.svg"
            alt={name}
            width={80}
            height={80}
            priority
          />
        </div>
        {/* <div>
          <div className="text-md font-semibold">{name}</div>
          <div className="text-xs">{mobileNo}</div>
        </div> */}
        {
          <InfoCardContent
            title={name}
            description={mobileNo}
            fontColor={fontColor}
            secondaryFontColor={secondaryFontColor}
          />
        }
      </motion.div>
    </motion.div>
  );
};

export default Contact;
