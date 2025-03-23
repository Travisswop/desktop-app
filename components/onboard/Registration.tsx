'use client';

import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { PrivyUser, OnboardingData } from '@/lib/types';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { useToast } from '@/hooks/use-toast';
import astronot from '@/public/onboard/astronot.svg';
import blackPlanet from '@/public/onboard/black-planet.svg';
import yellowPlanet from '@/public/onboard/yellow-planet.svg';
import editIcon from '@/public/images/websites/edit-icon.svg';
import { useDisclosure } from '@nextui-org/react';
import userProfileImages from '../util/data/userProfileImage';
import SelectAvatorModal from '../modal/SelectAvatorModal';
import { usePrivy } from '@privy-io/react-auth';
import { WalletItem } from '@/types/wallet';
import { createWalletBalance } from '@/actions/createWallet';
interface RegistrationProps {
  user: PrivyUser;
  onComplete: (data: Partial<OnboardingData>) => void;
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
  const [profileImage, setProfileImage] = useState('0');
  const [profileImageUrl, setProfileImageUrl] = useState(
    '/images/user_avator/0.png?height=32&width=32'
  );
  const [walletData, setWalletData] = useState<WalletItem[]>([]);

  const [isUserProfileModalOpen, setIsUserProfileModalOpen] =
    useState(false);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { authenticated, ready, user: PrivyUser } = usePrivy();
  console.log('privyuser', PrivyUser);
  console.log('walletData', walletData);

  useEffect(() => {
    if (authenticated && ready && PrivyUser) {
      const linkWallet = PrivyUser?.linkedAccounts
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

      setWalletData(linkWallet as WalletItem[]);
    }
  }, [PrivyUser, authenticated, ready]);

  // Fetch the base64 image when the component mounts

  // useEffect(() => {
  //   const fetchAvatar = async () => {
  //     const base64Image = await getBase64Image(profileImage);
  //     setProfileImage(base64Image);
  //   };
  //   fetchAvatar();
  // }, [profileImage]);

  const handleUserProfileModal = () => {
    onOpen();
    setIsUserProfileModalOpen(true);
  };

  // image upload for user profile
  const handleSelectImage = (image: any) => {
    setProfileImage(image);
    setProfileImageUrl(
      `/images/user_avator/${image}.png?height=32&width=32`
    );
  };

  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
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
      alert('Name is required.');
      return; // Prevent form submission
    }
    setIsSubmitting(true);

    try {
      let avatarUrl = profileImage;

      if (profileImage && profileImage.startsWith('data:image')) {
        try {
          avatarUrl = await uploadImageToCloudinary(profileImage);
        } catch (error) {
          avatarUrl = '0';
        }
      }

      const ethereumWallet = walletData.find(
        (wallet) => wallet?.isEVM
      );
      const solanaWallet = walletData.find(
        (wallet) => !wallet?.isEVM
      );
      // console.log("ethereumWallet", ethereumWallet);
      // console.log("solanaWallet", solanaWallet);

      const formatData = {
        name,
        email: user.email,
        mobileNo: phone || '',
        address: address || '',
        bio: bio || '',
        dob: birthdate.toString(),
        profilePic: avatarUrl,
        apt: apartment || '',
        countryFlag: 'US',
        countryCode: 'US',
        // privyId: PrivyUser?.id,
        // ethereumWallet: ethereumWallet && ethereumWallet.address, // Ethereum Wallet Address
        // solanaWallet: solanaWallet && solanaWallet.address, // Solana Wallet Address
      };

      // Create user and smartsite
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...formatData }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create user and smartsite');
      }

      const result = await response.json();

      toast({
        title: 'Success',
        description: 'Account has been created successfully!',
      });

      // Pass the data to parent component
      onComplete({
        userInfo: result.data,
      });
      const payload = {
        ethAddress: ethereumWallet?.address,
        solanaAddress: solanaWallet?.address,
        userId: result.data._id,
      };

      console.log('payload for wallet', payload);

      const walletResponse = await createWalletBalance(payload);
      console.log('respnse for wallet', walletResponse);
    } catch (error) {
      setIsSubmitting(false);
      console.error('Error creating account:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create Account. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  console.log('walletdata', walletData);

  return (
    <div className="relative w-full max-w-3xl mx-auto border-0 my-20">
      {/* <div className="bg-gradient-to-br from-purple-200 to-blue-300 w-52 h-52 rounded-full absolute -bottom-32 -left-16 -z-10 opacity-80"></div> */}
      <div className="absolute -top-28 left-0">
        <Image
          src={astronot}
          alt="astronot image"
          className="w-40 h-auto"
        />
      </div>
      <div className="absolute -bottom-28 -left-10">
        <Image
          src={blackPlanet}
          alt="astronot image"
          className="w-48 h-auto"
        />
      </div>

      <div className="bg-gradient-to-br from-purple-200 to-blue-300 w-52 h-52 rounded-full absolute bottom-32 left-16 z-0 opacity-80"></div>
      <div className="backdrop-blur-[50px] bg-white bg-opacity-25 shadow-uniform rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Profile Information
          </CardTitle>
          <p className="text-xs">
            Input Below For AI SmartSite Build.
            <br />
            You Can Edit After Site Is Generated.
          </p>
        </CardHeader>
        <CardContent className="px-8">
          <div>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full  mb-2 relative">
                  <Image
                    src={profileImageUrl}
                    alt="Profile Picture"
                    width={80}
                    height={80}
                    className="w-full h-full object-cover rounded-full"
                  />
                  <button
                    className="absolute right-0 bottom-0 w-8 h-8 z-50"
                    onClick={handleUserProfileModal}
                    type="button"
                  >
                    <Image
                      alt="edit icon"
                      src={editIcon}
                      width={40}
                    />
                  </button>
                </div>
                <Label htmlFor="picture" className="cursor-pointer">
                  <div className="flex items-center space-x-2 bg-primary text-primary-foreground px-3 py-2 rounded-md">
                    <Upload size={16} />
                    <span>Upload Image</span>
                  </div>
                  <Input
                    id="picture"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
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
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <Input
                      id="address"
                      type="text"
                      placeholder="Enter your address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="pl-8 focus:!ring-1 !ring-gray-300"
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
                    placeholder="Enter your apartment number"
                    value={apartment}
                    onChange={(e) => setApartment(e.target.value)}
                    className="pl-8 focus:!ring-1 !ring-gray-300"
                  />
                </div>
              </div>

              <div className="flex justify-center col-span-2">
                <Button
                  className="bg-black text-white w-1/4 hover:bg-gray-800"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Next'}
                </Button>
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
              // handleFileChange={handleFileChange}
            />
          )}
        </CardContent>
      </div>
    </div>
  );
}
