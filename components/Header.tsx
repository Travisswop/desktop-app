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

export default function Header() {
  const { user, logout } = usePrivy();
  // const [isOpen, setIsOpen] = useState(false);

  const userName = 'Travis Herron';
  const avatarUrl = '/avatar.png';

  const handleLogout = async () => {
    const res = await fetch(`/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (res.ok) {
      logout();
    }
  };
  return (
    <header className="bg-white shadow-md p-6 flex justify-between items-center">
      <Link href="/dashboard">
        <Image src="/logo.png" alt="Logo" width={120} height={50} />
      </Link>
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative flex items-center gap-2 px-3 py-4 rounded-full bg-slate-100 hover:bg-accent h-14"
            >
              <div className="relative h-8 w-8">
                <Image
                  src={avatarUrl}
                  alt={`${userName}'s avatar`}
                  fill
                  className="rounded-full object-cover"
                />
              </div>
              <span className="text-sm font-medium">{userName}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onSelect={() => {
                /* Handle settings */
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
