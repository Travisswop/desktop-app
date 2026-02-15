// "use client";

// import { useState, useEffect } from "react";
// import { useTokenChartData } from "@/lib/hooks/useTokenChartData";
// import {
//   Area,
//   AreaChart,
//   ResponsiveContainer,
//   XAxis,
//   YAxis,
//   Tooltip,
// } from "recharts";
// import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Send, Wallet } from "lucide-react";
// import { TokenData } from "@/types/token";
// import TokenImage from "./token-image";
// import { TooltipProvider } from "@/components/ui/tooltip";
// import {
//   TooltipContent,
//   TooltipTrigger,
//   Tooltip as TooltipUI,
// } from "@/components/ui/tooltip";
// import { useUser } from "@/lib/UserContext";
// import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";
// import { BsSendFill } from "react-icons/bs";
// import { AiOutlineSwap } from "react-icons/ai";
// import CustomModal from "@/components/modal/CustomModal";
// import GetQrCodeUsingWalletAddress from "../QRCode/GetQrCodeUsingWalletAddress";
// import { useMultiChainTokenData } from "@/lib/hooks/useToken";
// import { usePrivy } from "@privy-io/react-auth";
// import { useWallets as useSolanaWallets } from "@privy-io/react-auth/solana";
// import { useFundWallet } from "@privy-io/react-auth/solana";
// import { useWalletAddresses, useWalletData } from "../hooks/useWalletData";
// import { SUPPORTED_CHAINS } from "../constants";
// import SwapTokenModal from "../SwapTokenModal";
// import { FaDollarSign } from "react-icons/fa6";

// const CustomTooltip = ({
//   active,
//   payload,
//   label,
// }: // eslint-disable-next-line @typescript-eslint/no-explicit-any
// any) => {
//   if (active && payload && payload.length) {
//     // label is the timestamp - could be in seconds or milliseconds
//     // If it's a very large number (> 10 digits), it's milliseconds
//     const timestamp = label > 10000000000 ? label : label * 1000;

//     return (
//       <div className="bg-white p-2 border rounded shadow-sm">
//         <p className="text-sm text-gray-600">
//           {new Date(timestamp).toLocaleString("en-US", {
//             month: "short",
//             day: "numeric",
//             hour: "numeric",
//             minute: "2-digit",
//             hour12: true,
//           })}
//         </p>
//         <p className="text-sm font-bold">${payload[0].value.toFixed(4)}</p>
//       </div>
//     );
//   }
//   return null;
// };

// interface TokenDetailsProps {
//   token: TokenData;
//   onBack: () => void;
//   onSend: (arg0: TokenData) => void;
// }

// export default function TokenDetails({
//   token,
//   onBack,
//   onSend,
// }: TokenDetailsProps) {
//   const { accessToken } = useUser();
//   const { fundWallet } = useFundWallet();
//   const { wallets: solanaWallets } = useSolanaWallets();

//   if (!accessToken) {
//     throw new Error("No access token found");
//   }
//   const [selectedPeriod, setSelectedPeriod] = useState("1D");
//   const [chartData, setChartData] = useState(token.timeSeriesData["1D"] || []);
//   const [changePercentage, setChangePercentage] = useState(
//     token.marketData.priceChangePercentage24h,
//   );
//   const [openWalletQrOpen, setOpenWalletQrOpen] = useState(false);
//   const [qrState, setQrState] = useState<"sol" | "eth" | "pol" | "base">("sol");
//   const [openWalletSwapOpen, setOpenWalletSwapOpen] = useState(false);
//   const [openWalletOptionsOpen, setOpenWalletOptionsOpen] = useState(false);

//   const [isLoading, setIsLoading] = useState(false);

//   console.log("token details", token);

//   // Lazy load chart data - only fetch when user selects a period
//   // Works for both native tokens (SOL, ETH, MATIC) and contract tokens
//   // Native tokens have null address and are mapped directly to CoinGecko IDs
//   const day = useTokenChartData(
//     token.address, // Can be null for native tokens
//     token.chain,
//     "1D",
//     selectedPeriod === "1D",
//     accessToken,
//   );

