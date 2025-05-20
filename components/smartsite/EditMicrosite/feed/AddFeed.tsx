"use client";
import React, { useEffect, useState } from "react";
// import { LiaFileMedicalSolid } from "react-icons/lia";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
// import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
// import { toast } from "react-toastify";
// import AnimateButton from "@/components/Button/AnimateButton";
// import { isENSAvailable, postMessage } from "@/actions/message";
import { FaTimes } from "react-icons/fa";
import Image from "next/image";
import Cookies from "js-cookie";
import feedIcon from "@/public/images/smartsite_icon/feed-embeed.png";
// import { IoLinkOutline } from "react-icons/io5";
import AnimateButton from "@/components/ui/Button/AnimateButton";
// import { LiaFileMedicalSolid } from "react-icons/lia";
import { Tooltip } from "@nextui-org/react";
import { MdInfoOutline } from "react-icons/md";
import { handleV5SmartSiteUpdate } from "@/actions/update";
import { Loader } from "lucide-react";
import toast from "react-hot-toast";

const AddFeed = ({ handleRemoveIcon }: any) => {
  const state: any = useSmartSiteApiDataStore((state) => state); //get small icon store value
  //const sesstionState = useLoggedInUserStore((state) => state.state.user); //get session value

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

  // const [isLoading, setIsLoading] = useState<boolean>(false);
  // const [error, setError] = useState<any>({});

  // const handleFormSubmit = async (e: any) => {
  //   setIsLoading(true);
  //   e.preventDefault();
  //   const formData = new FormData(e.currentTarget);
  //   const submitInfo = {
  //     micrositeId: state.data._id,
  //     domain: formData.get("ensName"),
  //   };
  // };

  const hangleEditSwopFeed = async (feedStatus: string) => {
    const payload = {
      _id: state.data._id,
      showFeed: feedStatus === "yes" ? true : false,
    };
    setShowFeedLoading({
      status: true,
      for: feedStatus === "yes" ? "Yes" : "No",
    });
    try {
      await handleV5SmartSiteUpdate(payload, token);
      toast.success("Feed embedded successfully");
      handleRemoveIcon("Feed");
    } catch (error) {
      console.error(error);
    } finally {
      setShowFeedLoading({
        status: false,
        for: feedStatus === "yes" ? "Yes" : "No",
      });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-small p-6 flex flex-col gap-4">
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
        <button type="button" onClick={() => handleRemoveIcon("Feed")}>
          <FaTimes size={20} />
        </button>
      </div>

      <div className="flex flex-col gap-2 items-center">
        <p className="text-lg font-medium">Do You Want to Embed Swop Feed ?</p>
        <div>
          <Image src={feedIcon} alt="feed" className="w-16 h-auto" />
        </div>
        <div className="flex items-center gap-4 mt-2">
          <AnimateButton
            onClick={() => hangleEditSwopFeed("yes")}
            className="bg-black text-white py-2 !border-0 font-medium"
            whiteLoading={true}
            width={"w-28"}
          >
            {showFeedLoading.status && showFeedLoading.for === "Yes" ? (
              <Loader className="animate-spin" />
            ) : (
              "Yes"
            )}
          </AnimateButton>
          <AnimateButton
            onClick={() => hangleEditSwopFeed("no")}
            className="font-medium"
            whiteLoading={true}
            type="button"
            width={"w-28"}
          >
            {showFeedLoading.status && showFeedLoading.for === "No" ? (
              <Loader className="animate-spin" />
            ) : (
              "No"
            )}
          </AnimateButton>
        </div>
      </div>
    </div>
  );
};

export default AddFeed;
