// "use client";

// import { useEffect, useState, useCallback } from "react";
// import { Card } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { ArrowUpDown } from "lucide-react";
// import Image from "next/image";
// import { debounce } from "lodash";
// import { fetchTokensFromLiFi } from "@/actions/lifiForTokenSwap";

// const getChainIcon = (chainName: string) => {
//   const chainIcons: Record<string, string> = {
//     SOLANA: "/images/IconShop/solana@2x.png",
//     ETHEREUM: "/images/IconShop/ethereum.png",
//     BSC: "/images/IconShop/binance-smart-chain.png",
//     POLYGON: "/images/IconShop/polygon.png",
//     ARBITRUM: "/images/IconShop/arbitrum.png",
//   };
//   return chainIcons[chainName.toUpperCase()] || null;
// };

// const getChainId = (chainName: string) => {
//   const chainIds: Record<string, string> = {
//     SOLANA: "1151111081099710",
//     ETHEREUM: "1",
//     BSC: "56",
//     POLYGON: "137",
//     ARBITRUM: "42161",
//   };
//   return chainIds[chainName.toUpperCase()] || "1";
// };

// export default function SwapTokenModal({ tokens }: { tokens: any[] }) {
//   // State management
//   const [payToken, setPayToken] = useState<any>(tokens?.[0] || null);
//   const [receiveToken, setReceiveToken] = useState<any>(null);
//   const [payAmount, setPayAmount] = useState("");
//   const [openDrawer, setOpenDrawer] = useState(false);
//   const [selecting, setSelecting] = useState<"pay" | "receive" | null>(null);
//   const [availableTokens, setAvailableTokens] = useState<any[]>([]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [isLoadingTokens, setIsLoadingTokens] = useState(false);
//   const [chainId, setChainId] = useState("1151111081099710");

//   console.log("searchQuery", searchQuery);
//   console.log("availableTokens", availableTokens);

//   // Set chain ID based on payToken
//   useEffect(() => {
//     if (payToken?.chain) {
//       setChainId(getChainId(payToken.chain));
//     }
//   }, [payToken]);

//   // Debounced token search for receive tokens
//   const debouncedSearch = useCallback(
//     debounce(async (query: string, chain: string) => {
//       setIsLoadingTokens(true);
//       try {
//         const tokens = await fetchTokensFromLiFi(chain, query);

//         let result = tokens;

//         if (query) {
//           const lowerQuery = query.toLowerCase();

//           // Sort tokens: exact matches first, then startsWith, then includes
//           result = [...tokens].sort((a, b) => {
//             const aSymbol = a.symbol?.toLowerCase() || "";
//             const bSymbol = b.symbol?.toLowerCase() || "";

//             // Exact match first
//             if (aSymbol === lowerQuery && bSymbol !== lowerQuery) return -1;
//             if (bSymbol === lowerQuery && aSymbol !== lowerQuery) return 1;

//             // StartsWith match next
//             if (
//               aSymbol.startsWith(lowerQuery) &&
//               !bSymbol.startsWith(lowerQuery)
//             )
//               return -1;
//             if (
//               bSymbol.startsWith(lowerQuery) &&
//               !aSymbol.startsWith(lowerQuery)
//             )
//               return 1;

//             // Includes match next
//             if (aSymbol.includes(lowerQuery) && !bSymbol.includes(lowerQuery))
//               return -1;
//             if (bSymbol.includes(lowerQuery) && !aSymbol.includes(lowerQuery))
//               return 1;

//             return 0;
//           });
//         }

//         setAvailableTokens(result.slice(0, 20));
//       } catch (error) {
//         console.error("Error fetching tokens:", error);
//       } finally {
//         setIsLoadingTokens(false);
//       }
//     }, 400),
//     []
//   );

//   // Fetch tokens when chainId or searchQuery changes (for receive tokens)
//   useEffect(() => {
//     if (openDrawer && selecting === "receive") {
//       debouncedSearch(searchQuery, chainId);
//     }
//     return () => debouncedSearch.cancel();
//   }, [searchQuery, chainId, openDrawer, selecting, debouncedSearch]);

//   // Initialize with first 20 tokens when drawer opens for pay tokens
//   useEffect(() => {
//     if (openDrawer && selecting === "pay") {
//       setAvailableTokens(tokens.slice(0, 20));
//     }
//   }, [openDrawer, selecting, tokens]);

//   const handleFlip = () => {
//     const tempToken = payToken;
//     setPayToken(receiveToken);
//     setReceiveToken(tempToken);
//   };

//   const handlePercentageClick = (percentage: number) => {
//     if (payToken?.balance) {
//       const amount = (parseFloat(payToken.balance) * percentage).toString();
//       setPayAmount(amount);
//     }
//   };

//   // Local search for pay tokens
//   const handlePayTokenSearch = (query: string) => {
//     setIsLoadingTokens(true);
//     try {
//       const results = tokens.filter(
//         (token: any) =>
//           token.symbol.toLowerCase().includes(query.toLowerCase()) ||
//           token.name.toLowerCase().includes(query.toLowerCase())
//       );
//       setAvailableTokens(results.slice(0, query ? 50 : 20));
//     } catch (error) {
//       console.error("Error filtering tokens:", error);
//     } finally {
//       setIsLoadingTokens(false);
//     }
//   };

//   // Handle search input change
//   const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const query = e.target.value;
//     setSearchQuery(query);

//     if (selecting === "pay") {
//       handlePayTokenSearch(query);
//     }
//     // For receive tokens, the debouncedSearch will handle it
//   };

