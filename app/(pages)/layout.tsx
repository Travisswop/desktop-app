import Header from "@/components/Header";
import Sidenav from "@/components/Sidenav";
import { SidebarProvider } from "@/components/ui/sidebar";

const PageLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div id="emoji-portal-root" className="min-h-screen ">
      <SidebarProvider>
        <Sidenav />
        <div className="flex flex-col w-full">
          <Header />
          <main className="container mx-auto px-6 py-6 max-w-7xl 2xl:max-w-full">
            {children}
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default PageLayout;
