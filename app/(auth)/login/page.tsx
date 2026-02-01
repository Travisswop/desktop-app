"use client";

import { createLoginWalletBalance } from "@/actions/createWallet";
import Loader from "@/components/loading/Loader";
import { Card } from "@/components/ui/card";
import { useUser } from "@/lib/UserContext";
import blackPlanet from "@/public/onboard/black-planet.svg";
import swopLogo from "@/public/swopLogo.png";
import { WalletItem } from "@/types/wallet";
import {
  useCreateWallet,
  useLoginWithEmail,
  usePrivy,
} from "@privy-io/react-auth";
import {
  useWallets as useSolanaWallets,
  useSignAndSendTransaction,
  useCreateWallet as useSolanaCreateWallet,
} from "@privy-io/react-auth/solana";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { GoArrowLeft } from "react-icons/go";
import { LuArrowRight } from "react-icons/lu";
import { RiMailSendLine } from "react-icons/ri";
import Cookies from "js-cookie";
import logger from "@/utils/logger";

// Login flow states
enum LoginFlow {
  EMAIL_INPUT = "email_input",
  OTP_INPUT = "otp_input",
  PROCESSING = "processing",
  SUCCESS = "success",
  ERROR = "error",
}

// Wallet creation status
interface WalletCreationStatus {
  ethereum: boolean;
  solana: boolean;
  inProgress: boolean;
}