//   return (
//     <div className="flex justify-center mt-10 relative">
//       <Card className="w-full max-w-md p-4 rounded-2xl shadow-lg bg-white text-black">
//         <h2 className="text-lg font-base text-center mb-3">Swap Tokens</h2>

//         <div className="space-y-4">
//           {/* Pay Section */}
//           <div className="p-3 rounded-xl bg-gray-100">
//             <div className="flex justify-between items-center text-sm text-gray-400 mb-1">
//               <span>You Pay</span>
//               <span>
//                 {payToken?.balance
//                   ? parseFloat(payToken.balance).toFixed(4)
//                   : "0"}
//               </span>
//             </div>
//             <div className="flex items-center justify-between gap-3">
//               <Input
//                 type="number"
//                 placeholder="0"
//                 value={payAmount}
//                 onChange={(e) => setPayAmount(e.target.value)}
//                 className="bg-transparent border-none text-2xl w-full
//                   focus:outline-gray-100 focus:ring-gray-100 focus:border-gray-100 focus-visible:ring-gray-100"
//               />
//               <button
//                 onClick={() => {
//                   setSelecting("pay");
//                   setOpenDrawer(true);
//                   setSearchQuery("");
//                 }}
//                 className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white shadow hover:bg-gray-50"
//               >
//                 <div className="flex items-center">
//                   <div className="relative min-w-max">
//                     {payToken?.logoURI && (
//                       <Image
//                         src={payToken.logoURI}
//                         alt={payToken.symbol}
//                         width={24}
//                         height={24}
//                         className="w-6 h-6 rounded-full"
//                       />
//                     )}
//                     {payToken?.chain && (
//                       <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 flex items-center justify-center w-4 h-4 border border-gray-200">
//                         <Image
//                           src={getChainIcon(payToken.chain)}
//                           alt={payToken.chain}
//                           width={12}
//                           height={12}
//                           className="w-3 h-3 rounded-full"
//                         />
//                       </div>
//                     )}
//                   </div>
//                   <div className="flex items-center ml-2">
//                     <span className="font-medium">
//                       {payToken ? payToken.symbol : "Select"}
//                     </span>
//                     <svg
//                       xmlns="http://www.w3.org/2000/svg"
//                       className="h-4 w-4 ml-1 text-gray-400"
//                       fill="none"
//                       viewBox="0 0 24 24"
//                       stroke="currentColor"
//                     >
//                       <path
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                         strokeWidth={2}
//                         d="M19 9l-7 7-7-7"
//                       />
//                     </svg>
//                   </div>
//                 </div>
//               </button>
//             </div>
//             <div className="flex gap-2 mt-2 text-xs text-gray-400">
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 className="px-2 py-1 rounded-lg bg-white"
//                 onClick={() => handlePercentageClick(0.5)}
//               >
//                 50%
//               </Button>
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 className="px-2 py-1 rounded-lg bg-white"
//                 onClick={() => handlePercentageClick(1)}
//               >
//                 Max
//               </Button>
//             </div>
//           </div>

//           {/* Flip Button */}
//           <div className="flex justify-center">
//             <button
//               onClick={handleFlip}
//               className="p-2 bg-white rounded-full hover:bg-[#f2f2f2] transition"
//             >
//               <ArrowUpDown className="w-5 h-5 text-gray-400" />
//             </button>
//           </div>

//           {/* Receive Section */}
//           <div className="p-3 rounded-xl bg-gray-100">
//             <div className="flex justify-between items-center text-sm text-gray-400 mb-1">
//               <span>You Receive</span>
//               <span>
//                 {receiveToken?.balance
//                   ? parseFloat(receiveToken.balance).toFixed(4)
//                   : "0"}
//               </span>
//             </div>
//             <div className="flex items-center justify-between">
//               <Input
//                 type="number"
//                 placeholder="0"
//                 disabled
//                 className="bg-transparent border-none text-2xl focus:ring-0 focus:outline-none w-full"
//               />
//               <button
//                 onClick={() => {
//                   setSelecting("receive");
//                   setOpenDrawer(true);
//                   setSearchQuery("");
//                 }}
//                 className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white shadow hover:bg-gray-50"
//               >
//                 {receiveToken ? (
//                   <div className="flex items-center">
//                     <div className="relative min-w-max">
//                       <Image
//                         src={receiveToken.logoURI}
//                         alt={receiveToken.symbol}
//                         width={24}
//                         height={24}
//                         className="w-6 h-6 rounded-full"
//                       />
//                       {receiveToken?.chain && (
//                         <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 flex items-center justify-center w-4 h-4 border border-gray-200">
//                           <Image
//                             src={getChainIcon(receiveToken.chain)}
//                             alt={receiveToken.chain}
//                             width={12}
//                             height={12}
//                             className="w-3 h-3 rounded-full"
//                           />
//                         </div>
//                       )}
//                     </div>
//                     <div className="flex items-center ml-2">
//                       <span className="font-medium">{receiveToken.symbol}</span>
//                       <svg
//                         xmlns="http://www.w3.org/2000/svg"
//                         className="h-4 w-4 ml-1 text-gray-400"
//                         fill="none"
//                         viewBox="0 0 24 24"
//                         stroke="currentColor"
//                       >
//                         <path
//                           strokeLinecap="round"
//                           strokeLinejoin="round"
//                           strokeWidth={2}
//                           d="M19 9l-7 7-7-7"
//                         />
//                       </svg>
//                     </div>
//                   </div>
//                 ) : (
//                   <div className="flex items-center">
//                     <span className="font-medium">Select</span>
//                     <svg
//                       xmlns="http://www.w3.org/2000/svg"
//                       className="h-4 w-4 ml-1 text-gray-400"
//                       fill="none"
//                       viewBox="0 0 24 24"
//                       stroke="currentColor"
//                     >
//                       <path
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                         strokeWidth={2}
//                         d="M19 9l-7 7-7-7"
//                       />
//                     </svg>
//                   </div>
//                 )}
//               </button>
//             </div>
//           </div>

