"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { RefreshCw, Copy, Plus, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
} from "@/components/ui/carousel";
import RedeemModal from "../token/redeem-modal";

export interface RedemptionPool {
  pool_id: string;
  total_amount: number;
  remaining_amount: number;
  token_name: string;
  token_symbol: string;
  token_logo: string;
  token_mint: string;
  token_decimals: number;
  tokens_per_wallet: number;
  created_at: string;
  expires_at: string | null;
  total_redemptions: number;
  total_redeemed_amount: number;
  redeemLink: string;
  wallet_address: string;
}

export function fromTokenLamports(
  lamports: string | number,
  decimals: number,
): number {
  return Number(lamports) / Math.pow(10, decimals);
}

const CardSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {[...Array(3)].map((_, index) => (
      <Card key={index} className="bg-white shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse" />
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const EmptyState = () => (
  <div className="text-center py-8">
    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
      <Copy className="w-8 h-8 text-gray-400" />
    </div>
    <p className="text-gray-600 font-medium mb-1">No Redemption Pools</p>
    <p className="text-sm text-gray-500">
      Create your first redemption pool to get started.
    </p>
  </div>
);

export default function RedeemTokenList() {
  const { user } = usePrivy();
  const [pools, setPools] = useState<RedemptionPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchPools = useCallback(async () => {
    try {
      if (!user?.id) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/wallet/getRedeemPoolList/${user?.id}`,
      );

      if (response.ok) {
        const { data } = await response.json();
        const items = data.map((pool: RedemptionPool) => ({
          ...pool,
          total_amount: fromTokenLamports(
            pool.total_amount,
            pool.token_decimals,
          ),
          remaining_amount: fromTokenLamports(
            pool.remaining_amount,
            pool.token_decimals,
          ),
          tokens_per_wallet: fromTokenLamports(
            pool.tokens_per_wallet,
            pool.token_decimals,
          ),
          total_redeemed_amount: fromTokenLamports(
            pool.total_redeemed_amount || "0",
            pool.token_decimals,
          ),
          redeemLink: `https://redeem.swopme.app/${pool.pool_id}`,
        }));
        setPools(items);
      } else {
        toast.error("Failed to fetch redemption pools");
      }
    } catch (error) {
      console.error("Error fetching pools:", error);
      toast.error("Failed to fetch redemption pools");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchPools();
    }
  }, [user?.id, fetchPools]);

  const copyToClipboard = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const truncateAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchPools();
  };

  return (
    <Card className="w-full border-none rounded-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Redemption Pools</h2>
            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="sm"
              className="p-0 h-8 w-8"
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-8 w-8"
              onClick={() => setOpen(true)}
            >
              <Plus className="h-full w-full" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading && <CardSkeleton />}

        {!loading && pools.length === 0 && <EmptyState />}

        {!loading && pools.length > 0 && pools.length < 2 && (
          <div className="flex justify-center">
            <Card className="bg-white shadow-sm max-w-md w-full">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Token Logo */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                      <Image
                        src={pools[0].token_logo}
                        alt={pools[0].token_symbol}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    </div>
                  </div>

                  {/* Pool Details */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        Wallet Address:
                      </span>
                      <span className="text-sm text-gray-600">
                        {truncateAddress(pools[0].wallet_address)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        Total Amount:
                      </span>
                      <span className="text-sm text-gray-600">
                        {pools[0].total_amount} {pools[0].token_symbol}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        Tokens Per Wallet:
                      </span>
                      <span className="text-sm text-gray-600">
                        {pools[0].tokens_per_wallet} {pools[0].token_symbol}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        Remaining:
                      </span>
                      <span className="text-sm text-gray-600">
                        {pools[0].remaining_amount} {pools[0].token_symbol}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        Redemption:
                      </span>
                      <span className="text-sm text-gray-600">
                        {pools[0].total_redemptions}(
                        {pools[0].total_redeemed_amount} {pools[0].token_symbol}
                        )
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        Created at:
                      </span>
                      <span className="text-sm text-gray-600">
                        {new Date(pools[0].created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-sm font-medium text-gray-700">
                        Action:
                      </span>
                      <button
                        onClick={() => copyToClipboard(pools[0].redeemLink)}
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        Copy
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!loading && pools.length >= 2 && (
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {pools.map((pool) => (
                <CarouselItem
                  key={pool.pool_id}
                  className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/2"
                >
                  <Card className="bg-white shadow-sm hover:shadow-md transition-shadow h-full">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Token Logo */}
                        <div className="flex-shrink-0">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                            <Image
                              src={pool.token_logo}
                              alt={pool.token_symbol}
                              width={40}
                              height={40}
                              className="rounded-full"
                            />
                          </div>
                        </div>

                        {/* Pool Details */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">
                              Wallet Address:
                            </span>
                            <span className="text-sm text-gray-600">
                              {truncateAddress(pool.wallet_address)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">
                              Total Amount:
                            </span>
                            <span className="text-sm text-gray-600">
                              {pool.total_amount} {pool.token_symbol}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">
                              Tokens Per Wallet:
                            </span>
                            <span className="text-sm text-gray-600">
                              {pool.tokens_per_wallet} {pool.token_symbol}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">
                              Remaining:
                            </span>
                            <span className="text-sm text-gray-600">
                              {pool.remaining_amount} {pool.token_symbol}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">
                              Redemption:
                            </span>
                            <span className="text-sm text-gray-600">
                              {pool.total_redemptions}(
                              {pool.total_redeemed_amount} {pool.token_symbol})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">
                              Created at:
                            </span>
                            <span className="text-sm text-gray-600">
                              {new Date(pool.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 pt-2">
                            <span className="text-sm font-medium text-gray-700">
                              Action:
                            </span>
                            <button
                              onClick={() => copyToClipboard(pool.redeemLink)}
                              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                            >
                              Copy
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselNext className="hidden md:flex -right-12 bg-white shadow-lg border-0">
              <ChevronRight className="h-4 w-4" />
            </CarouselNext>
          </Carousel>
        )}
      </CardContent>
      {open && (
        <RedeemModal
          mode="wallet"
          isOpen={open}
          onClose={() => setOpen(false)}
        />
      )}
    </Card>
  );
}
