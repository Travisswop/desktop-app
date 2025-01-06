import { XmtpProvider } from "@/lib/context/XmtpContext";

const PageLayout = ({ children }: { children: React.ReactNode }) => {
  return <XmtpProvider>{children}</XmtpProvider>;
};

export default PageLayout;
