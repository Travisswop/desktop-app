'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Upload,
  User,
  Phone,
  Mail,
  Calendar,
  Building,
  MapPin,
} from 'lucide-react';
import { PrivyUser, OnboardingData } from '@/lib/types';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { getBase64Image } from '@/utils/imageHelpers';
import { usePrivy } from '@privy-io/react-auth';
import { useToast } from '@/hooks/use-toast';

interface RegistrationProps {
  user: PrivyUser;
  onComplete: (data: Partial<OnboardingData>) => void;
}

export default function Registration({
  user,
  onComplete,
}: RegistrationProps) {
  console.log('user', user);
  const { getAccessToken } = usePrivy();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [birthdate, setBirthdate] = useState(0);
  const [apartment, setApartment] = useState('');
  const [address, setAddress] = useState('');
  const [profileImage, setProfileImage] = useState(
    '/assets/images/avatar.png?height=32&width=32'
  );

  // Fetch the base64 image when the component mounts
  useEffect(() => {
    const fetchAvatar = async () => {
      const base64Image = await getBase64Image(profileImage);
      setProfileImage(base64Image);
    };
    fetchAvatar();
  }, []);

  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
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
      const avatarUrl = await uploadImageToCloudinary(profileImage);
      const token = await getAccessToken();

      // Create user and smartsite
      const response = await fetch('/api/user/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          bio,
          phone,
          email: user.email,
          birthdate,
          apartment,
          address,
          avatar: avatarUrl,
        }),
      });

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

  return (
    <Card className="w-full max-w-3xl mx-auto bg-gradient-to-br from-blue-50 to-white">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">
          Profile Information
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Input Below For AI SmartSite Build.
          <br />
          You Can Edit After Site Is Generated.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full overflow-hidden mb-2">
              <Image
                src={profileImage}
                alt="Profile Picture"
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
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
                <User size={16} />
                <span>Name*</span>
              </Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="bio"
                className="flex items-center space-x-2"
              >
                <User size={16} />
                <span>Bio</span>
              </Label>
              <Input
                id="bio"
                placeholder="Enter your bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="phone"
                className="flex items-center space-x-2"
              >
                <Phone size={16} />
                <span>Phone Number</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="flex items-center space-x-2"
              >
                <Mail size={16} />
                <span>Email*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={user.email}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="birthdate"
                className="flex items-center space-x-2"
              >
                <Calendar size={16} />
                <span>Birth Date</span>
              </Label>
              <Input
                id="birthdate"
                type="date"
                value={
                  birthdate
                    ? new Date(birthdate).toISOString().split('T')[0]
                    : ''
                }
                onChange={(e) =>
                  setBirthdate(new Date(e.target.value).getTime())
                }
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="apartment"
                className="flex items-center space-x-2"
              >
                <Building size={16} />
                <span>Apartment</span>
              </Label>
              <Input
                id="apartment"
                placeholder="Enter your apartment number"
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="address"
              className="flex items-center space-x-2"
            >
              <MapPin size={16} />
              <span>Address (Shopping Delivery Address)</span>
            </Label>
            <Input
              id="address"
              placeholder="Enter your address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
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
      </CardContent>
    </Card>
  );
}