//           {/* Swap Button */}
//           <Button className="w-full bg-purple-600 hover:bg-purple-700">
//             Swap
//           </Button>
//         </div>
//       </Card>

//       {/* Token Select Drawer */}
//       {openDrawer && (
//         <div className="absolute inset-0 z-10 flex items-end justify-center">
//           <div
//             className="fixed inset-0 bg-black bg-opacity-50"
//             onClick={() => {
//               setOpenDrawer(false);
//               setSearchQuery("");
//             }}
//           />
//           <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-4 max-h-[50vh] overflow-y-auto z-20">
//             <div className="mb-4">
//               <p className="font-medium text-lg mb-2">
//                 {selecting === "pay"
//                   ? "Select Token to Pay"
//                   : "Select Token to Receive"}
//               </p>
//               <Input
//                 placeholder="Search token name or symbol"
//                 value={searchQuery}
//                 onChange={handleSearchChange}
//                 className="w-full"
//               />
//             </div>

//             {isLoadingTokens ? (
//               <div className="flex justify-center py-8">
//                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
//               </div>
//             ) : (
//               <div className="space-y-2">
//                 {availableTokens
//                   .filter((token: any) =>
//                     selecting === "pay"
//                       ? token.address !== receiveToken?.address
//                       : token.address !== payToken?.address
//                   )
//                   .map((token: any) => (
//                     <button
//                       key={token.address}
//                       onClick={() => {
//                         if (selecting === "pay") {
//                           setPayToken(token);
//                         } else {
//                           setReceiveToken(token);
//                         }
//                         setOpenDrawer(false);
//                         setSearchQuery("");
//                       }}
//                       className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-100 transition"
//                     >
//                       <div className="relative">
//                         {token.logoURI && (
//                           <Image
//                             src={token.logoURI}
//                             alt={token.symbol}
//                             width={24}
//                             height={24}
//                             className="w-6 h-6 rounded-full"
//                           />
//                         )}
//                         {token.chain && (
//                           <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 flex items-center justify-center w-4 h-4 border border-gray-200">
//                             <Image
//                               src={getChainIcon(token.chain)}
//                               alt={token.chain}
//                               width={12}
//                               height={12}
//                               className="w-3 h-3 rounded-full"
//                             />
//                           </div>
//                         )}
//                       </div>
//                       <div className="flex justify-between w-full items-center">
//                         <div className="text-left">
//                           <p className="font-medium">{token.symbol}</p>
//                           <p className="text-xs text-gray-500">{token.name}</p>
//                         </div>
//                         {token.balance && (
//                           <span className="text-gray-400 text-sm">
//                             {parseFloat(token.balance).toFixed(4)}
//                           </span>
//                         )}
//                       </div>
//                     </button>
//                   ))}

//                 {!isLoadingTokens && availableTokens.length === 0 && (
//                   <div className="text-center py-4 text-gray-500">
//                     No tokens found
//                   </div>
//                 )}
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// "use client";

// import { useEffect, useState, useCallback } from "react";
// import { Card } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { ArrowUpDown } from "lucide-react";
// import Image from "next/image";
// import { debounce } from "lodash";
// import { fetchTokensFromLiFi } from "@/actions/lifiForTokenSwap";

// const getChainIcon = (chainName: string) => {
//   const chainIcons: Record<string, string> = {
//     SOLANA: "/images/IconShop/solana@2x.png",
//     ETHEREUM: "/images/IconShop/ethereum.png",
//     BSC: "/images/IconShop/binance-smart-chain.png",
//     POLYGON: "/images/IconShop/polygon.png",
//     ARBITRUM: "/images/IconShop/arbitrum.png",
//   };
//   return chainIcons[chainName.toUpperCase()] || null;
// };

// const getChainId = (chainName: string) => {
//   const chainIds: Record<string, string> = {
//     SOLANA: "1151111081099710",
//     ETHEREUM: "1",
//     BSC: "56",
//     POLYGON: "137",
//     ARBITRUM: "42161",
//   };
//   return chainIds[chainName.toUpperCase()] || "1";
// };

// export default function SwapTokenModal({ tokens }: { tokens: any[] }) {
//   // State management
//   const [payToken, setPayToken] = useState<any>(tokens?.[0] || null);
//   const [receiveToken, setReceiveToken] = useState<any>(null);
//   const [payAmount, setPayAmount] = useState("");
//   const [receiveAmount, setReceiveAmount] = useState("");
//   const [openDrawer, setOpenDrawer] = useState(false);
//   const [selecting, setSelecting] = useState<"pay" | "receive" | null>(null);
//   const [availableTokens, setAvailableTokens] = useState<any[]>([]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [isLoadingTokens, setIsLoadingTokens] = useState(false);
//   const [isCalculating, setIsCalculating] = useState(false);
//   const [chainId, setChainId] = useState("1151111081099710");

//   console.log("payToken", payToken);
//   console.log("receiveToken", receiveToken);

//   // Set chain ID based on payToken
//   useEffect(() => {
//     if (payToken?.chain) {
//       setChainId(getChainId(payToken.chain));
//     }
//   }, [payToken]);

//   // Debounced token search for receive tokens
//   const debouncedSearch = useCallback(
//     debounce(async (query: string, chain: string) => {
//       setIsLoadingTokens(true);
//       try {
//         const tokens = await fetchTokensFromLiFi(chain, query);