//   const week = useTokenChartData(
//     token.address,
//     token.chain,
//     "1W",
//     selectedPeriod === "1W",
//     accessToken,
//   );
//   const month = useTokenChartData(
//     token.address,
//     token.chain,
//     "1M",
//     selectedPeriod === "1M",
//     accessToken,
//   );
//   const year = useTokenChartData(
//     token.address,
//     token.chain,
//     "1Y",
//     selectedPeriod === "1Y",
//     accessToken,
//   );
//   const max = useTokenChartData(
//     token.address,
//     token.chain,
//     "Max",
//     selectedPeriod === "Max",
//     accessToken,
//   );

//   // Determine chart color - use token color or default based on price change
//   const strokeColor =
//     token.marketData.color ||
//     (parseFloat(changePercentage || "0") >= 0 ? "#22c55e" : "#ef4444");

//   // Update chart data when period changes or data is fetched
//   useEffect(() => {
//     const timeSeriesMap = {
//       "1D": day.data?.sparklineData || [],
//       "1W": week.data?.sparklineData || [],
//       "1M": month.data?.sparklineData || [],
//       "1Y": year.data?.sparklineData || [],
//       Max: max.data?.sparklineData || [],
//     };

//     const changePercentageMap = {
//       "1D": (day.data?.change as string) || "0",
//       "1W": (week.data?.change as string) || "0",
//       "1M": (month.data?.change as string) || "0",
//       "1Y": (year.data?.change as string) || "0",
//       Max: (max.data?.change as string) || "0",
//     };

//     // Determine loading state
//     const loadingStates = {
//       "1D": day.isLoading,
//       "1W": week.isLoading,
//       "1M": month.isLoading,
//       "1Y": year.isLoading,
//       Max: max.isLoading,
//     };

//     setIsLoading(
//       loadingStates[selectedPeriod as keyof typeof loadingStates] || false,
//     );

//     // Only update if we have data for the selected period
//     const newData = timeSeriesMap[selectedPeriod as keyof typeof timeSeriesMap];
//     const newChange =
//       changePercentageMap[selectedPeriod as keyof typeof changePercentageMap];

//     if (newData && newData.length > 0) {
//       setChartData(newData);
//       setChangePercentage(newChange);
//     } else {
//       console.warn(`[TokenDetails] No data available for ${selectedPeriod}`);
//     }
//   }, [
//     selectedPeriod,
//     day.data,
//     day.isLoading,
//     week.data,
//     week.isLoading,
//     month.data,
//     month.isLoading,
//     year.data,
//     year.isLoading,
//     max.data,
//     max.isLoading,
//     token.symbol,
//   ]);

//   const handleWalletQrOpen = () => {
//     if (token.chain.toLowerCase() === "solana") {
//       setQrState("sol");
//     } else if (token.chain.toLowerCase() === "polygon") {
//       setQrState("pol");
//     } else if (token.chain.toLowerCase() === "base") {
//       setQrState("base");
//     } else {
//       setQrState("eth");
//     }
//     setOpenWalletQrOpen(true);
//   };

//   const { authenticated, ready, user: PrivyUser } = usePrivy();
//   const walletData = useWalletData(authenticated, ready, PrivyUser);
//   const { solWalletAddress, evmWalletAddress } = useWalletAddresses(walletData);

//   const {
//     tokens,
//     loading: tokenLoading,
//     error: tokenError,
//     refetch: refetchTokens,
//   } = useMultiChainTokenData(
//     solWalletAddress,
//     evmWalletAddress,
//     SUPPORTED_CHAINS,
//   );

//   const handleWalletSwapOpen = () => {
//     setOpenWalletSwapOpen(true);
//   };

//   const solanaWalletAddress = solanaWallets?.[0]?.address;

//   const handleWalletOptionsOpen = async () => {
//     if (!solanaWalletAddress) {
//       console.error("No wallet address available");
//       return;
//     }

