'use client';
import Image from 'next/image';
import { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { cn } from '@/lib/utils';

interface AppIcon {
  network: string;
  name: string;
  gradient: string;
  borderColor: string;
  imageUrl: string;
}

const apps: AppIcon[] = [
  {
    network: 'SOLANA',
    name: 'Solana',
    gradient: 'bg-gradient-to-br from-slate-700 to-slate-950',
    borderColor: 'border-emerald-700',
    imageUrl: '/assets/icons/solana.png',
  },
  {
    network: 'ETHEREUM',
    name: 'Ethereum',
    gradient: 'bg-gradient-to-br from-gray-200 to-slate-600',
    borderColor: 'border-slate-700',
    imageUrl: '/assets/icons/ethereum.png',
  },
  {
    network: 'POLYGON',
    name: 'Polygon',
    gradient: 'bg-gradient-to-br from-slate-200 to-slate-300',
    borderColor: 'border-purple-700',
    imageUrl: '/assets/icons/polygon.png',
  },
  {
    network: 'BASE',
    name: 'Base',
    gradient: 'bg-gradient-to-br from-blue-100 to-blue-600',
    borderColor: 'border-blue-700',
    imageUrl: '/assets/icons/base.png',
  },
];
type Network = 'ETHEREUM' | 'POLYGON' | 'BASE' | 'SOLANA';
interface NetworkProps {
  network: string;
  setNetwork: (network: Network) => void;
}

export default function NetworkDock({
  network,
  setNetwork,
}: NetworkProps) {
  const [selectedApp, setSelectedApp] = useState<string>(network);
  console.log('network', network);
  const handleChange = (value: Network) => {
    setSelectedApp(value);
    setNetwork(value);
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 w-16  flex flex-col items-center justify-center gap-4 p-2">
      <TooltipProvider>
        {apps.map((app) => (
          <Tooltip key={app.network}>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleChange(app.network as Network)}
                className={cn(
                  'relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 hover:scale-110',
                  app.gradient,
                  selectedApp === app.network && 'scale-110'
                )}
              >
                {selectedApp === app.network && (
                  <>
                    <div
                      className={cn(
                        'absolute -inset-1 rounded-2xl opacity-60',
                        app.borderColor,
                        'border-2'
                      )}
                    />
                  </>
                )}
                <Image
                  src={app.imageUrl}
                  alt="ETH Icons"
                  height={25}
                  width={25}
                  className="h-6 w-6"
                />
                <span className="sr-only">{app.name}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="left"
              sideOffset={10}
              className="bg-gray-800 text-white border-gray-700 relative"
            >
              <div className="absolute left-0 top-1/2 w-2 h-2 bg-gray-800 rotate-45" />
              {app.name}
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
}
