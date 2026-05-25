import { ReactNode } from "react";
import { MicrositeProvider } from "./context/MicrositeContext";
import { getUserData } from "@/actions/user";
import QueryProvider from "@/components/provider/QueryProvider";

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ username: string }>;
}

export default async function Layout({ children, params }: LayoutProps) {
  const userName = (await params)?.username;
  const { data } = await getUserData(userName);

  return (
    <QueryProvider>
      <MicrositeProvider micrositeData={data?.microsite ?? null}>
        {children}
      </MicrositeProvider>
    </QueryProvider>
  );
}
