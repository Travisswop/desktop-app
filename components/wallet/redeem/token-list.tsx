"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RedemptionPool {
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
}

const TableSkeleton = () => (
  <TableRow>
    {[...Array(7)].map((_, index) => (
      <TableCell key={index}>
        <div className="h-6 bg-gray-200 rounded animate-pulse" />
      </TableCell>
    ))}
  </TableRow>
);

export default function RedeemTokenList() {
  const { user } = usePrivy();
  const [pools, setPools] = useState<RedemptionPool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPools();
  }, []);

  console.log("pools", pools);

  const fetchPools = async () => {
    try {
      const response = await fetch(`/api/redeem/list?privyUserId=${user?.id}`);
      const data = await response.json();
      console.log("🚀 ~ fetchPools ~ data:", data);

      if (data.success) {
        setPools(data.pools);
      } else {
        toast.error(data.message || "Failed to fetch redemption pools");
      }
    } catch (error) {
      console.error("Error fetching pools:", error);
      toast.error("Failed to fetch redemption pools");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied to clipboard!");
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      toast.error("Failed to copy link");
    }
  };

  const formatAmount = (amount: number, decimals: number) => {
    return (amount / Math.pow(10, decimals)).toFixed(4);
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchPools();
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-4 flex items-center n">
        <span>Redemption Pools</span>
        <Button
          onClick={handleRefresh}
          variant="ghost"
          size="sm"
          className={cn("gap-2", loading && "animate-spin")}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </h2>
      <Tabs defaultValue="tokens" className="mb-8">
        <TabsList>
          <TabsTrigger value="tokens">Tokens</TabsTrigger>
          <TabsTrigger value="nft">NFT</TabsTrigger>
        </TabsList>
        <TabsContent value="tokens">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Token Mint</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Tokens Per Wallet</TableHead>
                    <TableHead>Redemptions</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading
                    ? [...Array(5)].map((_, index) => (
                        <TableSkeleton key={index} />
                      ))
                    : pools.map((pool) => (
                        <TableRow key={pool.pool_id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Image
                                src={pool.token_logo}
                                alt={pool.token_symbol}
                                width={24}
                                height={24}
                                className="rounded-full"
                              />
                              <div>
                                <div className="text-sm text-gray-500">
                                  {pool.token_symbol}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {pool.total_amount} {pool.token_symbol}
                          </TableCell>
                          <TableCell>
                            {pool.remaining_amount} {pool.token_symbol}
                          </TableCell>
                          <TableCell>
                            {pool.tokens_per_wallet} {pool.token_symbol}
                          </TableCell>
                          <TableCell>
                            {pool.total_redemptions} (
                            {pool.total_redeemed_amount} {pool.token_symbol})
                          </TableCell>
                          <TableCell>
                            {new Date(pool.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              onClick={() => copyToClipboard(pool.redeemLink)}
                              variant="ghost"
                              size="sm"
                            >
                              Copy Link
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="nft">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-gray-500">
                NFT redemption coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