//     setIsLoading(true);
//     try {
//       await fundWallet({
//         address: solanaWalletAddress,
//         options: {
//           asset: "USDC",
//           amount: "20",
//         },
//       });
//     } catch (error) {
//       console.error("Failed to open Coinbase funding:", error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <>
//       <div className="w-full border-none rounded-xl h-full p-4">
//         {/* Header */}
//         <section>
//           <div className="flex items-center gap-2 mb-2">
//             <div className="w-8 h-8 rounded-full">
//               <TokenImage
//                 token={token}
//                 width={120}
//                 height={120}
//                 className="rounded-full w-10 h-10"
//               />
//             </div>
//             <div className="flex-1">
//               <h1 className="text-2xl font-bold">
//                 {token.marketData?.price
//                   ? `$${parseFloat(token.marketData.price.toString()).toFixed(
//                       4,
//                     )}`
//                   : "Price unavailable"}
//               </h1>
//               <p className="text-sm text-muted-foreground">{token.name}</p>
//             </div>
//             {changePercentage && (
//               <div
//                 className={`text-sm ${
//                   parseFloat(changePercentage) > 0
//                     ? "text-green-500"
//                     : "text-red-500"
//                 }`}
//               >
//                 <span className="font-medium">
//                   {parseFloat(changePercentage) > 0 ? "+" : ""}
//                   {parseFloat(changePercentage).toFixed(2)}%
//                 </span>
//                 <div className="text-xs">{selectedPeriod}</div>
//               </div>
//             )}
//           </div>
//         </section>
//         <section>
//           {/* Chart */}
//           <div className="border-0 shadow-none">
//             <div className="pt-6 px-0 pb-4">
//               <div className="h-[200px] relative">
//                 {isLoading && (
//                   <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 rounded-lg">
//                     <div className="flex flex-col items-center gap-2">
//                       <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-black rounded-full"></div>
//                       <p className="text-sm text-muted-foreground">
//                         Loading chart data...
//                       </p>
//                     </div>
//                   </div>
//                 )}
//                 <ResponsiveContainer width="100%" height="100%">
//                   <AreaChart
//                     data={chartData}
//                     margin={{
//                       top: 10,
//                       right: 30,
//                       left: 0,
//                       bottom: 0,
//                     }}
//                   >
//                     <defs>
//                       <linearGradient
//                         id="colorValue"
//                         x1="0"
//                         y1="0"
//                         x2="0"
//                         y2="1"
//                       >
//                         <stop
//                           offset="5%"
//                           stopColor={strokeColor}
//                           stopOpacity={0.3}
//                         />
//                         <stop
//                           offset="95%"
//                           stopColor={strokeColor}
//                           stopOpacity={0}
//                         />
//                       </linearGradient>
//                     </defs>
//                     <XAxis
//                       dataKey="timestamp"
//                       hide={true}
//                       tickFormatter={(timestamp) =>
//                         new Date(timestamp).toLocaleTimeString("en-US", {
//                           hour: "numeric",
//                           minute: "2-digit",
//                           hour12: true,
//                         })
//                       }
//                       type="number"
//                       scale="time"
//                       domain={["auto", "auto"]}
//                       tickLine={false}
//                       axisLine={false}
//                       minTickGap={30}
//                     />
//                     <YAxis domain={["auto", "auto"]} hide />
//                     <Tooltip
//                       content={<CustomTooltip />}
//                       cursor={{
//                         stroke: `${strokeColor}`,
//                         strokeWidth: 1,
//                       }}
//                     />
//                     <Area
//                       type="monotone"
//                       dataKey="value"
//                       stroke={strokeColor}
//                       strokeWidth={2.5}
//                       fill="url(#colorValue)"
//                       isAnimationActive={true}
//                       animationDuration={1000}
//                       connectNulls={true}
//                       dot={false}
//                     />
//                   </AreaChart>
//                 </ResponsiveContainer>
//               </div>

