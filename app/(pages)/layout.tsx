import Header from '@/components/Header';
import BottomNavContent from '@/components/nav/BottomNavContent';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Suspense } from 'react';
import { WalletProvider } from '@/providers/SyncedWalletProvider';
import { NotificationProvider } from '@/lib/context/NotificationContext';
import { SocketChatProvider } from '@/lib/context/NewSocketChatContext';

const PageLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <WalletProvider>
      <NotificationProvider>
        <SocketChatProvider>
            <div id="emoji-portal-root" className="flex flex-col">
              <SidebarProvider>
                {/* <Sidenav /> */}
                <div className="flex flex-col w-full">
                  <Header />
                  <main className="p-6 flex-1 w-full bg-white">
                    {children}
                  </main>
                  {/* use suspense to solve searchParams error update */}
                  <Suspense fallback={''}>
                    <BottomNavContent />
                  </Suspense>
                </div>
              </SidebarProvider>
            </div>
        </SocketChatProvider>
      </NotificationProvider>
    </WalletProvider>
  );
};

export default PageLayout;
