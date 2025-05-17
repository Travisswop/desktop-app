'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { OnboardingData } from '@/lib/types';
import { useWallets } from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

import astronot from '@/public/onboard/astronot.svg';
import bluePlanet from '@/public/onboard/blue-planet.svg';
import yellowPlanet from '@/public/onboard/yellow-planet.svg';

interface CreateSwopIDProps {
  userData: OnboardingData;
}

type AvailabilityMessage = {
  type: 'error' | 'success' | null;
  message: string;
};

const SWOP_ID_REGEX = /^[a-z0-9-]{3,10}$/;
const SWOP_ID_GATEWAY =
  'https://swop-id-ens-gateway.swop.workers.dev';

export default function CreateSwopID({
  userData,
}: CreateSwopIDProps) {
  const { wallets } = useWallets();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { toast } = useToast();
  const router = useRouter();

  const [swopID, setSwopID] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] =
    useState<AvailabilityMessage>({
      type: null,
      message: '',
    });

  const validateSwopID = useCallback((id: string): boolean => {
    return SWOP_ID_REGEX.test(id);
  }, []);

  const checkSwopIDAvailability = useCallback(async () => {
    if (!swopID) {
      setAvailabilityMessage({ type: null, message: '' });
      return;
    }

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
        `${SWOP_ID_GATEWAY}/get/${swopID}.swop.id`
      );

      setAvailabilityMessage(
        response.ok
          ? { type: 'error', message: 'This SwopID is already taken' }
          : response.status === 404
          ? { type: 'success', message: 'This SwopID is available!' }
          : {
              type: 'error',
              message:
                'Failed to check availability. Please try again.',
            }
      );
    } catch (error) {
      console.error('Error checking SwopID:', error);
      setAvailabilityMessage({
        type: 'error',
        message: 'Failed to check availability. Please try again.',
      });
    } finally {
      setIsChecking(false);
    }
  }, [swopID, validateSwopID]);

  useEffect(() => {
    const debounceTimeout = setTimeout(checkSwopIDAvailability, 500);
    return () => clearTimeout(debounceTimeout);
  }, [checkSwopIDAvailability]);

  const createSwopID = useCallback(async () => {
    try {
      // Find an appropriate Ethereum wallet
      const ethereumWallet = wallets.find(
        (wallet: any) =>
          wallet.type === 'ethereum' &&
          wallet.walletClientType === 'privy'
      );

      if (!ethereumWallet) {
        throw new Error('No Ethereum wallet available');
      }

      // Get the first available Solana wallet
      const solanaWallet = solanaWallets?.[0];
      if (!solanaWallet) {
        console.warn(
          'No Solana wallet available, proceeding with Ethereum only'
        );
      }

      const provider = await ethereumWallet.getEthereumProvider();
      const address = ethereumWallet.address;
      const ens = `${swopID}.swop.id`;
      const message = `Set ${ens} to ${address}`;

      const signature = await provider.request({
        method: 'personal_sign',
        params: [message, address],
      });

      const requestBody = {
        name: ens,
        owner: address,
        addresses: {
          60: address,
          // Only include Solana if wallet exists
          ...(solanaWallet?.address
            ? { 501: solanaWallet.address }
            : {}),
        },
        texts: {
          avatar: userData.userInfo?.avatar || '',
        },
        signature: {
          hash: signature,
          message: message,
        },
      };

      const response = await fetch(`${SWOP_ID_GATEWAY}/set`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to create Swop ID: ${errorData}`);
      }

      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/addSocial`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contentType: 'ensDomain',
            micrositeId: userData.userInfo?.primaryMicrosite,
            domain: ens,
          }),
        }
      );

      toast({
        title: 'Success',
        description: 'SwopID created successfully!',
      });

      setTimeout(() => {
        setIsSubmitting(false);
        router.push('/');
      }, 2000);
    } catch (error) {
      console.error('Error creating SwopID:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to create SwopID',
      });
      setIsSubmitting(false);
    }
  }, [swopID, userData, toast, router, solanaWallets, wallets]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (
        !swopID ||
        availabilityMessage.type !== 'success' ||
        !agreeToTerms
      ) {
        return;
      }

      setIsSubmitting(true);

      await createSwopID();
    },
    [
      swopID,
      availabilityMessage.type,
      agreeToTerms,
      wallets,
      toast,
      createSwopID,
    ]
  );

  return (
    <div className="relative w-full max-w-lg mx-auto border-0 my-24">
      <div className="absolute -top-28 left-0">
        <Image
          src={astronot}
          alt="astronot image"
          className="w-40 h-auto"
        />
      </div>
      <div className="absolute -bottom-28 -left-10">
        <Image
          src={yellowPlanet}
          alt="yellow planet"
          className="w-40 h-auto"
        />
      </div>
      <div className="absolute -top-14 -right-24">
        <Image
          src={bluePlanet}
          alt="blue planet"
          className="w-48 h-auto"
        />
      </div>
      <div className="backdrop-blur-[50px] bg-white bg-opacity-25 shadow-uniform rounded-xl">
        <CardHeader className="text-center pt-10 px-8">
          <CardTitle className="text-2xl font-bold text-navy-blue">
            Create Your Swop.ID
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Select your favorite Swop ID to log in Swop
          </p>
        </CardHeader>
        <CardContent className="pb-10 px-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                id="trackTitle"
                value={swopID}
                onChange={(e) => setSwopID(e.target.value)}
                className="pr-20 text-lg py-6 focus-visible:!ring-1 !ring-gray-300"
                placeholder="Enter swop username"
                disabled={isChecking}
              />
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                <span className="text-base font-semibold tracking-wide text-muted-foreground">
                  .SWOP.ID
                </span>
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

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={agreeToTerms}
                onCheckedChange={(checked) =>
                  setAgreeToTerms(checked as boolean)
                }
                className="translate-y-1"
              />
              <label
                htmlFor="terms"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                By clicking this check box, you agree to create a
                wallet using this ENS address.
              </label>
            </div>

            <Button
              className="w-full bg-black text-white hover:bg-gray-800"
              type="submit"
              disabled={
                !swopID ||
                availabilityMessage.type !== 'success' ||
                !agreeToTerms ||
                isChecking ||
                isSubmitting
              }
            >
              {isChecking ? 'Checking availability...' : 'Next'}
              {isSubmitting && (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              )}
            </Button>
          </form>
        </CardContent>
      </div>
    </div>
  );
}
