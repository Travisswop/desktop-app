import Header from '@/components/Header';
import BottomNavContent from '@/components/nav/BottomNavContent';
import DesktopNavContent from '@/components/nav/DesktopNavContent';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Suspense } from 'react';
import { WalletProvider } from '@/providers/SyncedWalletProvider';
import { NotificationProvider } from '@/lib/context/NotificationContext';
import { SocketChatProvider } from '@/lib/context/NewSocketChatContext';
import AuthGuard from '@/components/AuthGuard';

const PageLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthGuard>
      <WalletProvider>
        <NotificationProvider>
          <SocketChatProvider>
            <div id="emoji-portal-root" className="min-h-screen bg-[#F6F7F9]">
              <SidebarProvider>
                {/* <Sidenav /> */}
                <div className="flex min-h-screen w-full flex-col">
                  <Header />
                  <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-6 px-4 py-4 pb-28 lg:px-6 lg:pb-6">
                    <DesktopNavContent />
                    <main className="min-w-0 flex-1 bg-white p-4 shadow-small sm:p-6 lg:rounded-2xl lg:p-8">
                      {children}
                    </main>
                  </div>
                  {/* use suspense to solve searchParams error update */}
                  <div className="lg:hidden">
                    <Suspense fallback={''}>
                      <BottomNavContent />
                    </Suspense>
                  </div>
                </div>
              </SidebarProvider>
            </div>
          </SocketChatProvider>
        </NotificationProvider>
      </WalletProvider>
    </AuthGuard>
  );
};

export default PageLayout;
