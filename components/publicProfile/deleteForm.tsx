'use client';
import { FC, useState } from 'react';
import { CheckCircle, Loader } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const wait = () =>
  new Promise((resolve) => setTimeout(resolve, 2500));

const Delete: FC = () => {
  const { toast } = useToast();
  const [success, setSuccess] = useState(false);
  const [loader, setLoader] = useState(false);
  const [info, setInfo] = useState({
    email: '',
    password: '',
  });
  const submitData = async () => {
    const option = {
      method: 'POST',
      body: JSON.stringify(info),
      headers: {
        'Content-Type': 'application/json',
      },
    };
    const response = await fetch(
      `${API_URL}/api/v1/web/delete`,
      option
    );
    const result = await response.json();
    console.log(result);

    if (result.state === 'success') {
      setLoader(false);
      setSuccess(true);
      // wait().then(() => handler(true));
    } else {
      setLoader(false);
      setSuccess(false);
      toast({
        title: result.message,
      });
    }
  };

  const subscribe = () => {
    // handler(true);
    if (!info.email) {
      toast({
        title: 'Enter your email',
      });
      return;
    }
    if (!info.password) {
      toast({
        title: 'Enter a password',
      });
      return;
    }
    setLoader(true);
    submitData();
  };
  return (
    <>
      <div className="mt-10 mb-5">
        <h1 className="text-2xl font-bold text-center">
          Account Deletion Form
        </h1>
      </div>
      <Card className="py-4 flex flex-col items-center">
        <CardContent>
          <div className="grid gap-4 ">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email*
              </Label>
              <Input
                id="email"
                value={info.email}
                type="email"
                placeholder="john@gmail.com"
                className="col-span-3"
                onChange={(e) =>
                  setInfo({
                    ...info,
                    email: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Password*
              </Label>
              <Input
                id="password"
                type="password"
                value={info.password}
                placeholder="XXXXXXXX"
                className="col-span-3"
                onChange={(e) =>
                  setInfo({
                    ...info,
                    password: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </CardContent>
        <Button
          onClick={subscribe}
          className="bg-red-800 text-gray-50"
        >
          <span>Delete Account</span>
          {success && <CheckCircle className=" ml-2 h-5 w-5" />}
          {loader && (
            <Loader className=" ml-2 h-5 w-5 animate-spin " />
          )}
        </Button>
      </Card>

      <Toaster />
    </>
  );
};

export default Delete;
