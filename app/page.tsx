import DashboardContent from '@/components/dashboard/DashboardContent';
import Header from '@/components/Header';
import Sidenav from '@/components/Sidenav';
function DashboardPage() {
  return (
    <div className="min-h-screen">
      <Sidenav />
      <Header />
      <div className="pl-64">
        <main className="container mx-auto px-6 pt-6 max-w-7xl 2xl:max-w-full">
          <DashboardContent />
        </main>
      </div>
    </div>
  );
}

export default DashboardPage;