const Login: React.FC = () => {
  // Privy hooks
  const { authenticated, ready, user } = usePrivy();
  const { state, sendCode, loginWithCode } = useLoginWithEmail();
  const { createWallet: createEthereumWallet } = useCreateWallet();
  const { createWallet: createSolanaWallet } = useSolanaCreateWallet();

  // Custom hooks
  const { isAuthenticated } = useUser();
  const router = useRouter();

  console.log("isAuthenticated", isAuthenticated, authenticated, ready);

  // State management
  const [loginFlow, setLoginFlow] = useState<LoginFlow>(LoginFlow.EMAIL_INPUT);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [walletStatus, setWalletStatus] = useState<WalletCreationStatus>({
    ethereum: false,
    solana: false,
    inProgress: false,
  });

  // OTP state
  const otpLength = 6;
  const [otp, setOtp] = useState(new Array(otpLength).fill(""));
  const inputRefs = useRef<Array<HTMLInputElement | null>>(
    new Array(otpLength).fill(null),
  );

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(480); // 8 minutes = 480 seconds
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Refs for preventing race conditions
  const loginProcessingRef = useRef(false);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Start timer when OTP screen is shown
  useEffect(() => {
    if (loginFlow === LoginFlow.OTP_INPUT) {
      setTimeRemaining(480);
      setCanResend(false);

      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [loginFlow]);

  // Email validation
  const validateEmail = useCallback((email: string): string => {
    if (!email.trim()) return "Email is required";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address";

    return "";
  }, []);

  // Extract email from Privy user
  const extractEmailFromUser = useCallback((user: any): string | null => {
    return (
      user?.google?.email ||
      user?.email?.address ||
      user?.linkedAccounts?.find((acc: any) => acc.type === "email")?.address ||
      user?.linkedAccounts?.find((acc: any) => acc.type === "google_oauth")
        ?.email ||
      null
    );
  }, []);

  // Process wallet data
  const processWalletData = useCallback((user: any): WalletItem[] => {
    if (!user?.linkedAccounts) return [];

    return user.linkedAccounts
      .filter(
        (account: any) =>
          (account.chainType === "ethereum" ||
            account.chainType === "solana") &&
          (account.walletClientType === "privy" ||
            account.connectorType === "embedded"),
      )
      .map((account: any) => ({
        address: account.address,
        isActive: true,
        isEVM: account.chainType === "ethereum",
        walletClientType: account.walletClientType,
      }));
  }, []);

  // Create wallets
  const createPrivyWallets = useCallback(
    async (user: any) => {
      if (walletStatus.inProgress) return;

      setWalletStatus((prev) => ({ ...prev, inProgress: true }));

      try {
        const existingWallets = user?.linkedAccounts || [];
        const hasEthWallet = existingWallets.some(
          (acc: any) =>
            acc.chainType === "ethereum" &&
            (acc.walletClientType === "privy" ||
              acc.connectorType === "embedded"),
        );
        const hasSolWallet = existingWallets.some(
          (acc: any) =>
            acc.chainType === "solana" &&
            (acc.walletClientType === "privy" ||
              acc.connectorType === "embedded"),
        );

        // Add production debugging
        const isProduction = process.env.NODE_ENV === "production";
        if (isProduction) {
          logger.log("Production wallet creation - User state:", {
            hasEthWallet,
            hasSolWallet,
            linkedAccountsCount: existingWallets.length,
            userAuthenticated: !!user,
            privyReady: ready,
          });
        }

        // Create Ethereum wallet if needed
        if (!hasEthWallet) {
          try {
            await createEthereumWallet();
            setWalletStatus((prev) => ({ ...prev, ethereum: true }));
            logger.log("Ethereum wallet created successfully");
          } catch (error: any) {
            if (
              error === "embedded_wallet_already_exists" ||
              error?.message === "embedded_wallet_already_exists"
            ) {
              setWalletStatus((prev) => ({
                ...prev,
                ethereum: true,
              }));
              logger.log("Ethereum wallet already exists");
            } else {
              logger.error("Ethereum wallet creation failed:", error);
              if (isProduction) {
                logger.error("Production Ethereum wallet error details:", {
                  error: error?.message || error,
                  stack: error?.stack,
                  userAgent:
                    typeof window !== "undefined"
                      ? window.navigator.userAgent
                      : "server",
                  timestamp: new Date().toISOString(),
                });
              }
            }
          }
        }

        // Create Solana wallet if needed
        if (!hasSolWallet) {
          try {
            await createSolanaWallet();
            setWalletStatus((prev) => ({ ...prev, solana: true }));
            logger.log("Solana wallet created successfully");
          } catch (error: any) {
            if (
              error === "embedded_wallet_already_exists" ||
              error?.message === "embedded_wallet_already_exists"
            ) {
              setWalletStatus((prev) => ({ ...prev, solana: true }));
              logger.log("Solana wallet already exists");
            } else {
              logger.error("Solana wallet creation failed:", error);
              if (isProduction) {
                logger.error("Production Solana wallet error details:", {
                  error: error?.message || error,
                  stack: error?.stack,
                  userAgent:
                    typeof window !== "undefined"
                      ? window.navigator.userAgent
                      : "server",
                  timestamp: new Date().toISOString(),
                });
              }
            }
          }
        }
      } catch (error) {
        logger.error("Wallet creation process failed:", error);
        if (process.env.NODE_ENV === "production") {
          logger.error("Production wallet creation process error:", {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            userAgent:
              typeof window !== "undefined"
                ? window.navigator.userAgent
                : "server",
            timestamp: new Date().toISOString(),
          });
        }
      } finally {
        setWalletStatus((prev) => ({ ...prev, inProgress: false }));
      }
    },
    [createEthereumWallet, createSolanaWallet, ready],
  );

  useEffect(() => {
    if (
      authenticated &&
      ready &&
      user &&
      !walletStatus.inProgress &&
      !(walletStatus.ethereum && walletStatus.solana)
    ) {
      createPrivyWallets(user).catch((error) => {
        logger.error("Wallet creation failed (post-auth):", error);
      });
    }
  }, [
    authenticated,
    ready,
    user,
    walletStatus.inProgress,
    walletStatus.ethereum,
    walletStatus.solana,
  ]);

  // Handle successful login
  const handleLoginSuccess = useCallback(
    async (user: any) => {
      if (loginProcessingRef.current) return;

      loginProcessingRef.current = true;
      setLoginFlow(LoginFlow.PROCESSING);
      setLoginError(null);

      try {
        const userEmail = extractEmailFromUser(user);
        if (!userEmail) {
          throw new Error("No email found in account");
        }

        // Check if user exists in backend
        const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/${userEmail}`;
        const response = await fetch(apiUrl, {
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          if (response.status === 404) {
            logger.log("User not found, redirecting to onboard");
            router.push("/onboard");
            return;
          }
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        console.log("login backend res", data);
        if (!data?.user?._id) {
          throw new Error("Invalid user data from backend");
        }

        // Set user ID cookie
        Cookies.set("user-id", data.user._id.toString());
        Cookies.set("access-token", data.token);

        // Process wallet data for balance update
        const walletData = processWalletData(user);
        const payload = {
          userId: data.user._id,
          ethAddress: walletData.find((w) => w.isEVM)?.address,
          solanaAddress: walletData.find((w) => !w.isEVM)?.address,
        };

        // Update wallet balances (non-blocking)
        createLoginWalletBalance(payload).catch((error) => {
          logger.error("Wallet balance update failed:", error);
        });

        setLoginFlow(LoginFlow.SUCCESS);

        // Redirect after short delay
        redirectTimeoutRef.current = setTimeout(() => {
          router.refresh();
          router.push("/");
        }, 1500);
      } catch (error) {
        logger.error("Login processing failed:", error);
        setLoginError(error instanceof Error ? error.message : "Login failed");
        setLoginFlow(LoginFlow.ERROR);
      } finally {
        loginProcessingRef.current = false;
      }
    },
    [extractEmailFromUser, processWalletData, router],
  );

  // Handle email form submission
  const handleEmailSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const error = validateEmail(email);
      if (error) {
        setEmailError(error);
        return;
      }

      setEmailError("");
      sendCode({ email });
      setLoginFlow(LoginFlow.OTP_INPUT);
    },
    [email, validateEmail, sendCode],
  );

  // Handle resend code
  const handleSendCode = useCallback(() => {
    if (canResend) {
      sendCode({ email });
      setTimeRemaining(480);
      setCanResend(false);
      setOtp(new Array(otpLength).fill(""));
    }
  }, [email, sendCode, canResend, otpLength]);

  // OTP input handlers
  const handleOtpChange = useCallback(
    (index: number, value: string) => {
      if (isNaN(Number(value))) return;

      const newOtp = [...otp];
      newOtp[index] = value.substring(value.length - 1);
      setOtp(newOtp);

      // Auto-focus next input
      if (value && index < otpLength - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [otp, otpLength],
  );

  const handleOtpKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && !otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [otp],
  );

  const handleOtpPaste = useCallback(
    (e: React.ClipboardEvent) => {
      const pasteData = e.clipboardData
        .getData("text")
        .slice(0, otpLength)
        .split("");
      if (pasteData.some((char) => isNaN(Number(char)))) return;

      const newOtp = [
        ...pasteData,
        ...new Array(otpLength - pasteData.length).fill(""),
      ];
      setOtp(newOtp);

      // Update input values and focus
      pasteData.forEach((char, index) => {
        if (inputRefs.current[index]) {
          inputRefs.current[index]!.value = char;
        }
      });

      inputRefs.current[Math.min(pasteData.length, otpLength - 1)]?.focus();
    },
    [otpLength],
  );

  // Redirect authenticated users
  useEffect(() => {
    if (ready && (authenticated || isAuthenticated)) {
      return;
    }
  }, [ready, authenticated, isAuthenticated]);

  // Handle OTP completion and login
  useEffect(() => {
    const isOtpComplete = otp.every((digit) => digit !== "");

    if (
      (state.status === "awaiting-code-input" || state.status === "error") &&
      isOtpComplete &&
      !loginProcessingRef.current
    ) {
      loginWithCode({ code: otp.join("") });
    }
  }, [otp, state.status, loginWithCode]);

  // Handle successful login
  useEffect(() => {
    if (state.status === "done" && user && !loginProcessingRef.current) {
      handleLoginSuccess(user);
    }
  }, [state.status, user, handleLoginSuccess]);

  // Handle login errors
  useEffect(() => {
    if (state.status === "error") {
      setLoginError("Invalid verification code. Please try again.");
      setOtp(new Array(otpLength).fill(""));
      loginProcessingRef.current = false;
    }
  }, [state.status, otpLength]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Loading states
  if (!ready || loginFlow === LoginFlow.PROCESSING) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <Loader />
        <p className="mt-4 text-sm text-gray-600">
          {loginFlow === LoginFlow.PROCESSING
            ? "Processing your login..."
            : "Initializing..."}
        </p>
      </div>
    );
  }

  if (loginFlow === LoginFlow.SUCCESS) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader />
        <p className="mt-4 text-sm text-gray-600">
          Login successful! Redirecting to dashboard...
        </p>
      </div>
    );
  }

  // Error state
  if (loginFlow === LoginFlow.ERROR && loginError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-white/15 backdrop-blur-md rounded-xl shadow-lg max-w-md">
          <h2 className="text-xl font-semibold text-red-500 mb-4">
            Login Error
          </h2>
          <p className="text-gray-700 mb-6">{loginError}</p>
          <button
            className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            onClick={() => {
              setLoginError(null);
              setLoginFlow(LoginFlow.EMAIL_INPUT);
              setOtp(new Array(otpLength).fill(""));
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto p-8 flex justify-center items-center">
      {loginFlow === LoginFlow.EMAIL_INPUT && (
        <Card className="w-full bg-white shadow-small shadow-white rounded-3xl max-w-lg mx-auto p-10">
          <div className="flex flex-col items-center space-y-6 text-center pt-24 pb-20">
            <div className="flex items-center gap-2">
              <Image
                src={blackPlanet}
                alt="blue planet"
                className="w-16 h-auto"
                priority
              />
              <Image
                src={swopLogo}
                alt="swop logo"
                className="w-32 h-auto"
                priority
              />
            </div>

            <form
              onSubmit={handleEmailSubmit}
              className="flex items-center border border-black rounded-xl overflow-hidden w-[350px]"
            >
              <div className="p-2 pl-4">
                <RiMailSendLine size={20} />
              </div>
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-2 py-2 text-gray-600 placeholder-gray-400 outline-none bg-transparent"
                disabled={state.status === "sending-code"}
              />
              <button
                type="submit"
                disabled={state.status === "sending-code"}
                className="bg-black text-white p-2 rounded-lg m-1 px-3 hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <LuArrowRight className="text-gray-50" size={20} />
              </button>
            </form>

            <div className="h-6">
              {state.status === "sending-code" && (
                <span className="text-blue-600">
                  Sending verification code...
                </span>
              )}
              {emailError && (
                <p className="text-red-500 text-sm">{emailError}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {loginFlow === LoginFlow.OTP_INPUT && (
        <div className="w-full bg-white shadow-small shadow-white rounded-3xl max-w-lg mx-auto p-10 flex flex-col items-center justify-center z-30 space-y-4">
          {/* Close & Back Buttons */}
          <div className="flex justify-between w-full text-gray-500">
            <button
              className="text-lg hover:text-gray-600 transition-colors"
              onClick={() => {
                setOtp(new Array(otpLength).fill(""));
                setLoginFlow(LoginFlow.EMAIL_INPUT);
              }}
            >
              <GoArrowLeft className="text-gray-800 " size={25} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Image
              src={blackPlanet}
              alt="blue planet"
              className="w-12 h-auto"
              priority
            />
            <Image
              src={swopLogo}
              alt="swop logo"
              className="w-28 h-auto"
              priority
            />
          </div>
          {/* Title */}
          <h2 className="font-semibold text-xl pt-6">Enter Code</h2>
          {/* OTP Input Fields */}
          <div className="flex justify-center gap-3">
            {otp.map((_, index) => (
              <input
                key={index}
                ref={(el) => {
                  if (el) inputRefs.current[index] = el;
                }}
                type="text"
                maxLength={1}
                value={otp[index]}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                onPaste={handleOtpPaste}
                className="w-12 h-16 border border-gray-300 rounded-lg text-center text-xl focus:outline-none focus:border-indigo-500"
              />
            ))}
          </div>
          <p className="text-center text-sm text-gray-500">
            A one time authentication code has been <br /> sent to 
            {email}.
          </p>
          {/* Timer and Resend Code */}
          <div className="text-sm text-gray-500">
            {!canResend ? (
              <p>
                Expires in{" "}
                <span className="font-semibold text-indigo-600">
                  {formatTime(timeRemaining)}.
                </span>
                <span className="text-gray-600 font-medium ml-1">
                  Resend code
                </span>
              </p>
            ) : (
              <p>
                Didn&apos;t get an email?{" "}
                <span
                  className="text-indigo-600 cursor-pointer hover:text-indigo-700 font-medium"
                  onClick={handleSendCode}
                >
                  Resend code
                </span>
              </p>
            )}
          </div>
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
};

export default Login;
