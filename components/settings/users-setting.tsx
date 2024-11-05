'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Upload,
  Building,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function Settings() {
  const [profileImage, setProfileImage] = useState(
    '/assets/images/avatar.png?height=120&width=120'
  );

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">
            Parent Profile
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            This Is Your Account Profile Used To Manage The Swop
            Ecosystem
          </p>

          <form className="space-y-6">
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
                <Label htmlFor="name">Name*</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    className="pl-9"
                    defaultValue="Raihan Ali"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number*</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    className="pl-9"
                    defaultValue="+880 12345678"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="bio"
                    className="pl-9"
                    defaultValue="Business Analysis"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthdate">Birth Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="birthdate"
                    type="date"
                    className="pl-9"
                    defaultValue="1997-06-15"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email*</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-9"
                    defaultValue="raihana@gmail.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">
                  Address (Shopping Delivery Address)
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="address"
                    className="pl-9"
                    defaultValue="Aftabnagar, Dhaka, Bangladesh"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" className="px-10">
                Save
              </Button>
              <Button
                type="button"
                variant="outline"
                className="px-10"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
        <div className="border-t my-10"></div>
        <Card className="border-none ">
          <CardContent className="">
            <h3 className="text-lg font-semibold mb-4">
              Delete my account
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Do you want to downgrade instead?{' '}
              <Link
                href="#"
                className="text-blue-600 hover:underline"
              >
                Manage Subscriptions
              </Link>
            </p>
            <Button variant="destructive">Delete my account</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
