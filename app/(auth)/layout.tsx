import { Toaster } from "@/components/ui/toaster";
import { Roboto } from "next/font/google";

// If loading a variable font, you don't need to specify the font weight
const roboto = Roboto({
  weight: ["100", "300", "400", "500", "700", "900"],
  subsets: ["latin"],
  display: "swap",
});

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // <html lang="en" className={roboto.className}>
    //   <body>
    <div className="flex items-center justify-center min-h-screen bg-white font-[figTree]">
      {children}
      <Toaster />
    </div>
    //   </body>
    // </html>
  );
}
