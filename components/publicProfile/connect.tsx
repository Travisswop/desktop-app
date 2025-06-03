"use client";
import { FC, useState, useEffect } from "react";
import Image from "next/image";
import { CheckCircle, Link2, Loader } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { addSwopPoint } from "@/actions/addPoint";
import Cookies from "js-cookie";
import { postConnectSmartsite } from "@/actions/connectMicrosite";
// import { useRouter } from "next/navigation";
const wait = () => new Promise((resolve) => setTimeout(resolve, 2500));
interface Props {
  data: {
    name: string;
    parentId: string;
    micrositeId: string;
    avatar: string;
  };
  handler: (arg: boolean) => void;
}

const Connect: FC<Props> = ({ data, handler }) => {
  const { toast } = useToast();
  const [userId, setUserId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [success, setSuccess] = useState(false);
  const [loader, setLoader] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [connectInfo, setConnectInfo] = useState({
    pId: data.parentId,
    cId: data.micrositeId,
    name: "",
    email: "",
    lat: 0,
    lng: 0,
  });

  // const router = useRouter();

  useEffect(() => {
    if (window !== undefined) {
      const getUserId = async () => {
        const id = Cookies.get("user-id");
        setUserId(id || "");
      };
      getUserId();

      const getAccessToken = async () => {
        const token = Cookies.get("access-token");
        setAccessToken(token || "");
      };
      getAccessToken();
    }
  }, []);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        const { latitude, longitude } = coords;
        setConnectInfo({
          ...connectInfo,
          lat: latitude,
          lng: longitude,
        });
      });
    }
  }, []); //not add connect as dependency

  const handleRedirect = () => {
    setRedirecting(true);
    setTimeout(() => {
      window.location.href =
        "https://apps.apple.com/us/app/swop-connecting-the-world/id1593201322";
    }, 3000);
  };

  const submitData = async () => {
    if (!accessToken || !userId) {
      handleRedirect();
      return;
    }
    setLoader(true);
    try {
      const payload = {
        pId: connectInfo.pId,
        cId: connectInfo.cId,
        userId: userId,
        lat: connectInfo.lat.toString(),
        lng: connectInfo.lng.toString(),
      };

      const res = await postConnectSmartsite(payload, accessToken);

      console.log("response", res);

      if (res?.state === "success") {
        setLoader(false);
        setSuccess(true);
        await addSwopPoint({
          userId: userId || data.parentId,
          pointType: "Gaining a Follower",
          actionKey: "launch-swop",
        });
        wait().then(() => handler(true));
      } else {
        throw new Error(res?.message || "Failed to connect");
      }
    } catch (error: any) {
      console.log("error occur", error);
      setLoader(false);
      toast({
        title: "Connection failed",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    }
  };

  if (redirecting) {
    return (
      <div className="flex flex-col items-center gap-y-6 p-6 text-center">
        <div className="relative w-24 h-24 rounded-full border-4 border-white shadow-lg">
          <Image
            className="object-cover rounded-full"
            src={
              data.avatar.includes("https")
                ? data.avatar
                : `/images/avatar/${data.avatar}.png`
            }
            alt={data.name}
            fill
            priority
          />
        </div>

        <DialogHeader className="text-center space-y-2">
          <DialogTitle className="text-xl font-semibold text-gray-800">
            {`You're not authenticated with Swop`}
          </DialogTitle>
          <DialogDescription className="text-gray-500 text-center">
            Redirecting to Swop App...
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center">
          <Loader className="mr-2 h-4 w-4 animate-spin" />
          <span>Please wait</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center gap-y-6">
        <div className="relative w-24 h-24 rounded-full border-4 border-white shadow-lg">
          <Image
            className="object-cover rounded-full"
            src={
              data.avatar.includes("https")
                ? data.avatar
                : `/images/avatar/${data.avatar}.png`
            }
            alt={data.name}
            fill
            priority
          />
        </div>

        <DialogHeader className="text-center space-y-2">
          <DialogTitle className="text-xl font-semibold text-gray-800">
            Connect with {data.name}
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Click below to establish your connection
          </DialogDescription>
        </DialogHeader>

        <div className="w-full flex flex-col items-center space-y-4">
          <Button
            onClick={submitData}
            disabled={loader || success}
            size="lg"
            className={`w-full max-w-xs ${
              success ? "bg-emerald-100 hover:bg-emerald-100" : ""
            }`}
          >
            {loader ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : success ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" />
                <span className="text-emerald-600">Connected</span>
              </>
            ) : (
              <>
                <Link2 className="mr-2 h-4 w-4" />
                Connect Now
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-gray-400 text-center">
          By connecting, you agree to our Terms of Service
        </div>
      </div>
      <Toaster />
    </>
  );
};
export default Connect;
