import Header from "@/components/Header";
import Sidenav from "@/components/Sidenav";

const PageLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div id="emoji-portal-root" className="min-h-screen ">
      <Sidenav />
      <Header />
      <div className="pl-64">
        <main className="container mx-auto px-6 py-6 max-w-7xl 2xl:max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
};

export default PageLayout;
