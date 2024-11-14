"use client";

import { usePrivy, useLogin } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import RotateEarth from "@/components/rotating-earth";

const Login: React.FC = () => {
  const { ready, authenticated, getAccessToken } = usePrivy();

  const router = useRouter();
  const loginInitiated = useRef(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useLogin({
    onComplete: async (user) => {
      console.log("🚀 ~ onComplete: ~ user:", user);
      const email =
        user.google?.email ||
        user.email?.address ||
        user.linkedAccounts.find((account) => account.type === "email")
          ?.address ||
        user.linkedAccounts.find((account) => account.type === "google_oauth")
          ?.email;

      if (!email) {
        console.log("No email found, redirecting to onboard");
        loginInitiated.current = false;
        router.push("/onboard");
        return;
      }

      try {
        const token = await getAccessToken();
        const response = await fetch("/api/auth/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: email,
            userId: user.id,
          }),
        });

        console.log("Verify response:", response.status);

        if (!response.ok) {
          console.log("User not found, redirecting to onboard");
          loginInitiated.current = false;
          router.push("/onboard");
          return;
        }

        console.log("User found, redirecting to home");
        router.push("/");
      } catch (error) {
        console.error("Error verifying user:", error);
        loginInitiated.current = false;
        router.push("/onboard");
      } finally {
        setIsLoading(false);
      }
    },
    onError: (error) => {
      console.error("Login error:", error);
      loginInitiated.current = false;
      setIsLoading(false);
    },
  });

  useEffect(() => {
    if (ready && !authenticated && !loginInitiated.current) {
      loginInitiated.current = true;
      handleLogin();
    }
  }, [ready, authenticated]);

  const handleLogin = () => {
    setIsLoading(true);
    login();
  };

  console.log(ready, authenticated);

  if (!ready) {
    return <LoginSkeleton />;
  }

  if (isLoading || ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RotateEarth />
      </div>
    );
  }
};

function LoginSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-4" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default Login;
