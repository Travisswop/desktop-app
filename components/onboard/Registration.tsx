'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Upload,
  User,
  User2,
  Phone,
  Mail,
  Calendar,
  Building,
  MapPin,
  Loader,
} from 'lucide-react';
import { PrivyUser, OnboardingData } from '@/lib/types';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { useToast } from '@/hooks/use-toast';
import astronot from '@/public/onboard/astronot.svg';
import blackPlanet from '@/public/onboard/black-planet.svg';
import editIcon from '@/public/images/websites/edit-icon.svg';
import { useDisclosure } from '@nextui-org/react';
import userProfileImages from '../util/data/userProfileImage';
import SelectAvatorModal from '../modal/SelectAvatorModal';
import { useCreateWallet, usePrivy } from '@privy-io/react-auth';
import { WalletItem } from '@/types/wallet';
import { createWalletBalance } from '@/actions/createWallet';
import logger from '@/utils/logger';
import {
  useWallets as useSolanaWallets,
  useSignAndSendTransaction,
  useCreateWallet as useSolanaCreateWallet,
} from '@privy-io/react-auth/solana';
import GooglePlacesAutocomplete from 'react-google-places-autocomplete';
import { PrimaryButton } from '../ui/Button/PrimaryButton';

interface RegistrationProps {
  user: PrivyUser;
  onComplete: (data: Partial<OnboardingData>) => void;
  createPrivyWallets?: () => Promise<void>;
}

