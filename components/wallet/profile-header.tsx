'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { Button } from '../ui/button';

interface ProfileHeaderProps {
  name: string;
  username: string;
  imageUrl: string;
  points: number;
}

export default function ProfileHeader({
  name,
  username,
  imageUrl,
  points = 31234,
}: ProfileHeaderProps) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <Card className="w-full max-w-sm">
      <CardHeader></CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Image
              src={imageUrl}
              alt={name}
              width={80}
              height={80}
              className="rounded-full"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{name}</h1>
            </div>
            <p className="text-sm font-bold text-muted-foreground">
              {username}
            </p>
          </div>
        </div>

        {/* Swopple Points Section */}
        <div className="mt-6">
          <div
            className="relative w-full aspect-square max-w-[200px] mx-auto cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Animated Background Ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 via-pink-400  to-red-500 animate-spin-slow opacity-20"></div>

            {/* Main Circle */}
            <div
              className="absolute inset-2 rounded-full bg-white shadow-lg flex flex-col items-center justify-center transition-transform duration-300"
              style={{
                transform: isHovered ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse mb-2" />
              <p className="text-sm text-gray-600">
                My Swopple Points
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {points.toLocaleString()}
                </span>
              </div>

              {/* Hover Effect */}
              {isHovered && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs text-purple-600 hover:text-purple-700"
                >
                  View History
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
