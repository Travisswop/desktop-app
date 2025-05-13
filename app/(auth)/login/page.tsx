"use client";

import { createLoginWalletBalance } from "@/actions/createWallet";
import Loader from "@/components/loading/Loader";
import { Card } from "@/components/ui/card";
import astronot from "@/public/onboard/astronot.svg";
import blackPlanet from "@/public/onboard/black-planet.svg";
import swopLogo from "@/public/swopLogo.png";
import { WalletItem } from "@/types/wallet";
import {
  useCreateWallet,
  useLoginWithEmail,
  useLogout,
  usePrivy,
} from "@privy-io/react-auth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoArrowLeft } from "react-icons/go";
import { LuArrowRight } from "react-icons/lu";
import { RiMailSendLine } from "react-icons/ri";
import Cookies from "js-cookie";

const Login: React.FC = () => {
  const { authenticated, ready, user } = usePrivy();

  const { logout } = useLogout();
  const router = useRouter();
  const loginInitiated = useRef(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [walletData, setWalletData] = useState<WalletItem[] | null>(null);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [activeModal, setActiveModal] = useState("email");
  const [checkEmailValidation, setCheckEmailValidation] = useState("");

  const otpLength = 6;
  const [otp, setOtp] = useState(new Array(otpLength).fill(""));
  const inputRefs = useRef<Array<HTMLInputElement | null>>(
    new Array(otpLength).fill(null)
  );

  // Handle typing in OTP fields
  const handleChange = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (value && index < otpLength - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace to move focus to previous field
  const handleKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle pasting OTP
  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasteData = event.clipboardData
      .getData("text")
      .slice(0, otpLength)
      .split("");
    if (pasteData.some((char) => isNaN(Number(char)))) return;

    setOtp([...pasteData, ...new Array(otpLength - pasteData.length).fill("")]);

    pasteData.forEach((char, index) => {
      if (inputRefs.current[index]) {
        inputRefs.current[index]!.value = char;
      }
    });

    inputRefs.current[Math.min(pasteData.length, otpLength - 1)]?.focus();
  };

  // Memoize wallet data transformation
  const processWalletData = useCallback((user: any) => {
    return user?.linkedAccounts
      .map((item: any) => {
        if (item.chainType === "ethereum") {
          return {
            address: item.address,
            isActive:
              item.walletClientType === "privy" ||
              item.connectorType === "embedded",
            isEVM: true,
            walletClientType: item.walletClientType,
          };
        } else if (item.chainType === "solana") {
          return {
            address: item.address,
            isActive:
              item.walletClientType === "privy" ||
              item.connectorType === "embedded",
            isEVM: false,
            walletClientType: item.walletClientType,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, []);

  // Memoize email extraction
  const extractEmail = useCallback((user: any) => {
    return (
      user.google?.email ||
      user.email?.address ||
      user.linkedAccounts.find((account: any) => account.type === "email")
        ?.address ||
      user.linkedAccounts.find(
        (account: any) => account.type === "google_oauth"
      )?.email
    );
  }, []);

  // Memoize API URL
  const apiUrl = useMemo(
    () => `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/`,
    []
  );

  const { createWallet } = useCreateWallet({
    onSuccess: ({ wallet }: any) => {
      console.log("Created wallet ", wallet);
    },
    onError: (error) => {
      console.error("Failed to create wallet with error ", error);
    },
  });

  const handleUserVerification = useCallback(
    async (user: any) => {
      try {
        setIsLoading(true);
        const email = extractEmail(user);
        if (!email) {
          router.push("/onboard");
          return;
        }

        const response = await fetch(`${apiUrl}${email}`, {
          headers: { "Content-Type": "application/json" },
        });

        const data = await response.json();

        if (!response.ok) {
          console.log("hit error");

          await createWallet();
          router.push("/onboard");
          return;
        }

        // if (data && data?.user && data?.user?._id) {
        //   Cookies.set("user-id", data?.user?._id, {
        //     secure: true,
        //     sameSite: "strict",
        //     maxAge: 60 * 60 * 24 * 7, // 7 days
        //     path: "/",
        //   });
        // }

        if (data?.user?._id) {
          Cookies.set("user-id", data?.user?._id.toString());
        }

        const payload = {
          userId: data.user._id,
          ethAddress: walletData?.find((wallet) => wallet?.isEVM)?.address,
          solanaAddress: walletData?.find((wallet) => !wallet?.isEVM)?.address,
        };

        setIsRedirecting(true);
        await createLoginWalletBalance(payload);
        router.push("/");
      } catch (error) {
        console.error("Error verifying user:", error);
        router.push("/onboard");
      } finally {
        loginInitiated.current = false;
        setIsLoading(false);
      }
    },
    [apiUrl, extractEmail, router, walletData]
  );

  // Privy
  const { state, sendCode, loginWithCode } = useLoginWithEmail();

  useEffect(() => {
    if (authenticated && ready && user) {
      const processedWalletData = processWalletData(user);
      setWalletData(processedWalletData);
    }
  }, [authenticated, ready, user, processWalletData]);

  useEffect(() => {
    const privyToken = document.cookie.includes("privy-token");
    console.log("🚀 ~ useEffect ~ privyToken:", privyToken);
    const privyIdToken = document.cookie.includes("privy-id-token");
    console.log("🚀 ~ useEffect ~ privyIdToken:", privyIdToken);

    // if ((!privyToken || !privyIdToken) && authenticated) {
    //   setIsLoggingOut(true);
    //   logout();
    // }
  }, [authenticated, logout]);

  // Effect for handling OTP completion
  useEffect(() => {
    if ((state.status === "initial" || state.status === "done") && user) {
      handleUserVerification(user);
    }
  }, [state, user, handleUserVerification]);

  const isValidEmail = (email: string | null): string => {
    if (!email) {
      return "Email is required";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Email is invalid";
    }

    return "Valid email";
  };

  const handleSendCode = useCallback(
    (e: any) => {
      e.preventDefault();
      const checkEmail = isValidEmail(email);
      if (checkEmail === "Valid email") {
        setCheckEmailValidation("");
        sendCode({ email });
        setActiveModal("otp");
      } else {
        setCheckEmailValidation(checkEmail);
      }
    },
    [email, sendCode]
  );

  const loginWithCodeCallback = useCallback(
    (code: string) => {
      loginWithCode({ code });
    },
    [loginWithCode]
  );

  useEffect(() => {
    if (state.status === "awaiting-code-input") {
      if (otp.every((digit) => digit !== "")) {
        // Check if all OTP fields are filled
        loginWithCodeCallback(otp.join("")); // Join only when all fields are filled
      }
    }
  }, [otp, state, loginWithCodeCallback]);

  console.log("user", user);
  console.log("authenticate", authenticated);
  console.log("ready", ready);
  console.log("loginInitiated.curret", loginInitiated.current);
  console.log("state", state);

  if (!user) {
    return (
      <div className="relative w-full max-w-2xl mx-auto p-8 flex justify-center items-center">
        {/* Background Images */}
        <div className="absolute -top-[12%] left-[2%] w-32 h-32 animate-float">
          <Image
            src={astronot}
            alt="astronot"
            className="w-40 h-auto"
            priority
          />
        </div>
        {/* <div className="absolute -top-[15%] -right-[15%] w-32 h-32">
        <Image
          src={yellowPlanet}
          alt="yellow planet"
          className="w-40 h-auto"
          priority
        />
      </div> */}
        <div className="absolute -bottom-[12%] left-[10%] w-32 h-32">
          <Image
            src={blackPlanet}
            alt="blue planet"
            className="w-60 h-auto"
            priority
          />
        </div>
        {(state.status === "initial" ||
          state.status === "sending-code" ||
          activeModal === "email") && (
          <div className="">
            {/* Card */}
            <Card className="w-full bg-white/15 backdrop-blur-md shadow-xl rounded-3xl max-w-lg mx-auto p-10">
              <div className="flex flex-col items-center space-y-6 text-center pt-24 pb-20">
                {/* SWOP Logo */}
                <Image
                  src={swopLogo}
                  alt="swop logo"
                  className="w-40 h-auto"
                  priority
                />

                {/* Email Input Field */}
                <form
                  onSubmit={handleSendCode}
                  className="flex items-center border border-black rounded-xl overflow-hidden w-[350px]"
                >
                  <div className="p-2 pl-4">
                    <RiMailSendLine className="text-gray-400" size={20} />
                  </div>
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-2 py-2 text-gray-600 placeholder-gray-400 outline-none bg-transparent"
                  />
                  <button
                    className="bg-black text-white p-2 rounded-lg m-1 px-4"
                    // onClick={handleSendCode}
                    type="submit"
                    disabled={state.status === "sending-code"}
                  >
                    <LuArrowRight className="text-gray-50" size={20} />
                  </button>
                </form>

                <div className="h-3">
                  {state.status === "sending-code" && (
                    <span>Sending Code...</span>
                  )}

                  {checkEmailValidation !== "Valid email" && (
                    <p className="text-red-400 text-sm">
                      {checkEmailValidation}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {(state.status === "awaiting-code-input" ||
          state.status === "submitting-code" ||
          state.status === "error") &&
          activeModal === "otp" && (
            <div className="flex flex-col items-center justify-center p-8 bg-white/15 backdrop-blur-md rounded-2xl shadow-lg w-[420px] border z-30">
              {/* Close & Back Buttons */}
              <div className="flex justify-between w-full text-gray-500">
                <button
                  className="text-lg"
                  onClick={() => {
                    setOtp(new Array(otpLength).fill(""));
                    setActiveModal("email");
                  }}
                >
                  <GoArrowLeft className="text-gray-800 " size={25} />
                </button>
                <span className="text-base -ml-5">Log in or sign up</span>
                <button className="text-lg">
                  {/* <IoCloseOutline className="text-gray-800 " size={25} /> */}
                </button>
              </div>
              {/* Mail Icon */}
              <RiMailSendLine className="text-indigo-500 mt-6" size={40} />
              {/* Title */}
              <h2 className="font-semibold text-lg mt-4">
                Enter Configuration Code
              </h2>
              {/* Email Info */}
              <p className="text-sm text-gray-600 text-center mt-3">
                Please check <span className="font-medium">{email}</span> for an
                email from privy.io and enter your code below.
              </p>
              {/* OTP Input Fields */}
              <div className="flex justify-center gap-3 mt-12">
                {otp.map((_, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      if (el) inputRefs.current[index] = el;
                    }}
                    type="text"
                    maxLength={1}
                    value={otp[index]}
                    onChange={(e) => handleChange(index, e)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="w-12 h-16 border border-gray-300 rounded-lg text-center text-xl focus:outline-none focus:border-indigo-500"
                  />
                ))}
              </div>
              {/* Resend Code */}
              <p className="text-sm text-gray-500 mt-5">
                Didn&apos;t get an email?{"  "}
                <span
                  className="text-indigo-600 cursor-pointer"
                  onClick={handleSendCode}
                >
                  Resend code
                </span>
              </p>
              {/* Error */}
              <div className="h-3">
                {state.status === "error" && (
                  <p className="text-red-400 text-sm mt-2">Invalid OTP</p>
                )}
              </div>
            </div>
          )}
      </div>
    );
  }

  if (!ready || isLoggingOut || isRedirecting) {
    return <Loader />;
  }

  if (isLoading || loginInitiated.current) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  return <Loader />;
};

export default Login;