//         let result = tokens;

//         if (query) {
//           const lowerQuery = query.toLowerCase();

//           // Sort tokens: exact matches first, then startsWith, then includes
//           result = [...tokens].sort((a, b) => {
//             const aSymbol = a.symbol?.toLowerCase() || "";
//             const bSymbol = b.symbol?.toLowerCase() || "";

//             // Exact match first
//             if (aSymbol === lowerQuery && bSymbol !== lowerQuery) return -1;
//             if (bSymbol === lowerQuery && aSymbol !== lowerQuery) return 1;

//             // StartsWith match next
//             if (
//               aSymbol.startsWith(lowerQuery) &&
//               !bSymbol.startsWith(lowerQuery)
//             )
//               return -1;
//             if (
//               bSymbol.startsWith(lowerQuery) &&
//               !aSymbol.startsWith(lowerQuery)
//             )
//               return 1;

//             // Includes match next
//             if (aSymbol.includes(lowerQuery) && !bSymbol.includes(lowerQuery))
//               return -1;
//             if (bSymbol.includes(lowerQuery) && !aSymbol.includes(lowerQuery))
//               return 1;

//             return 0;
//           });
//         }

//         setAvailableTokens(result.slice(0, 20));
//       } catch (error) {
//         console.error("Error fetching tokens:", error);
//       } finally {
//         setIsLoadingTokens(false);
//       }
//     }, 400),
//     []
//   );

//   // Fetch tokens when chainId or searchQuery changes (for receive tokens)
//   useEffect(() => {
//     if (openDrawer && selecting === "receive") {
//       debouncedSearch(searchQuery, chainId);
//     }
//     return () => debouncedSearch.cancel();
//   }, [searchQuery, chainId, openDrawer, selecting, debouncedSearch]);

//   // Initialize with first 20 tokens when drawer opens for pay tokens
//   useEffect(() => {
//     if (openDrawer && selecting === "pay") {
//       setAvailableTokens(tokens.slice(0, 20));
//     }
//   }, [openDrawer, selecting, tokens]);

//   // Debounced pay amount handler
//   const debouncedSetPayAmount = useCallback(
//     debounce((value: string) => {
//       setPayAmount(value);
//     }, 300),
//     []
//   );

//   const handlePayAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value;
//     setPayAmount(value);
//     debouncedSetPayAmount(value);
//   };

//   // Calculate receive amount based on pay amount and token prices
//   const calculateExchange = useCallback(() => {
//     if (!payToken || !receiveToken || !payAmount) {
//       setReceiveAmount("");
//       return;
//     }

//     const payAmountNum = parseFloat(payAmount);
//     if (isNaN(payAmountNum)) {
//       setReceiveAmount("");
//       return;
//     }

//     setIsCalculating(true);

//     const payPrice = parseFloat(payToken.balance || "0");
//     const receivePrice = parseFloat(receiveToken.priceUSD || "0");

//     // Handle zero prices
//     if (payPrice <= 0 || receivePrice <= 0) {
//       setReceiveAmount("Price data unavailable");
//       setIsCalculating(false);
//       return;
//     }

//     // Handle division by zero
//     if (receivePrice === 0) {
//       setReceiveAmount("Invalid price");
//       setIsCalculating(false);
//       return;
//     }

//     const calculatedAmount = (payAmountNum * payPrice) / receivePrice;

//     // Format based on the token's decimals
//     const decimals = receiveToken.decimals || 6;
//     const formattedAmount = calculatedAmount.toFixed(decimals);

//     setReceiveAmount(formattedAmount);
//     setIsCalculating(false);
//   }, [payAmount, payToken, receiveToken]);

//   // Debounced calculation effect
//   useEffect(() => {
//     const debouncedCalculation = debounce(calculateExchange, 300);
//     debouncedCalculation();

//     return () => debouncedCalculation.cancel();
//   }, [calculateExchange]);

//   const handleFlip = () => {
//     const tempToken = payToken;
//     const tempAmount = payAmount;

//     setPayToken(receiveToken);
//     setReceiveToken(tempToken);
//     setPayAmount(receiveAmount);
//     setReceiveAmount(tempAmount);
//   };

//   const handlePercentageClick = (percentage: number) => {
//     if (payToken?.balance) {
//       const amount = (parseFloat(payToken.balance) * percentage).toString();
//       setPayAmount(amount);
//     }
//   };

//   // Handle token selection
//   const handleTokenSelect = (token: any, type: "pay" | "receive") => {
//     if (type === "pay") {
//       setPayToken(token);
//     } else {
//       setReceiveToken(token);
//     }
//     setOpenDrawer(false);
//     setSearchQuery("");
//   };

//   // Local search for pay tokens
//   const handlePayTokenSearch = (query: string) => {
//     setIsLoadingTokens(true);
//     try {
//       const results = tokens.filter(
//         (token: any) =>
//           token.symbol.toLowerCase().includes(query.toLowerCase()) ||
//           token.name.toLowerCase().includes(query.toLowerCase())
//       );
//       setAvailableTokens(results.slice(0, query ? 50 : 20));
//     } catch (error) {
//       console.error("Error filtering tokens:", error);
//     } finally {
//       setIsLoadingTokens(false);
//     }
//   };

//   // Handle search input change
//   const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const query = e.target.value;
//     setSearchQuery(query);

//     if (selecting === "pay") {
//       handlePayTokenSearch(query);
//     }
//   };

//   return (
//     <div className="flex justify-center mt-10 relative">
//       <Card className="w-full max-w-md p-4 rounded-2xl shadow-lg bg-white text-black">
//         <h2 className="text-lg font-base text-center mb-3">Swap Tokens</h2>

