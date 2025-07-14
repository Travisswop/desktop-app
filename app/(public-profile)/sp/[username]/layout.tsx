import { ReactNode } from 'react';
import { MicrositeProvider } from './context/MicrositeContext';
import { getUserData } from '@/actions/user';

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ username: string }>;
}

export default async function Layout({
  children,
  params,
}: LayoutProps) {
  const userName = (await params)?.username;
  const { data } = await getUserData(userName);

  return (
    <MicrositeProvider micrositeData={data.microsite}>
      {children}
    </MicrositeProvider>
  );
}
