'use client';

// import { withAuth } from '@/lib/withAuth';
import DashboardContent from '@/components/dashboard/DashboardContent';
import Header from '@/components/Header';
import Sidenav from '@/components/Sidenav';
function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-100/40">
      <Sidenav />
      <Header />
      <div className="pl-64">
        <main className="p-6 bg-accent">
          <DashboardContent />
        </main>
      </div>
    </div>
  );
}

// export default withAuth(DashboardPage);
export default DashboardPage;