//         <div className="space-y-4">
//           {/* Pay Section */}
//           <div className="p-3 rounded-xl bg-gray-100">
//             <div className="flex justify-between items-center text-sm text-gray-400 mb-1">
//               <span>You Pay</span>
//               <span>
//                 {payToken?.balance
//                   ? parseFloat(payToken.balance).toFixed(4)
//                   : "0"}
//               </span>
//             </div>
//             <div className="flex items-center justify-between gap-3">
//               <Input
//                 type="number"
//                 placeholder="0"
//                 value={payAmount}
//                 onChange={handlePayAmountChange}
//                 className="bg-transparent border-none text-2xl w-full
//                   focus:outline-gray-100 focus:ring-gray-100 focus:border-gray-100 focus-visible:ring-gray-100"
//               />
//               <button
//                 onClick={() => {
//                   setSelecting("pay");
//                   setOpenDrawer(true);
//                   setSearchQuery("");
//                 }}
//                 className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white shadow hover:bg-gray-50"
//               >
//                 <div className="flex items-center">
//                   <div className="relative min-w-max">
//                     {payToken?.logoURI && (
//                       <Image
//                         src={payToken.logoURI}
//                         alt={payToken.symbol}
//                         width={24}
//                         height={24}
//                         className="w-6 h-6 rounded-full"
//                       />
//                     )}
//                     {payToken?.chain && (
//                       <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 flex items-center justify-center w-4 h-4 border border-gray-200">
//                         <Image
//                           src={getChainIcon(payToken.chain)}
//                           alt={payToken.chain}
//                           width={12}
//                           height={12}
//                           className="w-3 h-3 rounded-full"
//                         />
//                       </div>
//                     )}
//                   </div>
//                   <div className="flex items-center ml-2">
//                     <span className="font-medium">
//                       {payToken ? payToken.symbol : "Select"}
//                     </span>
//                     <svg
//                       xmlns="http://www.w3.org/2000/svg"
//                       className="h-4 w-4 ml-1 text-gray-400"
//                       fill="none"
//                       viewBox="0 0 24 24"
//                       stroke="currentColor"
//                     >
//                       <path
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                         strokeWidth={2}
//                         d="M19 9l-7 7-7-7"
//                       />
//                     </svg>
//                   </div>
//                 </div>
//               </button>
//             </div>
//             <div className="flex gap-2 mt-2 text-xs text-gray-400">
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 className="px-2 py-1 rounded-lg bg-white"
//                 onClick={() => handlePercentageClick(0.5)}
//               >
//                 50%
//               </Button>
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 className="px-2 py-1 rounded-lg bg-white"
//                 onClick={() => handlePercentageClick(1)}
//               >
//                 Max
//               </Button>
//             </div>
//           </div>

//           {/* Flip Button */}
//           <div className="flex justify-center">
//             <button
//               onClick={handleFlip}
//               className="p-2 bg-white rounded-full hover:bg-[#f2f2f2] transition"
//             >
//               <ArrowUpDown className="w-5 h-5 text-gray-400" />
//             </button>
//           </div>

//           {/* Receive Section */}
//           <div className="p-3 rounded-xl bg-gray-100">
//             <div className="flex justify-between items-center text-sm text-gray-400 mb-1">
//               <span>You Receive</span>
//               <span>
//                 {receiveToken?.balance
//                   ? parseFloat(receiveToken.balance).toFixed(4)
//                   : "0"}
//               </span>
//             </div>
//             <div className="flex items-center justify-between">
//               <Input
//                 type="number"
//                 placeholder="0"
//                 value={isCalculating ? "Calculating..." : receiveAmount}
//                 disabled
//                 className="bg-transparent border-none text-2xl focus:ring-0 focus:outline-none w-full"
//               />
//               <button
//                 onClick={() => {
//                   setSelecting("receive");
//                   setOpenDrawer(true);
//                   setSearchQuery("");
//                 }}
//                 className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white shadow hover:bg-gray-50"
//               >
//                 {receiveToken ? (
//                   <div className="flex items-center">
//                     <div className="relative min-w-max">
//                       <Image
//                         src={receiveToken.logoURI}
//                         alt={receiveToken.symbol}
//                         width={24}
//                         height={24}
//                         className="w-6 h-6 rounded-full"
//                       />
//                       {receiveToken?.chain && (
//                         <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 flex items-center justify-center w-4 h-4 border border-gray-200">
//                           <Image
//                             src={getChainIcon(receiveToken.chain)}
//                             alt={receiveToken.chain}
//                             width={12}
//                             height={12}
//                             className="w-3 h-3 rounded-full"
//                           />
//                         </div>
//                       )}
//                     </div>
//                     <div className="flex items-center ml-2">
//                       <span className="font-medium">{receiveToken.symbol}</span>
//                       <svg
//                         xmlns="http://www.w3.org/2000/svg"
//                         className="h-4 w-4 ml-1 text-gray-400"
//                         fill="none"
//                         viewBox="0 0 24 24"
//                         stroke="currentColor"
//                       >
//                         <path
//                           strokeLinecap="round"
//                           strokeLinejoin="round"
//                           strokeWidth={2}
//                           d="M19 9l-7 7-7-7"
//                         />
//                       </svg>
//                     </div>
//                   </div>
//                 ) : (
//                   <div className="flex items-center">
//                     <span className="font-medium">Select</span>
//                     <svg
//                       xmlns="http://www.w3.org/2000/svg"
//                       className="h-4 w-4 ml-1 text-gray-400"
//                       fill="none"
//                       viewBox="0 0 24 24"
//                       stroke="currentColor"
//                     >
//                       <path
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                         strokeWidth={2}
//                         d="M19 9l-7 7-7-7"
//                       />
//                     </svg>
//                   </div>
//                 )}
//               </button>
//             </div>
//           </div>

