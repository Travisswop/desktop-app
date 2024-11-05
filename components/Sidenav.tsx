'use client';

import Link from 'next/link';

import {
  QrCode,
  Wallet,
  BarChart2,
  FileText,
  LogOut,
  ShoppingBag,
  ImageIcon,
  LayoutDashboard,
  Newspaper,
  LayoutGrid,
} from 'lucide-react';
import { Button } from './ui/button';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/feed', label: 'Feed', icon: Newspaper },
  { href: '/smartsite', label: 'Smartsites', icon: LayoutGrid },
  { href: '/qrcode', label: 'QR Code', icon: QrCode },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/mint', label: 'Mint', icon: ImageIcon },
  { href: '/order', label: 'Orders', icon: ShoppingBag },
  { href: '/content', label: 'Content', icon: FileText },
];

export default function Sidenav() {
  const pathname = usePathname();
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white">
      <div className="flex h-full flex-col">
        <div className="flex h-20 items-center border-b px-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-4xl mx-auto font-bold tracking-widest"
          >
            SWOP
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4">
          <ul className="flex-1 px-2 py-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100',
                      pathname === item.href
                        ? 'bg-fuchsia-800/10 text-purple-600'
                        : 'text-muted-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t p-4">
          <div className="mb-4 rounded-lg bg-purple-50 p-4">
            <h5 className="mb-2 text-sm font-medium">
              Unlock Unlimited Access
            </h5>
            <p className="mb-3 text-xs text-gray-500">
              Free NFTs with a yearly subscription
            </p>
            <Button
              size="sm"
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Upgrade Plan
            </Button>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-gray-500"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </Button>
        </div>
      </div>
    </aside>
  );
}
