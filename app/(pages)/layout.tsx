'use client';
import Header from '@/components/Header';
import Sidenav from '@/components/Sidenav';
const PageLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen">
      <Sidenav />
      <Header />
      <div className="pl-64">
        <main className="container mx-auto p-10 max-w-7xl">
          {children}
        </main>
      </div>
    </div>
  );
};

// export default withAuth(PageLayout);
export default PageLayout;
