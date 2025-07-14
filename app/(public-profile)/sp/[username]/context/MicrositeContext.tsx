'use client';

import { createContext, useContext, ReactNode } from 'react';

interface MicrositeData {
  _id: string;
  name: string;
  bio: string;
  profilePic: string;
  backgroundImg: string | number;
  info: any;
  gatedAccess: boolean;
  direct: boolean;
  parentId: string;
  gatedInfo: any;
  theme: boolean;
  ens: string;
  showFeed?: boolean;
  redirect?: string;
  username?: string;
}

interface MicrositeContextType {
  micrositeData: MicrositeData | null;
}

const MicrositeContext = createContext<MicrositeContextType>({
  micrositeData: null,
});

export const useMicrositeData = () => {
  const context = useContext(MicrositeContext);
  if (!context) {
    throw new Error(
      'useMicrositeData must be used within a MicrositeProvider'
    );
  }
  return context;
};

interface MicrositeProviderProps {
  children: ReactNode;
  micrositeData: MicrositeData;
}

export function MicrositeProvider({
  children,
  micrositeData,
}: MicrositeProviderProps) {
  return (
    <MicrositeContext.Provider value={{ micrositeData }}>
      {children}
    </MicrositeContext.Provider>
  );
}
