"use client";

import { createContext, useContext, ReactNode } from "react";
import type { SmartsiteTab } from "@/lib/smartsite-template-order";

interface MicrositeData {
  _id: string;
  name: string;
  bio: string;
  profilePic: string;
  backgroundImg?: string | number;
  backgroundColor?: string;
  fontColor?: string;
  secondaryFontColor?: string;
  fontFamily?: string;
  info: any;
  gatedAccess: boolean;
  direct: boolean;
  parentId: string;
  gatedInfo: any;
  theme: boolean;
  ens: string;
  showFeed?: boolean;
  templateOrder?: string[];
  tabs?: SmartsiteTab[];
  /** Templates pinned above the tab bar (visible on every tab). */
  pinnedOrder?: string[];
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
    throw new Error("useMicrositeData must be used within a MicrositeProvider");
  }
  return context;
};

interface MicrositeProviderProps {
  children: ReactNode;
  micrositeData: MicrositeData | null;
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