//               <Tabs value={selectedPeriod} className="w-full mt-4">
//                 <TabsList className="grid w-full grid-cols-5">
//                   <TabsTrigger
//                     value="1D"
//                     onClick={() => setSelectedPeriod("1D")}
//                   >
//                     1D
//                   </TabsTrigger>
//                   <TabsTrigger
//                     value="1W"
//                     onClick={() => setSelectedPeriod("1W")}
//                   >
//                     1W
//                   </TabsTrigger>
//                   <TabsTrigger
//                     value="1M"
//                     onClick={() => setSelectedPeriod("1M")}
//                   >
//                     1M
//                   </TabsTrigger>
//                   <TabsTrigger
//                     value="1Y"
//                     onClick={() => setSelectedPeriod("1Y")}
//                   >
//                     1Y
//                   </TabsTrigger>
//                   {/* <TabsTrigger
//                     value="Max"
//                     onClick={() => setSelectedPeriod("Max")}
//                   >
//                     Max
//                   </TabsTrigger> */}
//                 </TabsList>
//               </Tabs>
//             </div>
//           </div>

//           <div className="border-t"></div>
//           {/* Balance */}
//           <div className="flex justify-between text-sm text-muted-foreground my-2">
//             <span>Balance</span>
//             <span>Value</span>
//           </div>
//           <div className="flex justify-between items-center mb-6">
//             <div className="flex items-center gap-2">
//               <div className="w-6 h-6 rounded-full">
//                 <TokenImage
//                   token={token}
//                   width={24}
//                   height={24}
//                   className="rounded-full"
//                 />
//               </div>
//               <span>
//                 {parseFloat(token.balance).toFixed(4)} {token.symbol}
//               </span>
//             </div>
//             <span>
//               {token.marketData?.price
//                 ? `$${(
//                     parseFloat(token.balance) *
//                     parseFloat(token.marketData.price)
//                   ).toFixed(4)}`
//                 : "Value unavailable"}
//             </span>
//           </div>

//           {/* Action Buttons */}
//           <div className="relative grid grid-cols-4 gap-4 mb-6">
//             {parseFloat(token.balance) > 0 ? (
//               <PrimaryButton
//                 onClick={() => {
//                   onSend(token);
//                 }}
//                 className="py-2"
//               >
//                 <BsSendFill className="w-5 h-5" />
//               </PrimaryButton>
//             ) : (
//               <TooltipProvider>
//                 <TooltipUI>
//                   <TooltipTrigger>
//                     <div className="flex items-center gap-2 cursor-not-allowed w-full px-4 py-2 text-sm font-medium ring-offset-background rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">
//                       <Send className="w-4 h-4" />
//                       Send
//                     </div>
//                   </TooltipTrigger>
//                   <TooltipContent className="max-w-xs">
//                     <p>You don&apos;t have any balance to send</p>
//                   </TooltipContent>
//                 </TooltipUI>
//               </TooltipProvider>
//             )}
//             <PrimaryButton
//               onClick={() => handleWalletQrOpen()}
//               className="py-2"
//             >
//               <Wallet className="w-5 h-5" />
//             </PrimaryButton>
//             <PrimaryButton
//               onClick={() => handleWalletSwapOpen()}
//               className="py-2"
//             >
//               <AiOutlineSwap className="w-5 h-5" />
//             </PrimaryButton>
//             <PrimaryButton
//               onClick={() => handleWalletOptionsOpen()}
//               className="py-2"
//             >
//               <FaDollarSign className="w-5 h-5" />
//             </PrimaryButton>
//           </div>

//           {/* History */}
//           {/* <div className="mb-6"> */}
//           {/* <h2 className="font-semibold mb-4">History</h2>
//           <div className="flex items-center justify-between py-3 border-t">
//             <div className="flex items-center gap-3">
//               <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
//                 <ArrowRightLeft className="w-4 h-4" />
//               </div>
//               <div>
//                 <div className="font-medium">Swapped</div>
//                 <div className="text-sm text-muted-foreground">
//                   The Graph
//                 </div>
//               </div>
//             </div>
//             <div className="text-right">
//               <div className="text-red-500">-$1780.13</div>
//               <div className="text-sm text-muted-foreground">
//                 11,641,551 GRT
//               </div>
//             </div>
//           </div> */}
//           {/* </div> */}

