"use client";
import Header from "@/components/Header";
import Sidenav from "@/components/Sidenav";
// import { withAuth } from '@/lib/withAuth';

const PageLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen">
      <Sidenav />
      <Header />
      <div className="pl-64">
        <main className="container mx-auto p-6 max-w-7xl 2xl:max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
};

// export default withAuth(PageLayout);
export default PageLayout;
