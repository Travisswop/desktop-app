'use client';

import { usePrivy } from '@privy-io/react-auth';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/lib/UserContext';
import { Skeleton } from './ui/skeleton';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { logout } = usePrivy();
  const { user, loading, clearCache } = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Clear user cache first
      clearCache();

      // Call logout API
      const res = await fetch(`/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        // Finally, logout from Privy
        await logout();
        router.replace('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <header className="bg-white shadow-md p-6 flex justify-between items-center">
        <Link href="/dashboard">
          <Image src="/logo.png" alt="Logo" width={120} height={50} />
        </Link>
        <Skeleton className="h-14 w-48 rounded-full" />
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 h-20 items-center  border-b bg-white px-4 flex justify-end">
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative flex items-center gap-2 px-3 py-4 rounded-full bg-slate-100 hover:bg-accent h-14"
            >
              <div className="relative h-8 w-8">
                <Image
                  src={
                    user.profilePic?.includes('https')
                      ? user.profilePic
                      : `/assets/avatar/${user.profilePic}.png`
                  }
                  alt={`${user.name}'s avatar`}
                  fill
                  className="rounded-full object-cover"
                />
              </div>
              <span className="text-sm font-medium">{user.name}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onSelect={() => {
                router.replace('/account-billing');
              }}
            >
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleLogout}>
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
