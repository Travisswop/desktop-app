"use client";
import React, { useEffect, useState } from "react";
import { Modal, ModalContent, ModalBody } from "@nextui-org/react";
import toast from "react-hot-toast";
import { PublicKey } from "@solana/web3.js";
import { useSolanaWalletContext } from "@/lib/context/SolanaWalletContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import Image from "next/image";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

interface RedemptionPool {
  pool_id: string;
  temp_account_private_key: string;
  total_amount: number;
  remaining_amount: number;
  token_name: string;
  token_symbol: string;
  token_mint: string;
  token_decimals: number;
  tokens_per_wallet: number;
  max_wallets: number;
  token_logo: string;
  created_at: string;
  expires_at: string | null;
}

interface RedeemedPool {
  amount: string;
  user_wallet: string;
}

export default function RedeemClaimModal({
  isOpen,
  onOpenChange,
  redeemFeedData,
}: any) {
  console.log("redeem dta modal", redeemFeedData);
  const [loading, setLoading] = useState(false);
  const [redeemed, setRedeemed] = useState(false);
  const [pool, setPool] = useState<RedemptionPool | null>(null);
  const [redeemedPool, setRedeemedPool] = useState<RedeemedPool[]>([]);
  const [manualWalletAddress, setManualWalletAddress] = useState("");
  const [isManualInput, setIsManualInput] = useState(false);
  const [inputError, setInputError] = useState("");

  const { solanaWallets } = useSolanaWalletContext();

  console.log("solanaWallets", solanaWallets);

  useEffect(() => {
    fetchPool();
  }, []);

  const fetchPool = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/wallet/getRedeemTokenFromPool/${redeemFeedData.poolId}`
      );

      if (response.ok) {
        const { data } = await response.json();
        setPool(data.pool);
        setRedeemedPool(data.redeemed);
      } else {
        toast.error("Failed to fetch pool details");
      }
    } catch (error) {
      toast.error("Failed to fetch pool details");
    }
  };

  const formatAmount = (amount: number, decimals: number) => {
    return (amount / Math.pow(10, decimals)).toFixed(2);
  };

  const validateSolanaAddress = (address: string): boolean => {
    try {
      new PublicKey(address);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleManualWalletChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value;
    setManualWalletAddress(address);
    if (address && !validateSolanaAddress(address)) {
      setInputError("Invalid Solana address");
    } else {
      setInputError("");
    }
  };

  const handleRedeem = async () => {
    const walletToUse = solanaWallets?.[0]?.address;

    if (!pool) return;

    try {
      setLoading(true);

      const checkWalletRedeemed = redeemedPool.find(
        (item) => item.user_wallet === walletToUse
      );
      if (checkWalletRedeemed) {
        throw Error("Maximum redemption limit reached for this wallet");
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/wallet/redeemToken`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userWallet: walletToUse,
            poolId: pool.pool_id,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `Successfully redeemed ${formatAmount(
            pool.tokens_per_wallet,
            pool.token_decimals
          )} ${pool.token_name}!`
        );
        setRedeemed(true);
        await fetchPool();
      } else {
        toast.error(data.message || "Failed to redeem tokens");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to redeem tokens");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {isOpen && (
        <>
          <Modal
            size="2xl"
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            backdrop={"blur"}
            className=" overflow-y-auto hide-scrollbar"
          >
            <ModalContent>
              <div className="w-[91%] mx-auto py-6">
                <ModalBody className="text-center">
                  {redeemed && pool ? (
                    <div className="container mx-auto px-4 py-8 max-w-lg">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                              <svg
                                className="h-6 w-6 text-green-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="1.5"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M4.5 12.75l6 6 9-13.5"
                                />
                              </svg>
                            </div>
                            <h3 className="mt-4 text-lg font-medium">
                              Tokens Redeemed Successfully!
                            </h3>
                            <div className="mt-4 flex items-center justify-center space-x-2">
                              {pool.token_logo && (
                                <div className="relative h-8 w-8">
                                  <Image
                                    src={pool.token_logo}
                                    alt={pool.token_name}
                                    fill
                                    className="rounded-full"
                                  />
                                </div>
                              )}
                              <p className="text-xl font-semibold">
                                {formatAmount(
                                  pool.tokens_per_wallet,
                                  pool.token_decimals
                                )}{" "}
                                {pool.token_name}
                              </p>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              The tokens have been transferred to your wallet
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : !pool ? (
                    <div className="flex items-center justify-center min-h-[400px]">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <main className="container mx-auto px-4 py-8 max-w-lg">
                      <Card>
                        <CardHeader>
                          <div className="flex items-center space-x-4">
                            {pool && pool.token_logo && (
                              <div className="relative h-12 w-12">
                                <Image
                                  src={pool.token_logo}
                                  alt={pool.token_name}
                                  fill
                                  className="rounded-full"
                                />
                              </div>
                            )}
                            <div>
                              <CardTitle className="text-2xl">
                                Redeem {pool?.token_name}
                              </CardTitle>
                              <CardDescription>
                                {pool?.max_wallets - redeemedPool.length}{" "}
                                redemptions remaining
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            <div className="p-4 bg-muted/50 rounded-lg">
                              {isManualInput ? (
                                <div className="space-y-2">
                                  <p className="text-sm text-muted-foreground">
                                    Enter Wallet Address
                                  </p>
                                  <Input
                                    value={manualWalletAddress}
                                    onChange={handleManualWalletChange}
                                    placeholder="Solana wallet address"
                                    className={
                                      inputError ? "border-red-500" : ""
                                    }
                                  />
                                  {inputError && (
                                    <p className="text-xs text-red-500">
                                      {inputError}
                                    </p>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => setIsManualInput(false)}
                                  >
                                    Switch to Wallet Connection
                                  </Button>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    Connected Wallet
                                  </p>
                                  <p className="text-sm font-medium truncate">
                                    {solanaWallets?.[0]?.address}
                                  </p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => setIsManualInput(true)}
                                  >
                                    Switch to Manual Input
                                  </Button>
                                </div>
                              )}
                            </div>

                            <Button
                              onClick={handleRedeem}
                              disabled={
                                loading ||
                                pool.max_wallets - redeemedPool.length === 0 ||
                                (isManualInput &&
                                  (!manualWalletAddress || !!inputError))
                              }
                              className="w-full h-12 text-lg"
                              variant="outline"
                            >
                              {loading ? (
                                <div className="flex items-center space-x-2">
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                  <span>Redeeming...</span>
                                </div>
                              ) : pool.max_wallets - redeemedPool.length ===
                                0 ? (
                                "No redemptions remaining"
                              ) : (
                                `Redeem ${formatAmount(
                                  pool.tokens_per_wallet,
                                  pool.token_decimals
                                )} ${pool.token_symbol}`
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </main>
                  )}
                </ModalBody>
              </div>
            </ModalContent>
          </Modal>
        </>
      )}
    </>
  );
}