//           {/* Exchange Rate Display */}
//           {payToken &&
//             receiveToken &&
//             payAmount &&
//             receiveAmount &&
//             !isCalculating && (
//               <div className="text-center text-sm text-gray-500">
//                 1 {payToken.symbol} ={" "}
//                 {(
//                   parseFloat(payToken.balance || "0") /
//                   parseFloat(receiveToken.priceUSD || "1")
//                 ).toFixed(6)}{" "}
//                 {receiveToken.symbol}
//               </div>
//             )}

//           {/* Swap Button */}
//           <Button
//             className="w-full bg-purple-600 hover:bg-purple-700"
//             disabled={!payAmount || !receiveAmount || isCalculating}
//           >
//             {isCalculating ? "Calculating..." : "Swap"}
//           </Button>
//         </div>
//       </Card>

//       {/* Token Select Drawer */}
//       {openDrawer && (
//         <div className="absolute inset-0 z-10 flex items-end justify-center">
//           <div
//             className="fixed inset-0 bg-black bg-opacity-50"
//             onClick={() => {
//               setOpenDrawer(false);
//               setSearchQuery("");
//             }}
//           />
//           <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-4 max-h-[50vh] overflow-y-auto z-20">
//             <div className="mb-4">
//               <p className="font-medium text-lg mb-2">
//                 {selecting === "pay"
//                   ? "Select Token to Pay"
//                   : "Select Token to Receive"}
//               </p>
//               <Input
//                 placeholder="Search token name or symbol"
//                 value={searchQuery}
//                 onChange={handleSearchChange}
//                 className="w-full"
//               />
//             </div>

//             {isLoadingTokens ? (
//               <div className="flex justify-center py-8">
//                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
//               </div>
//             ) : (
//               <div className="space-y-2">
//                 {availableTokens
//                   .filter((token: any) =>
//                     selecting === "pay"
//                       ? token.address !== receiveToken?.address
//                       : token.address !== payToken?.address
//                   )
//                   .map((token: any) => (
//                     <button
//                       key={token.address}
//                       onClick={() => handleTokenSelect(token, selecting!)}
//                       className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-100 transition"
//                     >
//                       <div className="relative">
//                         {token.logoURI && (
//                           <Image
//                             src={token.logoURI}
//                             alt={token.symbol}
//                             width={24}
//                             height={24}
//                             className="w-6 h-6 rounded-full"
//                           />
//                         )}
//                         {token.chain && (
//                           <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 flex items-center justify-center w-4 h-4 border border-gray-200">
//                             <Image
//                               src={getChainIcon(token.chain)}
//                               alt={token.chain}
//                               width={12}
//                               height={12}
//                               className="w-3 h-3 rounded-full"
//                             />
//                           </div>
//                         )}
//                       </div>
//                       <div className="flex justify-between w-full items-center">
//                         <div className="text-left">
//                           <p className="font-medium">{token.symbol}</p>
//                           <p className="text-xs text-gray-500">{token.name}</p>
//                         </div>
//                         {token.balance && (
//                           <span className="text-gray-400 text-sm">
//                             {parseFloat(token.balance).toFixed(4)}
//                           </span>
//                         )}
//                       </div>
//                     </button>
//                   ))}

//                 {!isLoadingTokens && availableTokens.length === 0 && (
//                   <div className="text-center py-4 text-gray-500">
//                     No tokens found
//                   </div>
//                 )}
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUpDown } from "lucide-react";
import Image from "next/image";
import { debounce } from "lodash";
import { fetchTokensFromLiFi } from "@/actions/lifiForTokenSwap";

const getChainIcon = (chainName: string) => {
  const chainIcons: Record<string, string> = {
    SOLANA: "/images/IconShop/solana@2x.png",
    ETHEREUM: "/images/IconShop/ethereum.png",
    BSC: "/images/IconShop/binance-smart-chain.png",
    POLYGON: "/images/IconShop/polygon.png",
    ARBITRUM: "/images/IconShop/arbitrum.png",
  };
  return chainIcons[chainName.toUpperCase()] || null;
};

const getChainId = (chainName: string) => {
  const chainIds: Record<string, string> = {
    SOLANA: "1151111081099710",
    ETHEREUM: "1",
    BSC: "56",
    POLYGON: "137",
    ARBITRUM: "42161",
  };
  return chainIds[chainName.toUpperCase()] || "1";
};

// Helper function to get token price from any structure
const getTokenPrice = (token: any): number => {
  if (!token) return 0;

  // Check different possible locations for price
  if (token.marketData?.price) {
    return parseFloat(token.marketData.price);
  }
  if (token.priceUSD) {
    return parseFloat(token.priceUSD);
  }
  if (token.price) {
    return parseFloat(token.price);
  }
  return 0;
};

