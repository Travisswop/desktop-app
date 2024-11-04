'use client';
import Header from '@/components/Header';
import Sidenav from '@/components/Sidenav';
import { withAuth } from '@/lib/withAuth';

const PageLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1">
        <Sidenav className="w-1/5" />
        <main className="w-4/5 p-4 bg-accent">{children}</main>
      </div>
    </div>
  );
};

export default withAuth(PageLayout);
