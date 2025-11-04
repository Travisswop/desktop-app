import Header from "@/components/Header";
import BottomNavContent from "@/components/nav/BottomNavContent";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Suspense } from "react";

const PageLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div id="emoji-portal-root" className="flex flex-col">
      <SidebarProvider>
        {/* <Sidenav /> */}
        <div className="flex flex-col w-full">
          <Header />
          <main className="p-6 flex-1 w-full">{children}</main>
          {/* use suspense to solve searchParams error update */}
          <Suspense fallback={""}>
            <BottomNavContent />
          </Suspense>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default PageLayout;