//           {/* Back Button */}
//           {/* <Button
//             className="w-full bg-black text-white hover:bg-gray-800"
//             onClick={onBack}
//           >
//             Back to Wallet
//           </Button> */}
//         </section>
//       </div>
//       {/* <RedeemModal
//         isOpen={isRedeemModalOpen}
//         onClose={() => setIsRedeemModalOpen(false)}
//         onConfirm={(
//           config: RedeemConfig,
//           updateStep: (
//             index: number,
//             status: ProcessingStep['status'],
//             message?: string
//           ) => void,
//           setRedeemLink: (link: string) => void
//         ) => handleRedeem(config, updateStep, setRedeemLink)}
//         tokenBalance={token.balance}
//         tokenLogo={token.logoURI}
//         tokenSymbol={token.symbol}
//         tokenDecimals={token.decimals}
//       /> */}

//       {openWalletQrOpen && (
//         <CustomModal
//           isOpen={openWalletQrOpen}
//           onCloseModal={setOpenWalletQrOpen}
//         >
//           <GetQrCodeUsingWalletAddress walletName={qrState} />
//         </CustomModal>
//       )}

//       {openWalletSwapOpen && (
//         <CustomModal
//           isOpen={openWalletSwapOpen}
//           onCloseModal={setOpenWalletSwapOpen}
//         >
//           <SwapTokenModal tokens={tokens} token={token} />
//         </CustomModal>
//       )}

//       {openWalletOptionsOpen && (
//         <CustomModal
//           isOpen={openWalletOptionsOpen}
//           onCloseModal={setOpenWalletOptionsOpen}
//         >
//           <p>options available</p>
//         </CustomModal>
//       )}
//     </>
//   );
// }

"use client";

import { useState, useEffect } from "react";
import { useTokenChartData } from "@/lib/hooks/useTokenChartData";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Wallet } from "lucide-react";
import { TokenData } from "@/types/token";
import TokenImage from "./token-image";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  TooltipContent,
  TooltipTrigger,
  Tooltip as TooltipUI,
} from "@/components/ui/tooltip";
import { useUser } from "@/lib/UserContext";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";
import { BsSendFill } from "react-icons/bs";
import { AiOutlineSwap } from "react-icons/ai";
import CustomModal from "@/components/modal/CustomModal";
import GetQrCodeUsingWalletAddress from "../QRCode/GetQrCodeUsingWalletAddress";
import { useMultiChainTokenData } from "@/lib/hooks/useToken";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets as useSolanaWallets } from "@privy-io/react-auth/solana";
import { useFundWallet } from "@privy-io/react-auth/solana";
import { useWalletAddresses, useWalletData } from "../hooks/useWalletData";
import { SUPPORTED_CHAINS } from "../constants";
import SwapTokenModal from "../SwapTokenModal";
import { FaDollarSign } from "react-icons/fa6";

const CustomTooltip = ({
  active,
  payload,
  label,
}: // eslint-disable-next-line @typescript-eslint/no-explicit-any
any) => {
  if (active && payload && payload.length) {
    // label is the timestamp - could be in seconds or milliseconds
    // If it's a very large number (> 10 digits), it's milliseconds
    const timestamp = label > 10000000000 ? label : label * 1000;

    return (
      <div className="bg-white p-2 border rounded shadow-sm">
        <p className="text-sm text-gray-600">
          {new Date(timestamp).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}
        </p>
        <p className="text-sm font-bold">${payload[0].value.toFixed(4)}</p>
      </div>
    );
  }
  return null;
};

interface TokenDetailsProps {
  token: TokenData;
  onBack: () => void;
  onSend: (arg0: TokenData) => void;
}

