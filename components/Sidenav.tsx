'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Newspaper,
  LayoutGrid,
  QrCode,
  Wallet,
  BarChart2,
  Coins,
  ShoppingCart,
  FileText,
  LogOut,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/feed', label: 'Feed', icon: Newspaper },
  { href: '/smartsite', label: 'Smartsites', icon: LayoutGrid },
  { href: '/qrcode', label: 'QR Code', icon: QrCode },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/mint', label: 'Mint', icon: Coins },
  { href: '/order', label: 'Orders', icon: ShoppingCart },
  { href: '/content', label: 'Content', icon: FileText },
];

export default function Sidenav({
  className,
}: {
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      className={cn('flex flex-col h-full bg-background', className)}
    >
      <ul className="flex-1 px-2 py-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
                  pathname === item.href
                    ? 'bg-fuchsia-800/10 text-primary'
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
      <div className="px-2 py-2">
        <div className="rounded-lg bg-accent/50 p-4 mb-2">
          <div className="flex items-center justify-between mb-2">
            <ShoppingCart className="h-4 w-4" />
          </div>
          <h3 className="font-semibold mb-1">
            Unlock Unlimited Access
          </h3>
          <p className="text-xs text-muted-foreground mb-2">
            Free NFC with a yearly subscription
          </p>
          <div className="flex items-center justify-between text-xs">
            <button className="text-muted-foreground hover:text-foreground">
              Dismiss
            </button>
            <button className="text-primary hover:text-primary/90 font-medium">
              Upgrade Plan
            </button>
          </div>
        </div>
        <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground">
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </nav>
  );
}