export default function Registration({
  user,
  onComplete,
}: RegistrationProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [birthdate, setBirthdate] = useState(0);
  const [apartment, setApartment] = useState('');
  const [address, setAddress] = useState('');
  const [profileImage, setProfileImage] = useState('1');
  const [profileImageUrl, setProfileImageUrl] = useState(
    '/images/user_avator/1.png?height=32&width=32'
  );
  const [walletData, setWalletData] = useState<WalletItem[]>([]);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] =
    useState(false);

  console.log('address', address);

  // Add wallet creation state management
  const [walletsCreated, setWalletsCreated] = useState({
    ethereum: false,
    solana: false,
  });

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { authenticated, ready, user: privyUser } = usePrivy();
  const { createWallet: createSolanaWallet } =
    useSolanaCreateWallet();

  const { createWallet } = useCreateWallet({
    onSuccess: ({ wallet }) => {
      logger.info('wallet', wallet);
    },
    onError: (error) => {
      logger.error('error', error);
    },
  });

  // Extract wallet data from Privy user
  useEffect(() => {
    if (authenticated && ready && privyUser) {
      const linkedWallets = privyUser?.linkedAccounts
        .map((item: any) => {
          if (item.chainType === 'ethereum') {
            return {
              address: item.address,
              isActive:
                item.walletClientType === 'privy' ||
                item.connectorType === 'embedded',
              isEVM: true,
              walletClientType: item.walletClientType,
            };
          } else if (item.chainType === 'solana') {
            return {
              address: item.address,
              isActive:
                item.walletClientType === 'privy' ||
                item.connectorType === 'embedded',
              isEVM: false,
              walletClientType: item.walletClientType,
            };
          }
          return null;
        })
        .filter(Boolean);

      setWalletData(linkedWallets as WalletItem[]);
    }
  }, [privyUser, authenticated, ready]);

  // Function to refresh wallet data
  const refreshWalletData = () => {
    if (authenticated && ready && privyUser) {
      const linkedWallets = privyUser?.linkedAccounts
        .map((item: any) => {
          if (item.chainType === 'ethereum') {
            return {
              address: item.address,
              isActive:
                item.walletClientType === 'privy' ||
                item.connectorType === 'embedded',
              isEVM: true,
              walletClientType: item.walletClientType,
            };
          } else if (item.chainType === 'solana') {
            return {
              address: item.address,
              isActive:
                item.walletClientType === 'privy' ||
                item.connectorType === 'embedded',
              isEVM: false,
              walletClientType: item.walletClientType,
            };
          }
          return null;
        })
        .filter(Boolean);

      setWalletData(linkedWallets as WalletItem[]);
    }
  };

  const createPrivyWallets = useCallback(async () => {
    try {
      logger.info('Starting wallet creation process...');

      // Add authentication checks
      if (!authenticated) {
        logger.error(
          'User is not authenticated - cannot create wallets'
        );
        return;
      }

      if (!ready) {
        logger.error('Privy is not ready - cannot create wallets');
        return;
      }

      if (!privyUser) {
        logger.error(
          'User object is not available - cannot create wallets'
        );
        return;
      }

      logger.info(
        `Authentication status: authenticated=${authenticated}, ready=${ready}, user=${!!privyUser}`
      );

      // Add a small delay to ensure authentication is fully propagated
      await new Promise((resolve) => setTimeout(resolve, 500));
      logger.info(
        'Authentication delay complete, proceeding with wallet creation...'
      );

      // Check if user already has wallets
      const hasEthereumWallet = privyUser?.linkedAccounts.some(
        (account: any) =>
          account.chainType === 'ethereum' &&
          (account.walletClientType === 'privy' ||
            account.connectorType === 'embedded')
      );

      const hasSolanaWallet = privyUser?.linkedAccounts.some(
        (account: any) =>
          account.chainType === 'solana' &&
          (account.walletClientType === 'privy' ||
            account.connectorType === 'embedded')
      );

      logger.info(
        `Wallet status check - Ethereum: ${hasEthereumWallet}, Solana: ${hasSolanaWallet}`
      );
      logger.info(
        `Wallets created state - Ethereum: ${walletsCreated.ethereum}, Solana: ${walletsCreated.solana}`
      );

      // Create Ethereum wallet if needed
      if (!hasEthereumWallet && !walletsCreated.ethereum) {
        try {
          logger.info('Attempting to create Ethereum wallet...');

          // Double-check authentication before wallet creation
          if (!authenticated || !ready || !privyUser) {
            logger.error(
              'Authentication state changed during wallet creation - aborting Ethereum wallet creation'
            );
            return;
          }

          const result = await createWallet().catch((error) => {
            // Handle embedded_wallet_already_exists as a success case
            if (
              error === 'embedded_wallet_already_exists' ||
              (error &&
                typeof error === 'object' &&
                'message' in error &&
                error.message === 'embedded_wallet_already_exists')
            ) {
              logger.info(
                'Ethereum wallet already exists, marking as created'
              );
              return { status: 'already_exists' };
            }
            logger.error(
              `Ethereum wallet creation error: ${JSON.stringify(
                error
              )}`
            );
            throw error;
          });

          logger.info(
            `Ethereum wallet creation result: ${JSON.stringify(
              result
            )}`
          );
          setWalletsCreated((prev) => ({ ...prev, ethereum: true }));
          logger.info('Ethereum wallet creation complete');
        } catch (err) {
          logger.error(
            `Ethereum wallet creation failed: ${JSON.stringify(err)}`
          );
          // Don't mark as created if there was a real error
        }
      } else {
        logger.info(
          'Skipping Ethereum wallet creation - already exists or already created'
        );
      }

      // Create Solana wallet if needed
      if (!hasSolanaWallet && !walletsCreated.solana) {
        try {
          logger.info('Attempting to create Solana wallet...');

          // Double-check authentication before wallet creation
          if (!authenticated || !ready || !privyUser) {
            logger.error(
              'Authentication state changed during wallet creation - aborting Solana wallet creation'
            );
            return;
          }

          const result = await createSolanaWallet().catch((error) => {
            if (
              error === 'embedded_wallet_already_exists' ||
              (error &&
                typeof error === 'object' &&
                'message' in error &&
                error.message === 'embedded_wallet_already_exists')
            ) {
              logger.info(
                'Solana wallet already exists, marking as created'
              );
              return { status: 'already_exists' };
            }
            logger.error(
              `Solana wallet creation error: ${JSON.stringify(error)}`
            );
            throw error;
          });

          logger.info(
            `Solana wallet creation result: ${JSON.stringify(result)}`
          );
          setWalletsCreated((prev) => ({ ...prev, solana: true }));
          logger.info('Solana wallet creation complete');
        } catch (err) {
          logger.error(
            `Solana wallet creation failed: ${JSON.stringify(err)}`
          );
        }
      } else {
        logger.info(
          'Skipping Solana wallet creation - already exists or already created'
        );
      }

      // Final status check
      logger.info(
        `Final wallet creation status: ${JSON.stringify(
          walletsCreated
        )}`
      );
    } catch (error) {
      logger.error(
        `Error in wallet creation flow: ${JSON.stringify(error)}`
      );
      // Still mark wallets as attempted to prevent infinite loops
      setWalletsCreated({ ethereum: true, solana: true });
    }
  }, [
    authenticated,
    ready,
    privyUser,
    createWallet,
    createSolanaWallet,
    walletsCreated,
  ]);

  // Auto-create wallets when user is authenticated
  useEffect(() => {
    if (
      authenticated &&
      ready &&
      privyUser &&
      (!walletsCreated.ethereum || !walletsCreated.solana)
    ) {
      logger.info('Auto-creating wallets on authentication...');
      createPrivyWallets().catch((error) => {
        logger.error('Auto wallet creation failed:', error);
      });
    }
  }, [
    authenticated,
    ready,
    privyUser,
    walletsCreated,
    createPrivyWallets,
  ]);

  const handleUserProfileModal = () => {
    onOpen();
    setIsUserProfileModalOpen(true);
  };

  // Handle avatar image selection
  const handleSelectImage = (image: any) => {
    setProfileImage(image);
    setProfileImageUrl(
      `/images/user_avator/${image}.png?height=32&width=32`
    );
  };

  // Handle custom image upload
  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      onOpenChange();
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
        setProfileImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Name is required.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create wallets first and wait for completion
      logger.info('Starting wallet creation in registration form...');
      await createPrivyWallets();

      // Add a small delay to ensure wallet data is updated
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Refresh wallet data after creation
      refreshWalletData();

      logger.info(
        'Wallet creation completed, proceeding with user registration...'
      );

      // Process profile image
      let avatarUrl = profileImage;
      if (profileImage && profileImage.startsWith('data:image')) {
        try {
          avatarUrl = await uploadImageToCloudinary(profileImage);
        } catch (error) {
          logger.error('Error uploading image to Cloudinary:', error);
          avatarUrl = '1'; // Default image if upload fails
        }
      }

      // Find wallet addresses
      const ethereumWallet = walletData.find(
        (wallet) => wallet?.isEVM
      );
      const solanaWallet = walletData.find(
        (wallet) => !wallet?.isEVM
      );

      logger.info('Wallet data for registration:', {
        walletData,
        ethereumWallet: ethereumWallet?.address,
        solanaWallet: solanaWallet?.address,
        walletsCreated,
      });

      // Format user data for API
      const userData = {
        name,
        email: user.email,
        mobileNo: phone || '',
        address: address?.label || '',
        bio: bio || '',
        dob: birthdate.toString(),
        profilePic: avatarUrl,
        apt: apartment || '',
        countryFlag: 'US',
        countryCode: 'US',
        privyId: privyUser?.id,
        ethereumWallet: ethereumWallet?.address,
        solanaWallet: solanaWallet?.address,
      };

      // Create user and smartsite using v4 signup endpoint
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: 'Unknown error' }));
        console.error('Registration error:', errorData);
        throw new Error(
          errorData.message || 'Failed to create user and smartsite'
        );
      }

      const result = await response.json();
      console.log('Registration success:', result);

      // Create wallet balance record
      const walletPayload = {
        ethAddress: ethereumWallet?.address,
        solanaAddress: solanaWallet?.address,
        userId: result.data._id,
      };

      console.log('Wallet payload:', walletPayload);
      //problem in this api
      try {
        await createWalletBalance(walletPayload);
      } catch (error) {
        console.error('Error creating wallet balance:', error);
      }

      toast({
        title: 'Success',
        description: 'Account has been created successfully!',
      });

      // Pass the data to parent component
      onComplete({
        userInfo: result.data,
      });
    } catch (error) {
      logger.error('Error creating account:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create Account. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto border-0 my-20">
      <div className=" bg-white rounded-xl shadow-medium">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-medium">
            Profile Information
          </CardTitle>
          <p className="text-xs text-gray-500">
            Input Below For AI SmartSite Build.
            <br />
            You Can Edit After Site Is Generated.
          </p>
        </CardHeader>
        <CardContent className="px-8">
          <div>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full mb-2 relative border">
                  <Image
                    src={profileImageUrl}
                    alt="Profile Picture"
                    width={240}
                    height={240}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <Label htmlFor="picture" className="cursor-pointer">
                  <div
                    onClick={handleUserProfileModal}
                    className="flex items-center space-x-2 bg-primary text-primary-foreground px-3 py-2 rounded-md"
                  >
                    <Upload size={16} />
                    <span>Upload Image</span>
                  </div>
                </Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="flex items-center space-x-2"
                  >
                    <p>
                      Name<span style={{ color: 'red' }}>*</span>
                    </p>
                  </Label>
                  <div className="relative w-full">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      <User className="h-4 w-4" />
                    </span>
                    <Input
                      id="name"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="pl-8 focus:!ring-1 !ring-gray-300"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="bio"
                    className="flex items-center space-x-2"
                  >
                    <p>Bio</p>
                  </Label>
                  <div className="relative w-full">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      <User2 className="h-4 w-4" />
                    </span>
                    <Input
                      id="bio"
                      placeholder="Enter your bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="pl-8 focus:!ring-1 !ring-gray-300"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="phone"
                    className="flex items-center space-x-2"
                  >
                    <p>
                      Phone Number
                      <span style={{ color: 'red' }}>*</span>
                    </p>
                  </Label>
                  <div className="relative w-full">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                    </span>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="pl-8 focus:!ring-1 !ring-gray-300"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="flex items-center space-x-2"
                  >
                    <p>
                      Email<span style={{ color: 'red' }}>*</span>
                    </p>
                  </Label>
                  <div className="relative w-full">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                    </span>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={user.email}
                      disabled
                      required
                      className="pl-8 focus:!ring-1 !ring-gray-300"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="birthdate"
                    className="flex items-center space-x-2"
                  >
                    <span>Birth Date</span>
                  </Label>
                  <div className="relative w-full">
                    <span
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground cursor-pointer"
                      onClick={() =>
                        (
                          document.getElementById(
                            'birthdate'
                          ) as HTMLInputElement
                        )?.showPicker()
                      }
                    >
                      <Calendar className="h-4 w-4" />
                    </span>
                    <Input
                      id="birthdate"
                      type="date"
                      value={
                        birthdate
                          ? new Date(birthdate)
                              .toISOString()
                              .split('T')[0]
                          : ''
                      }
                      onChange={(e) =>
                        setBirthdate(
                          new Date(e.target.value).getTime()
                        )
                      }
                      className="pl-8 appearance-none focus:ring-1 ring-gray-300 custom-date-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="address"
                    className="flex items-center space-x-2"
                  >
                    <span>Address 1</span>
                  </Label>
                  <div className="relative w-full">
                    <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                    </span>

                    <GooglePlacesAutocomplete
                      apiKey={
                        process.env
                          .NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || ''
                      }
                      selectProps={{
                        value: address,
                        onChange: setAddress as any,
                        placeholder: 'Enter address',
                        styles: {
                          control: (base, state) => ({
                            ...base,
                            paddingLeft: '1.35rem', // space for icon
                            // minHeight: "42px",
                            borderRadius: '0.5rem',
                            border: state.isFocused
                              ? '1px solid #edebeb' // focus (blue-600)
                              : '1px solid #edebeb',
                            boxShadow: state.isFocused
                              ? '1px solid #edebeb'
                              : 'none',
                            '&:hover': {
                              border: state.isFocused
                                ? '1px solid #edebeb'
                                : '1px solid #edebeb', // hover (gray-300)
                            },
                          }),
                          input: (base) => ({
                            ...base,
                            margin: 0,
                            padding: 0,
                          }),
                        },
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="apartment"
                  className="flex items-center space-x-2"
                >
                  <span>Address 2</span>
                </Label>
                <div className="relative w-full">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    <Building className="h-4 w-4" />
                  </span>
                  <Input
                    id="apartment"
                    type="text"
                    placeholder="Apt No"
                    value={apartment}
                    onChange={(e) => setApartment(e.target.value)}
                    className="pl-8 focus:!ring-1 !ring-gray-300"
                  />
                </div>
              </div>

              <div className="flex justify-center h-8 items-center">
                <PrimaryButton
                  className="w-1/4"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader
                      size={20}
                      color="black"
                      className="animate-spin"
                    />
                  ) : (
                    'Save'
                  )}
                </PrimaryButton>
              </div>
            </form>
          </div>
          {isUserProfileModalOpen && (
            <SelectAvatorModal
              isOpen={isOpen}
              onOpenChange={onOpenChange}
              images={userProfileImages}
              onSelectImage={handleSelectImage}
              setIsModalOpen={setIsUserProfileModalOpen}
              handleFileChange={handleImageUpload}
            />
          )}
        </CardContent>
      </div>
    </div>
  );
}