export default function TokenDetails({
  token,
  onBack,
  onSend,
}: TokenDetailsProps) {
  const { accessToken } = useUser();
  const { fundWallet } = useFundWallet();
  const { wallets: solanaWallets } = useSolanaWallets();

  if (!accessToken) {
    throw new Error("No access token found");
  }
  const [selectedPeriod, setSelectedPeriod] = useState("1D");
  const [chartData, setChartData] = useState(token.timeSeriesData["1D"] || []);
  const [changePercentage, setChangePercentage] = useState(
    token.marketData.priceChangePercentage24h,
  );
  const [openWalletQrOpen, setOpenWalletQrOpen] = useState(false);
  const [qrState, setQrState] = useState<"sol" | "eth" | "pol" | "base">("sol");
  const [openWalletSwapOpen, setOpenWalletSwapOpen] = useState(false);
  const [openWalletOptionsOpen, setOpenWalletOptionsOpen] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  console.log("token details", token);

  // Lazy load chart data - only fetch when user selects a period
  // Works for both native tokens (SOL, ETH, MATIC) and contract tokens
  // Native tokens have null address and are mapped directly to CoinGecko IDs
  const day = useTokenChartData(
    token.address, // Can be null for native tokens
    token.chain,
    "1D",
    selectedPeriod === "1D",
    accessToken,
  );

  const week = useTokenChartData(
    token.address,
    token.chain,
    "1W",
    selectedPeriod === "1W",
    accessToken,
  );
  const month = useTokenChartData(
    token.address,
    token.chain,
    "1M",
    selectedPeriod === "1M",
    accessToken,
  );
  const year = useTokenChartData(
    token.address,
    token.chain,
    "1Y",
    selectedPeriod === "1Y",
    accessToken,
  );
  const max = useTokenChartData(
    token.address,
    token.chain,
    "Max",
    selectedPeriod === "Max",
    accessToken,
  );

  // Determine chart color - use token color or default based on price change
  const strokeColor =
    token.marketData.color ||
    (parseFloat(changePercentage || "0") >= 0 ? "#22c55e" : "#ef4444");

  // Update chart data when period changes or data is fetched
  useEffect(() => {
    const timeSeriesMap = {
      "1D": day.data?.sparklineData || [],
      "1W": week.data?.sparklineData || [],
      "1M": month.data?.sparklineData || [],
      "1Y": year.data?.sparklineData || [],
      Max: max.data?.sparklineData || [],
    };

    const changePercentageMap = {
      "1D": (day.data?.change as string) || "0",
      "1W": (week.data?.change as string) || "0",
      "1M": (month.data?.change as string) || "0",
      "1Y": (year.data?.change as string) || "0",
      Max: (max.data?.change as string) || "0",
    };

    // Determine loading state
    const loadingStates = {
      "1D": day.isLoading,
      "1W": week.isLoading,
      "1M": month.isLoading,
      "1Y": year.isLoading,
      Max: max.isLoading,
    };

    setIsLoading(
      loadingStates[selectedPeriod as keyof typeof loadingStates] || false,
    );

    // Only update if we have data for the selected period
    const newData = timeSeriesMap[selectedPeriod as keyof typeof timeSeriesMap];
    const newChange =
      changePercentageMap[selectedPeriod as keyof typeof changePercentageMap];

    if (newData && newData.length > 0) {
      setChartData(newData);
      setChangePercentage(newChange);
    } else {
      console.warn(`[TokenDetails] No data available for ${selectedPeriod}`);
    }
  }, [
    selectedPeriod,
    day.data,
    day.isLoading,
    week.data,
    week.isLoading,
    month.data,
    month.isLoading,
    year.data,
    year.isLoading,
    max.data,
    max.isLoading,
    token.symbol,
  ]);

  const handleWalletQrOpen = () => {
    if (token.chain.toLowerCase() === "solana") {
      setQrState("sol");
    } else if (token.chain.toLowerCase() === "polygon") {
      setQrState("pol");
    } else if (token.chain.toLowerCase() === "base") {
      setQrState("base");
    } else {
      setQrState("eth");
    }
    setOpenWalletQrOpen(true);
  };

  const { authenticated, ready, user: PrivyUser } = usePrivy();
  const walletData = useWalletData(authenticated, ready, PrivyUser);
  const { solWalletAddress, evmWalletAddress } = useWalletAddresses(walletData);

  const {
    tokens,
    loading: tokenLoading,
    error: tokenError,
    refetch: refetchTokens,
  } = useMultiChainTokenData(
    solWalletAddress,
    evmWalletAddress,
    SUPPORTED_CHAINS,
  );

  const handleWalletSwapOpen = () => {
    setOpenWalletSwapOpen(true);
  };

  const solanaWalletAddress = solanaWallets?.[0]?.address;

  const handleWalletOptionsOpen = async () => {
    if (!solanaWalletAddress) {
      console.error("No wallet address available");
      return;
    }

    setIsLoading(true);
    try {
      await fundWallet({
        address: solanaWalletAddress,
        options: {
          asset: "USDC",
          amount: "20",
        },
      });
    } catch (error) {
      console.error("Failed to open Coinbase funding:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to format large numbers
  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return "N/A";
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Helper function to format percentage
  const formatPercentage = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return "N/A";
    const sign = num >= 0 ? "+" : "";
    return `${sign}${num.toFixed(5)}%`;
  };

  // Truncate description to first 100 characters
  const truncateDescription = (
    text: string,
    maxLength: number = 100,
  ): string => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <>
      <div className="w-full border-none rounded-xl h-full p-4">
        {/* Header */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full">
              <TokenImage
                token={token}
                width={120}
                height={120}
                className="rounded-full w-10 h-10"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">
                {token.marketData?.price
                  ? `$${parseFloat(token.marketData.price.toString()).toFixed(
                      4,
                    )}`
                  : "Price unavailable"}
              </h1>
              <p className="text-sm text-muted-foreground">{token.name}</p>
            </div>
            {changePercentage && (
              <div
                className={`text-sm ${
                  parseFloat(changePercentage) > 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                <span className="font-medium">
                  {parseFloat(changePercentage) > 0 ? "+" : ""}
                  {parseFloat(changePercentage).toFixed(2)}%
                </span>
                <div className="text-xs">{selectedPeriod}</div>
              </div>
            )}
          </div>
        </section>
        <section>
          {/* Chart */}
          <div className="border-0 shadow-none">
            <div className="pt-6 px-0 pb-4">
              <div className="h-[200px] relative">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 rounded-lg">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-black rounded-full"></div>
                      <p className="text-sm text-muted-foreground">
                        Loading chart data...
                      </p>
                    </div>
                  </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{
                      top: 10,
                      right: 30,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <defs>
                      <linearGradient
                        id="colorValue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={strokeColor}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={strokeColor}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="timestamp"
                      hide={true}
                      tickFormatter={(timestamp) =>
                        new Date(timestamp).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })
                      }
                      type="number"
                      scale="time"
                      domain={["auto", "auto"]}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={30}
                    />
                    <YAxis domain={["auto", "auto"]} hide />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{
                        stroke: `${strokeColor}`,
                        strokeWidth: 1,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={strokeColor}
                      strokeWidth={2.5}
                      fill="url(#colorValue)"
                      isAnimationActive={true}
                      animationDuration={1000}
                      connectNulls={true}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <Tabs value={selectedPeriod} className="w-full mt-4">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger
                    value="1D"
                    onClick={() => setSelectedPeriod("1D")}
                  >
                    1D
                  </TabsTrigger>
                  <TabsTrigger
                    value="1W"
                    onClick={() => setSelectedPeriod("1W")}
                  >
                    1W
                  </TabsTrigger>
                  <TabsTrigger
                    value="1M"
                    onClick={() => setSelectedPeriod("1M")}
                  >
                    1M
                  </TabsTrigger>
                  <TabsTrigger
                    value="1Y"
                    onClick={() => setSelectedPeriod("1Y")}
                  >
                    1Y
                  </TabsTrigger>
                  {/* <TabsTrigger
                    value="Max"
                    onClick={() => setSelectedPeriod("Max")}
                  >
                    Max
                  </TabsTrigger> */}
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="border-t"></div>
          {/* Balance */}
          <div className="flex justify-between text-sm text-muted-foreground my-2">
            <span>Balance</span>
            <span>Value</span>
          </div>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full">
                <TokenImage
                  token={token}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              </div>
              <span>
                {parseFloat(token.balance).toFixed(4)} {token.symbol}
              </span>
            </div>
            <span>
              {token.marketData?.price
                ? `$${(
                    parseFloat(token.balance) *
                    parseFloat(token.marketData.price)
                  ).toFixed(4)}`
                : "Value unavailable"}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="relative grid grid-cols-4 gap-4 mb-6">
            {parseFloat(token.balance) > 0 ? (
              <PrimaryButton
                onClick={() => {
                  onSend(token);
                }}
                className="py-2"
              >
                <BsSendFill className="w-5 h-5" />
              </PrimaryButton>
            ) : (
              <TooltipProvider>
                <TooltipUI>
                  <TooltipTrigger>
                    <div className="flex items-center gap-2 cursor-not-allowed w-full px-4 py-2 text-sm font-medium ring-offset-background rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">
                      <Send className="w-4 h-4" />
                      Send
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>You don&apos;t have any balance to send</p>
                  </TooltipContent>
                </TooltipUI>
              </TooltipProvider>
            )}
            <PrimaryButton
              onClick={() => handleWalletQrOpen()}
              className="py-2"
            >
              <Wallet className="w-5 h-5" />
            </PrimaryButton>
            <PrimaryButton
              onClick={() => handleWalletSwapOpen()}
              className="py-2"
            >
              <AiOutlineSwap className="w-5 h-5" />
            </PrimaryButton>
            <PrimaryButton
              onClick={() => handleWalletOptionsOpen()}
              className="py-2"
            >
              <FaDollarSign className="w-5 h-5" />
            </PrimaryButton>
          </div>

          {/* About Section */}
          {token.marketData?.description && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">About</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                {showFullDescription
                  ? token.marketData.description
                  : truncateDescription(token.marketData.description)}
              </p>
              {token.marketData.description.length > 100 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="text-sm text-blue-600 hover:underline mt-1"
                >
                  {showFullDescription ? "See less" : "See more"}
                </button>
              )}
            </div>
          )}

          {/* 24 hour Performance */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">24 hour Performance</h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Volume</span>
                <span className="text-sm font-medium">
                  {formatNumber(token.marketData?.totalVolume)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Change</span>
                <span
                  className={`text-sm font-medium ${
                    (token.marketData?.priceChangePercentage24h || 0) >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatPercentage(token.marketData?.priceChangePercentage24h)}
                </span>
              </div>
            </div>
          </div>

          {/* Others Section */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Others</h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total Supply</span>
                <span className="text-sm font-medium">
                  {formatNumber(token.marketData?.totalSupply)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">MarketCap</span>
                <span className="text-sm font-medium">
                  {formatNumber(token.marketData?.marketCap)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Change(7d)</span>
                <span
                  className={`text-sm font-medium ${
                    (token.marketData?.priceChangePercentage7d || 0) >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatPercentage(token.marketData?.priceChangePercentage7d)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Change(30d)</span>
                <span
                  className={`text-sm font-medium ${
                    (token.marketData?.priceChangePercentage30d || 0) >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatPercentage(token.marketData?.priceChangePercentage30d)}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {openWalletQrOpen && (
        <CustomModal
          isOpen={openWalletQrOpen}
          onCloseModal={setOpenWalletQrOpen}
        >
          <GetQrCodeUsingWalletAddress walletName={qrState} />
        </CustomModal>
      )}

      {openWalletSwapOpen && (
        <CustomModal
          isOpen={openWalletSwapOpen}
          onCloseModal={setOpenWalletSwapOpen}
        >
          <SwapTokenModal tokens={tokens} token={token} />
        </CustomModal>
      )}

      {openWalletOptionsOpen && (
        <CustomModal
          isOpen={openWalletOptionsOpen}
          onCloseModal={setOpenWalletOptionsOpen}
        >
          <p>options available</p>
        </CustomModal>
      )}
    </>
  );
}
