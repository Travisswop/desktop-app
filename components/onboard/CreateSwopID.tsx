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
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface CreateSwopIDProps {
  userData: OnboardingData;
}

type AvailabilityMessage = {
  type: 'error' | 'success' | null;
  message: string;
};

export default function CreateSwopID({
  userData,
}: CreateSwopIDProps) {
  const { getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const { toast } = useToast();
  const router = useRouter();

  const [swopID, setSwopID] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] =
    useState<AvailabilityMessage>({
      type: null,
      message: '',
    });

  const validateSwopID = (id: string): boolean => {
    // Must be 3-10 characters, alphanumeric or hyphen only
    return /^[a-z0-9-]{3,10}$/i.test(id) && !id.includes('.');
  };

  useEffect(() => {
    const checkSwopIDAvailability = async () => {
      // Clear message if input is empty
      if (!swopID) {
        setAvailabilityMessage({ type: null, message: '' });
        return;
      }

      // Validate input format first
      if (!validateSwopID(swopID)) {
        setAvailabilityMessage({
          type: 'error',
          message:
            'SwopID must be 3-10 characters long and can only contain letters, numbers, and hyphens',
        });
        return;
      }

      setIsChecking(true);
      try {
        const response = await fetch(
          `https://swop-id-ens-gateway.swop.workers.dev/get/${swopID}.swop.id`
        );

        if (response.ok) {
          setAvailabilityMessage({
            type: 'error',
            message: 'This SwopID is already taken',
          });
        } else if (response.status === 404) {
          setAvailabilityMessage({
            type: 'success',
            message: 'This SwopID is available!',
          });
        } else {
          throw new Error('Failed to check availability');
        }
      } catch (error) {
        console.error('Error checking SwopID:', error);
        setAvailabilityMessage({
          type: 'error',
          message: 'Failed to check availability. Please try again.',
        });
      } finally {
        setIsChecking(false);
      }
    };

    const debounceTimeout = setTimeout(checkSwopIDAvailability, 500);
    return () => clearTimeout(debounceTimeout);
  }, [swopID]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !swopID ||
      availabilityMessage.type !== 'success' ||
      !agreeToTerms
    ) {
      return;
    }

    const embededdedWallet = wallets.find(
      (wallet) => wallet.walletClientType === 'privy'
    );

    if (!embededdedWallet) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No wallet found. Please try again.',
      });
      return;
    }

    try {
      const provider = await embededdedWallet.getEthereumProvider();
      const address = embededdedWallet.address;
      const ens = `${swopID}.swop.id`;
      const message = `Set ${ens} to ${address}`;

      const signature = await provider.request({
        method: 'personal_sign',
        params: [message, address],
      });

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

      const response = await fetch(
        'https://swop-id-ens-gateway.swop.workers.dev/set',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create Swop ID');
      }

      const token = await getAccessToken();
      await fetch('/api/user/smartSite/social', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contentType: 'ensDomain',
          micrositeId: userData.userInfo?.primaryMicrosite,
          domain: ens,
        }),
      });

      toast({
        title: 'Success',
        description: 'SwopID created successfully!',
      });

      router.push('/');
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to create SwopID',
      });
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              id="trackTitle"
              value={swopID}
              onChange={(e) => setSwopID(e.target.value)}
              className="pr-20 text-lg py-6"
              placeholder="Enter swop username"
              disabled={isChecking}
            />
            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none ">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <span className="text-md font-bold">.SWOP.ID</span>
              </div>
            </div>
          </div>
          {availabilityMessage.type && (
            <p
              className={`text-sm ${
                availabilityMessage.type === 'error'
                  ? 'text-red-500'
                  : 'text-green-500'
              }`}
            >
              {availabilityMessage.message}
            </p>
          )}

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
            disabled={
              !swopID ||
              availabilityMessage.type !== 'success' ||
              !agreeToTerms ||
              isChecking
            }
          >
            {isChecking ? 'Checking availability...' : 'Next'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
