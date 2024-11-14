"use client";

// import { withAuth } from '@/lib/withAuth';
import DashboardContent from "@/components/dashboard/DashboardContent";
import Header from "@/components/Header";
import Sidenav from "@/components/Sidenav";
function DashboardPage() {
  return (
    <div className="min-h-screen">
      <Sidenav />
      <Header />
      <div className="pl-64">
        <main className="container mx-auto p-6 max-w-7xl 2xl:max-w-full">
          <DashboardContent />
        </main>
      </div>
    </div>
  );
}

// export default withAuth(DashboardPage);
export default DashboardPage;
