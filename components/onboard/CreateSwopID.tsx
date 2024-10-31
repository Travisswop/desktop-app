'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { OnboardingData } from '@/lib/types';
import { useWallets } from '@privy-io/react-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface CreateSwopIDProps {
  userData: OnboardingData;
}

export default function CreateSwopID({
  userData,
}: CreateSwopIDProps) {
  console.log('userdata', userData);
  const { wallets } = useWallets();
  const { toast } = useToast();
  const router = useRouter();

  const [swopID, setSwopID] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState({
    error: false,
    success: false,
    message: '',
  });

  useEffect(() => {
    const checkSwopIDAvailability = async () => {
      if (
        !swopID.match(/^[a-z0-9-]+$/i) ||
        swopID.length < 3 ||
        swopID.length > 10 ||
        swopID.includes('.')
      ) {
        setAvailabilityMessage({
          error: true,
          success: false,
          message: 'Invalid Swop Id',
        });
        return;
      }

      try {
        const response = await fetch(
          `https://swop-id-ens-gateway.swop.workers.dev/get/${swopID}.swop.id`
        );
        const data = await response.json();
        console.log('swop id availability: ', data);
        setAvailabilityMessage({
          error: true,
          success: false,
          message: 'Swop Id Not Available',
        });
      } catch (error) {
        console.log('error', error);
        setAvailabilityMessage({
          error: false,
          success: true,
          message: 'Swop Id Available',
        });
      }
    };

    const debounceTimeout = setTimeout(checkSwopIDAvailability, 500);

    return () => clearTimeout(debounceTimeout);
  }, [swopID]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const embededdedWallet = wallets.find(
      (wallet) => wallet.walletClientType === 'privy'
    );

    if (embededdedWallet) {
      try {
        const provider = await embededdedWallet.getEthereumProvider();
        const address = embededdedWallet.address;
        const ens = `${swopID}.swop.id`;
        const message = `Set ${ens} to ${address}`;
        const signature = await provider.request({
          method: 'personal_sign',
          params: [message, address],
        });

        console.log('signature', signature);
        const requestBody = {
          name: ens,
          owner: address,
          addresses: { 60: address, 501: '' },
          texts: {
            avatar: userData.userInfo?.avatar || '',
          },
          signature: {
            hash: signature,
            message: message,
          },
        };

        const apiUrl =
          'https://swop-id-ens-gateway.swop.workers.dev/set';

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          console.error('Failed to create Swop ID');
          toast({
            variant: 'destructive',
            title: 'Swop.ID',
            description: 'Failed to create Swop ID',
          });
        } else {
          console.log('Swop ID created successfully');
          toast({
            variant: 'default',
            title: 'Success',
            description: 'Swop ID created successfully',
          });
          router.replace('/');
        }
      } catch (error) {
        console.log('error', error);
        toast({
          variant: 'destructive',
          title: 'Signing Message',
          description: 'User rejected the request',
        });
      }
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-gradient-to-br from-blue-50 to-white">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-navy-blue">
          Create Your Swop.ID
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Select your favorite Swop ID to log in Swop
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <Input
              className="w-full text-lg py-6 mb-1"
              placeholder="Enter your Swop.ID"
              value={swopID}
              onChange={(e) => setSwopID(e.target.value)}
            />
            <div className="absolute right-0 top-1/3 -translate-y-1/2 pointer-events-none bg-accent py-3 px-4 ">
              <span className="text-md font-bold text-muted-foreground">
                .Swop.Id
              </span>
            </div>
            {availabilityMessage.error && (
              <p className="text-sm text-red-500">
                {availabilityMessage.message}
              </p>
            )}
            {availabilityMessage.success && (
              <p className="text-sm text-green-500">
                {availabilityMessage.message}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="terms"
              checked={agreeToTerms}
              onCheckedChange={(checked) =>
                setAgreeToTerms(checked as boolean)
              }
            />
            <label
              htmlFor="terms"
              className="text-sm text-center text-muted-foreground"
            >
              By clicking this check box, you agree to create a wallet
              using this ENS address.
            </label>
          </div>

          <Button
            className="w-full bg-black text-white hover:bg-gray-800"
            type="submit"
            disabled={!swopID || !agreeToTerms}
          >
            Next
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
