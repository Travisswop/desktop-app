"use client";
import { FC, useState, useEffect } from "react";
import Image from "next/image";
import { CheckCircle, Loader } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import {
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { addSwopPoint } from "@/actions/addPoint";
// import { addSwopPoint } from '@/app/actions/addPoint';
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
  const [success, setSuccess] = useState(false);
  const [loader, setLoader] = useState(false);
  const [connectInfo, setConnectInfo] = useState({
    pId: data.parentId,
    cId: data.micrositeId,
    name: "",
    email: "",
    lat: 0,
    lng: 0,
  });

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
  }, []);

  const submitData = async () => {
    const option = {
      method: "POST",
      body: JSON.stringify(connectInfo),
      headers: {
        "Content-Type": "application/json",
      },
    };
    const response = await fetch("https://app.apiswop.co/web/connect", option);
    const res = await response.json();

    if (res.state === "success") {
      addSwopPoint({
        userId: data.parentId,
        pointType: "Gaining a Follower",
        actionKey: "launch-swop",
      });
      setLoader(false);
      setSuccess(true);
      wait().then(() => handler(true));
    } else {
      setLoader(false);
      toast({
        title: "User not found with this email",
      });
    }
  };

  const connect = () => {
    if (!connectInfo.name) {
      toast({
        title: "Enter your name",
      });
      return;
    }
    if (!connectInfo.email) {
      toast({
        title: "Enter your email",
      });
      return;
    }
    setLoader(true);
    submitData();
  };

  return (
    <>
      <div className="border-4 w-24 rounded-full border-white shadow-lg mx-auto">
        <Image
          className="object-fill w-full h-full rounded-full"
          src={
            data.avatar.includes("https")
              ? data.avatar
              : `/images/avatar/${data.avatar}.png`
          }
          alt={data.name}
          width={120}
          height={120}
          priority
        />
      </div>
      <DialogHeader>
        <DialogTitle className="text-center">
          Share your info to Connect with {data.name}
        </DialogTitle>
      </DialogHeader>
      <Card>
        <CardContent>
          <div className="grid gap-4 ">
            <div className="grid grid-cols-4 items-center gap-4 pt-6">
              <Label htmlFor="name" className="text-right">
                Name*
              </Label>
              <Input
                id="name"
                value={connectInfo.name}
                placeholder="John Doe"
                className="col-span-3"
                onChange={(e) =>
                  setConnectInfo({
                    ...connectInfo,
                    name: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email*
              </Label>
              <Input
                id="email"
                value={connectInfo.email}
                type="email"
                placeholder="john@gmail.com"
                className="col-span-3"
                onChange={(e) =>
                  setConnectInfo({
                    ...connectInfo,
                    email: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <DialogFooter>
        <Button
          onClick={connect}
          className={success ? "text-lime-600" : "text-gray-50"}
        >
          <span className={success ? "text-lime-600" : "text-gray-50"}>
            Connect
          </span>
          {success && <CheckCircle className=" ml-2 h-5 w-5" />}
          {loader && <Loader className=" ml-2 h-5 w-5 animate-spin " />}
        </Button>
        <Toaster />
      </DialogFooter>
    </>
  );
};

export default Connect;
