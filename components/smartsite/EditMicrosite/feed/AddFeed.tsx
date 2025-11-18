"use client";
import React, { useEffect, useState } from "react";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import Image from "next/image";
import Cookies from "js-cookie";
import feedIcon from "@/public/images/smartsite_icon/feed-embeed.png";
import { Tooltip } from "@nextui-org/react";
import { MdInfoOutline } from "react-icons/md";
import { handleV5SmartSiteUpdate } from "@/actions/update";
import { Loader } from "lucide-react";
import toast from "react-hot-toast";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";

const AddFeed = ({ onCloseModal }: any) => {
  const stateSmartsiteData: any = useSmartSiteApiDataStore((state) => state); //get small icon store value

  const [token, setToken] = useState("");
  const [showFeedLoading, setShowFeedLoading] = useState({
    status: false,
    for: "Yes",
  });

  useEffect(() => {
    const getAccessToken = async () => {
      const token = Cookies.get("access-token");
      setToken(token || "");
    };
    getAccessToken();
  }, []);

  const hangleEditSwopFeed = async (feedStatus: string) => {
    const payload = {
      _id: stateSmartsiteData._id,
      showFeed: feedStatus === "yes" ? true : false,
    };
    setShowFeedLoading({
      status: true,
      for: feedStatus === "yes" ? "Yes" : "No",
    });
    try {
      await handleV5SmartSiteUpdate(payload, token);
      toast.success("Feed embedded successfully");
      onCloseModal(); //close modal
    } catch (error) {
      console.error(error);
      toast.error("Something Went Wrong!");
    } finally {
      setShowFeedLoading({
        status: false,
        for: feedStatus === "yes" ? "Yes" : "No",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center justify-center gap-1 w-full">
          <h1 className="text-lg font-semibold">Feed Embed</h1>
          <Tooltip
            size="sm"
            content={"You can embed feed into your smartsite."}
            className={`
                      "max-w-40 h-auto `}
          >
            <button>
              <MdInfoOutline />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="flex flex-col gap-2 items-center">
        <p className="text-base font-medium">
          Do You Want to Embed Swop Feed ?
        </p>
        <div>
          <Image src={feedIcon} alt="feed" className="w-16 h-auto" />
        </div>
        <div className="flex items-center gap-4 mt-2">
          <PrimaryButton
            onClick={() => hangleEditSwopFeed("yes")}
            className="bg-black hover:bg-gray-800 text-white font-medium px-5"
            // whiteLoading={true}
            // width={"w-28"}
          >
            {showFeedLoading.status && showFeedLoading.for === "Yes" ? (
              <Loader className="animate-spin" size={20} />
            ) : (
              "Yes"
            )}
          </PrimaryButton>
          <PrimaryButton
            onClick={() => hangleEditSwopFeed("no")}
            className="font-medium px-5"
            // whiteLoading={true}
            type="button"
            // width={"w-28"}
          >
            {showFeedLoading.status && showFeedLoading.for === "No" ? (
              <Loader className="animate-spin" size={20} />
            ) : (
              "No"
            )}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

export default AddFeed;