export default function SwapTokenModal({ tokens }: { tokens: any[] }) {
  // State management
  const [payToken, setPayToken] = useState<any>(tokens?.[0] || null);
  const [receiveToken, setReceiveToken] = useState<any>(null);
  const [payAmount, setPayAmount] = useState("");
  const [receiveAmount, setReceiveAmount] = useState("");
  const [openDrawer, setOpenDrawer] = useState(false);
  const [selecting, setSelecting] = useState<"pay" | "receive" | null>(null);
  const [availableTokens, setAvailableTokens] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [chainId, setChainId] = useState("1151111081099710");

  // Set chain ID based on payToken
  useEffect(() => {
    if (payToken?.chain) {
      setChainId(getChainId(payToken.chain));
    }
  }, [payToken]);

  // Debounced token search for receive tokens
  const debouncedSearch = useCallback(
    debounce(async (query: string, chain: string) => {
      setIsLoadingTokens(true);
      try {
        const tokens = await fetchTokensFromLiFi(chain, query);

        let result = tokens;

        if (query) {
          const lowerQuery = query.toLowerCase();
          result = [...tokens].sort((a, b) => {
            const aSymbol = a.symbol?.toLowerCase() || "";
            const bSymbol = b.symbol?.toLowerCase() || "";

            if (aSymbol === lowerQuery && bSymbol !== lowerQuery) return -1;
            if (bSymbol === lowerQuery && aSymbol !== lowerQuery) return 1;
            if (
              aSymbol.startsWith(lowerQuery) &&
              !bSymbol.startsWith(lowerQuery)
            )
              return -1;
            if (
              bSymbol.startsWith(lowerQuery) &&
              !aSymbol.startsWith(lowerQuery)
            )
              return 1;
            if (aSymbol.includes(lowerQuery) && !bSymbol.includes(lowerQuery))
              return -1;
            if (bSymbol.includes(lowerQuery) && !aSymbol.includes(lowerQuery))
              return 1;
            return 0;
          });
        }

        setAvailableTokens(result.slice(0, 20));
      } catch (error) {
        console.error("Error fetching tokens:", error);
      } finally {
        setIsLoadingTokens(false);
      }
    }, 400),
    []
  );

  // Fetch tokens when chainId or searchQuery changes (for receive tokens)
  useEffect(() => {
    if (openDrawer && selecting === "receive") {
      debouncedSearch(searchQuery, chainId);
    }
    return () => debouncedSearch.cancel();
  }, [searchQuery, chainId, openDrawer, selecting, debouncedSearch]);

  // Initialize with first 20 tokens when drawer opens for pay tokens
  useEffect(() => {
    if (openDrawer && selecting === "pay") {
      setAvailableTokens(tokens.slice(0, 20));
    }
  }, [openDrawer, selecting, tokens]);

  // Debounced pay amount handler
  const debouncedSetPayAmount = useCallback(
    debounce((value: string) => {
      setPayAmount(value);
    }, 300),
    []
  );

  const handlePayAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPayAmount(value);
    debouncedSetPayAmount(value);
  };

  // Calculate receive amount based on pay amount and token prices
  const calculateExchange = useCallback(() => {
    if (!payToken || !receiveToken || !payAmount) {
      setReceiveAmount("");
      return;
    }

    const payAmountNum = parseFloat(payAmount);
    if (isNaN(payAmountNum)) {
      setReceiveAmount("");
      return;
    }

    setIsCalculating(true);

    // ✅ CORRECT: Use the helper function to get prices from any structure
    const payPrice = getTokenPrice(payToken);
    const receivePrice = getTokenPrice(receiveToken);

    console.log("Pay price:", payPrice, "Receive price:", receivePrice);

    // Handle zero prices
    if (payPrice <= 0 || receivePrice <= 0) {
      setReceiveAmount("Price data unavailable");
      setIsCalculating(false);
      return;
    }

    // Handle division by zero
    if (receivePrice === 0) {
      setReceiveAmount("Invalid price");
      setIsCalculating(false);
      return;
    }

    const calculatedAmount = (payAmountNum * payPrice) / receivePrice;

    // Format based on the token's decimals
    const decimals = receiveToken.decimals || 6;
    const formattedAmount = calculatedAmount.toFixed(decimals);

    setReceiveAmount(formattedAmount);
    setIsCalculating(false);
  }, [payAmount, payToken, receiveToken]);

  // Debounced calculation effect
  useEffect(() => {
    const debouncedCalculation = debounce(calculateExchange, 300);
    debouncedCalculation();

    return () => debouncedCalculation.cancel();
  }, [calculateExchange]);

  const handleFlip = () => {
    const tempToken = payToken;
    const tempAmount = payAmount;

    setPayToken(receiveToken);
    setReceiveToken(tempToken);
    setPayAmount(receiveAmount);
    setReceiveAmount(tempAmount);
  };

  const handlePercentageClick = (percentage: number) => {
    if (payToken?.balance) {
      const amount = (parseFloat(payToken.balance) * percentage).toString();
      setPayAmount(amount);
    }
  };

  // Handle token selection
  const handleTokenSelect = (token: any, type: "pay" | "receive") => {
    if (type === "pay") {
      setPayToken(token);
    } else {
      setReceiveToken(token);
    }
    setOpenDrawer(false);
    setSearchQuery("");
  };

  // Local search for pay tokens
  const handlePayTokenSearch = (query: string) => {
    setIsLoadingTokens(true);
    try {
      const results = tokens.filter(
        (token: any) =>
          token.symbol.toLowerCase().includes(query.toLowerCase()) ||
          token.name.toLowerCase().includes(query.toLowerCase())
      );
      setAvailableTokens(results.slice(0, query ? 50 : 20));
    } catch (error) {
      console.error("Error filtering tokens:", error);
    } finally {
      setIsLoadingTokens(false);
    }
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (selecting === "pay") {
      handlePayTokenSearch(query);
    }
  };

  // Calculate exchange rate for display
  const exchangeRate =
    payToken && receiveToken
      ? getTokenPrice(payToken) / getTokenPrice(receiveToken)
      : 0;

  return (
    <div className="flex justify-center mt-10 relative">
      <Card className="w-full max-w-md p-4 rounded-2xl shadow-lg bg-white text-black">
        <h2 className="text-lg font-base text-center mb-3">Swap Tokens</h2>

        <div className="space-y-4">
          {/* Pay Section */}
          <div className="p-3 rounded-xl bg-gray-100">
            <div className="flex justify-between items-center text-sm text-gray-400 mb-1">
              <span>You Pay</span>
              <span>
                {payToken?.balance
                  ? parseFloat(payToken.balance).toFixed(4)
                  : "0"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Input
                type="number"
                placeholder="0"
                value={payAmount}
                onChange={handlePayAmountChange}
                className="bg-transparent border-none text-2xl w-full
                  focus:outline-gray-100 focus:ring-gray-100 focus:border-gray-100 focus-visible:ring-gray-100"
              />
              <button
                onClick={() => {
                  setSelecting("pay");
                  setOpenDrawer(true);
                  setSearchQuery("");
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white shadow hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <div className="relative min-w-max">
                    {payToken?.logoURI && (
                      <Image
                        src={payToken.logoURI}
                        alt={payToken.symbol}
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    {payToken?.chain && (
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 flex items-center justify-center w-4 h-4 border border-gray-200">
                        <Image
                          src={getChainIcon(payToken.chain)}
                          alt={payToken.chain}
                          width={12}
                          height={12}
                          className="w-3 h-3 rounded-full"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center ml-2">
                    <span className="font-medium">
                      {payToken ? payToken.symbol : "Select"}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 ml-1 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            </div>
            <div className="flex gap-2 mt-2 text-xs text-gray-400">
              <Button
                variant="ghost"
                size="sm"
                className="px-2 py-1 rounded-lg bg-white"
                onClick={() => handlePercentageClick(0.5)}
              >
                50%
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="px-2 py-1 rounded-lg bg-white"
                onClick={() => handlePercentageClick(1)}
              >
                Max
              </Button>
            </div>
          </div>

          {/* Flip Button */}
          <div className="flex justify-center">
            <button
              onClick={handleFlip}
              className="p-2 bg-white rounded-full hover:bg-[#f2f2f2] transition"
            >
              <ArrowUpDown className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Receive Section */}
          <div className="p-3 rounded-xl bg-gray-100">
            <div className="flex justify-between items-center text-sm text-gray-400 mb-1">
              <span>You Receive</span>
              <span>
                {receiveToken?.balance
                  ? parseFloat(receiveToken.balance).toFixed(4)
                  : "0"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <Input
                type="number"
                placeholder="0"
                value={isCalculating ? "Calculating..." : receiveAmount}
                disabled
                className="bg-transparent border-none text-2xl focus:ring-0 focus:outline-none w-full"
              />
              <button
                onClick={() => {
                  setSelecting("receive");
                  setOpenDrawer(true);
                  setSearchQuery("");
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white shadow hover:bg-gray-50"
              >
                {receiveToken ? (
                  <div className="flex items-center">
                    <div className="relative min-w-max">
                      <Image
                        src={receiveToken.logoURI}
                        alt={receiveToken.symbol}
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded-full"
                      />
                      {receiveToken?.chain && (
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 flex items-center justify-center w-4 h-4 border border-gray-200">
                          <Image
                            src={getChainIcon(receiveToken.chain)}
                            alt={receiveToken.chain}
                            width={12}
                            height={12}
                            className="w-3 h-3 rounded-full"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center ml-2">
                      <span className="font-medium">{receiveToken.symbol}</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 ml-1 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span className="font-medium">Select</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 ml-1 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Exchange Rate Display */}
          {payToken && receiveToken && exchangeRate > 0 && (
            <div className="text-center text-sm text-gray-500">
              1 {payToken.symbol} = {exchangeRate.toFixed(6)}{" "}
              {receiveToken.symbol}
            </div>
          )}

          {/* Swap Button */}
          <Button
            className="w-full bg-purple-600 hover:bg-purple-700"
            disabled={!payAmount || !receiveAmount || isCalculating}
          >
            {isCalculating ? "Calculating..." : "Swap"}
          </Button>
        </div>
      </Card>

      {/* Token Select Drawer */}
      {openDrawer && (
        <div className="absolute inset-0 z-10 flex items-end justify-center">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => {
              setOpenDrawer(false);
              setSearchQuery("");
            }}
          />
          <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-4 max-h-[50vh] overflow-y-auto z-20">
            <div className="mb-4">
              <p className="font-medium text-lg mb-2">
                {selecting === "pay"
                  ? "Select Token to Pay"
                  : "Select Token to Receive"}
              </p>
              <Input
                placeholder="Search token name or symbol"
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full"
              />
            </div>

            {isLoadingTokens ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {availableTokens
                  .filter((token: any) =>
                    selecting === "pay"
                      ? token.address !== receiveToken?.address
                      : token.address !== payToken?.address
                  )
                  .map((token: any) => (
                    <button
                      key={token.address}
                      onClick={() => handleTokenSelect(token, selecting!)}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div className="relative">
                        {token.logoURI && (
                          <Image
                            src={token.logoURI}
                            alt={token.symbol}
                            width={24}
                            height={24}
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        {token.chain && (
                          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 flex items-center justify-center w-4 h-4 border border-gray-200">
                            <Image
                              src={getChainIcon(token.chain)}
                              alt={token.chain}
                              width={12}
                              height={12}
                              className="w-3 h-3 rounded-full"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between w-full items-center">
                        <div className="text-left">
                          <p className="font-medium">{token.symbol}</p>
                          <p className="text-xs text-gray-500">{token.name}</p>
                        </div>
                        {token.balance && (
                          <span className="text-gray-400 text-sm">
                            {parseFloat(token.balance).toFixed(4)}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}

                {!isLoadingTokens && availableTokens.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No tokens found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
