'use client';

import { withAuth } from '@/lib/withAuth';
import DashboardContent from '@/components/dashboard/DashboardContent';
import Header from '@/components/Header';
import Sidenav from '@/components/Sidenav';
import { UserProvider } from '@/lib/UserContext';
function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1">
        <Sidenav className="w-1/5" />
        <main className="w-4/5 p-4 bg-accent">
          <UserProvider>
            <DashboardContent />
          </UserProvider>
        </main>
      </div>
    </div>
  );
}

export default withAuth(DashboardPage);
