'use client';
import { FC, useState } from 'react';
import { CheckCircle, Loader } from 'lucide-react';
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const wait = () =>
  new Promise((resolve) => setTimeout(resolve, 2500));

interface Props {
  data: {
    name: string;
    parentId: string;
    micrositeId: string;
  };
  handler: (arg: boolean) => void;
}

const Subscribe: FC<Props> = ({ data, handler }) => {
  const { toast } = useToast();
  const [success, setSuccess] = useState(false);
  const [loader, setLoader] = useState(false);
  const [subscribeInfo, setSubscribeInfo] = useState({
    parentId: data.parentId,
    micrositeId: data.micrositeId,
    name: '',
    jobTitle: '',
    mobileNo: '',
    email: '',
    walletAddress: '',
    website: '',
  });
  const submitData = async () => {
    const option = {
      method: 'POST',
      body: JSON.stringify(subscribeInfo),
      headers: {
        'Content-Type': 'application/json',
      },
    };
    const response = await fetch(
      `${API_URL}/api/v1/web/subscribe`,
      option
    );
    const result = await response.json();

    if (result.state === 'success') {
      setLoader(false);
      setSuccess(true);
      wait().then(() => handler(true));
    } else {
      setLoader(false);
      toast({
        title: 'Something went wrong',
      });
    }
  };

  const subscribe = () => {
    // handler(true);
    if (!subscribeInfo.name) {
      toast({
        title: 'Enter your name',
      });
      return;
    }
    if (!subscribeInfo.mobileNo) {
      toast({
        title: 'Enter your mobile no.',
      });
      return;
    }
    if (!subscribeInfo.email) {
      toast({
        title: 'Enter your email',
      });
      return;
    }
    setLoader(true);
    submitData();
  };
  return (
    <>
      <DialogHeader>
        <DialogTitle className="mt-5">
          Subscribe to Unlock Exclusive Content
        </DialogTitle>
        <DialogDescription>
          To get in touch with{' '}
          <span className="font-bold">{data.name}</span>, please fill
          out the following form with accurate information. Your
          privacy is important to us, and all the data provided will
          be handled in accordance with our privacy policy.
        </DialogDescription>
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
                value={subscribeInfo.name}
                placeholder="John Doe"
                className="col-span-3"
                onChange={(e) =>
                  setSubscribeInfo({
                    ...subscribeInfo,
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
                value={subscribeInfo.email}
                type="email"
                placeholder="john@gmail.com"
                className="col-span-3"
                onChange={(e) =>
                  setSubscribeInfo({
                    ...subscribeInfo,
                    email: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone Number*
              </Label>
              <Input
                id="phone"
                value={subscribeInfo.mobileNo}
                placeholder="+880XXXXXXXXXXX"
                className="col-span-3"
                onChange={(e) =>
                  setSubscribeInfo({
                    ...subscribeInfo,
                    mobileNo: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="job" className="text-right">
                Job Title
              </Label>
              <Input
                id="job"
                value={subscribeInfo.jobTitle}
                placeholder="Software Engineer"
                className="col-span-3"
                onChange={(e) =>
                  setSubscribeInfo({
                    ...subscribeInfo,
                    jobTitle: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="wallet" className="text-right">
                Wallet Address
              </Label>
              <Input
                id="wallet"
                value={subscribeInfo.walletAddress}
                placeholder="0x..."
                className="col-span-3"
                onChange={(e) =>
                  setSubscribeInfo({
                    ...subscribeInfo,
                    walletAddress: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="website" className="text-right">
                Website
              </Label>
              <Input
                id="website"
                value={subscribeInfo.website}
                placeholder="www.website.com"
                className="col-span-3"
                onChange={(e) =>
                  setSubscribeInfo({
                    ...subscribeInfo,
                    website: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <DialogFooter>
        <Button
          onClick={subscribe}
          className={success ? 'text-lime-600' : 'text-gray-50'}
        >
          <span
            className={success ? 'text-lime-600' : 'text-gray-50'}
          >
            Subscribe
          </span>
          {success && <CheckCircle className=" ml-2 h-5 w-5" />}
          {loader && (
            <Loader className=" ml-2 h-5 w-5 animate-spin " />
          )}
        </Button>
        <Toaster />
      </DialogFooter>
    </>
  );
};

export default Subscribe;
