"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { DialogTitle } from "@radix-ui/react-dialog";
import { TokenData } from "@/types/token";
import { ArrowUpDown } from "lucide-react";
import toast from "react-hot-toast";
import {
  createBridgePayment,
  getDBExternalAccountInfo,
  getKycInfo,
} from "@/actions/bank";
import Cookies from "js-cookie";
import { BsBank2 } from "react-icons/bs";
import { PiWalletBold } from "react-icons/pi";
import { useUser } from "@/lib/UserContext";
import { useTokenSendStore } from "@/zustandStore/TokenSendInfo";
import { useSolanaWallets } from "@privy-io/react-auth";

interface SendTokenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: TokenData;
  onNext: (amount: string, isUSD: boolean) => void;
  setSendFlow: any;
  networkFee: any;
}

export default function SendBankToken({
  open,
  onOpenChange,
  token,
  onNext,
  setSendFlow,
  networkFee,
}: SendTokenModalProps) {
  // When price is 0, force token input mode
  const hasPrice = parseFloat(token?.marketData?.price || "0") > 0;
  const [isUSD, setIsUSD] = useState(hasPrice);
  const [amount, setAmount] = useState("2.00");
  const [userId, setUserId] = useState("");
  const [externalBanks, setExternalBanks] = useState([]);
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [reviewDetails, setReviewDetails] = useState<any>(false);

  if (token.chain === "SOLANA") {
    networkFee = "0.000005";
  }

  const { wallets } = useSolanaWallets();

  console.log("wallets solanan", wallets);

  const { tokenContent, setTokenContent } = useTokenSendStore();

  const { user } = useUser();

  console.log("externalBanks", externalBanks);
  console.log("selectedBank", selectedBank);
  console.log("token", token);

  console.log("user", user);

  useEffect(() => {
    if (typeof window !== undefined) {
      const id = Cookies.get("user-id");
      if (id) {
        setUserId(id);
      }
    }
  }, []);

  useEffect(() => {
    const fetchBanks = async () => {
      const externalDBInfo = await getDBExternalAccountInfo(userId);
      setExternalBanks(externalDBInfo?.data?.accounts || []);
      console.log("externalDBInfo", externalDBInfo);
    };
    if (userId && !userId.startsWith("did:privy:cm")) {
      fetchBanks();
    }
  }, [userId]);

  // useEffect(() => {
  //     const fetchGasFee = async () => {
  //       // const nativeTokenPrice = tokens.find((token) => token.isNative)?.marketData
  //       // .price;
  //       if (token.chain === 'SOLANA') {
  //         const networkFeeUSD = (
  //           Number(networkFee) * nativeTokenPrice
  //         ).toFixed(5);
  //         setGasFeeUSD(Number(networkFeeUSD));
  //       } else {
  //         const gasFee = await calculateEVMGasFee(network);
  //         const gasFeeUSD = Number(gasFee) * nativeTokenPrice;
  //         setGasFeeUSD(Number(gasFeeUSD.toFixed(5)));
  //       }
  //     };
  //     fetchGasFee();
  //   }, [network, nativeTokenPrice, networkFee]);

  const handleNext = (amount: any, isUSD: any) => {
    if (amount < 1) {
      toast.error("Minimum 2 USDC needed to continue");
    } else if (!reviewDetails) {
      setReviewDetails(true);
    } else {
      onNext(amount, isUSD);
    }
  };
  const handleSend = async (amount: any, isUSD: any) => {
    // const kycData = await getKycInfo(user?._id);
    const externalData = await getDBExternalAccountInfo(user?._id);
    console.log("externalData", externalData);

    console.log("options for bank", {
      network: token?.chain?.toLowerCase(),
      walletAddress: wallets[0]?.address,
      id: externalData.data.accounts[0].id,
      customerId: externalData.data.accounts[0].customer_id,
      amount: amount,
      networkFee: networkFee,
    });

    const response = await createBridgePayment(
      token?.chain?.toLowerCase(),
      wallets[0]?.address,
      externalData.data.accounts[0].id,
      externalData.data.accounts[0].customer_id,
      amount
    );
    console.log("send bank response", response);

    setTokenContent({
      networkFee: 0,
      transferFee: Number(token.balance),
      bankReceived: Number(token.balance) - Number(token.balance) * 0.05,
      walletAddress: response,
    });
    onNext(amount, isUSD);
    setSendFlow((prev: any) => ({
      ...prev,
      step: "bank-confirm",
      recipient: {
        address: response
      },
    }));
  };

  const maxUSDAmount =
    !token || !hasPrice
      ? "0.00"
      : (
          parseFloat(token.balance) * parseFloat(token.marketData.price)
        ).toFixed(2);

  const convertUSDToToken = (usdAmount: number) => {
    if (!token?.marketData.price || !hasPrice) return "0";
    const price = parseFloat(token.marketData.price);
    return (usdAmount / price).toFixed(4);
  };

  const convertTokenToUSD = (tokenAmount: number) => {
    if (!token?.marketData.price || !hasPrice) return "0";
    return (tokenAmount * parseFloat(token.marketData.price)).toFixed(2);
  };

  const handleInput = (value: string) => {
    if (!token) return;

    // Remove non-numeric/decimal characters and multiple decimals
    const sanitizedValue = value
      .replace(/[^0-9.]/g, "")
      .replace(/(\..*)\./g, "$1");

    // Handle empty or just decimal input
    if (sanitizedValue === "" || sanitizedValue === ".") {
      setAmount("0");
      return;
    }

    // Remove leading zeros unless it's a decimal (e.g. 0.123)
    const normalizedValue = sanitizedValue.replace(/^0+(?=\d)/, "");

    const numericValue = parseFloat(normalizedValue);
    if (isNaN(numericValue)) return;

    if (isUSD && hasPrice) {
      const maxUSD = parseFloat(maxUSDAmount);
      if (numericValue > maxUSD) {
        setAmount(maxUSDAmount);
      } else {
        setAmount(normalizedValue);
      }
    } else {
      const maxToken = parseFloat(token.balance);
      if (numericValue > maxToken) {
        setAmount(token.balance);
      } else {
        setAmount(normalizedValue);
      }
    }
  };

  const toggleCurrency = () => {
    if (!token || !hasPrice) return;

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) return;

    setIsUSD((prev) => {
      if (prev) {
        // Converting from USD to Token
        setAmount(convertUSDToToken(numericAmount));
      } else {
        // Converting from Token to USD
        setAmount(convertTokenToUSD(numericAmount));
      }
      return !prev;
    });
  };

  const getOppositeAmount = () => {
    if (!token || !hasPrice) return "0";

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) return "0";

    if (isUSD) {
      return convertUSDToToken(numericAmount);
    } else {
      return convertTokenToUSD(numericAmount);
    }
  };

  if (!token) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle>
        <span className="sr-only">Token send</span>
      </DialogTitle>

      <DialogContent className="max-w-xl p-6 rounded-3xl bg-gray-50">
        {externalBanks.length > 0 && selectedBank && !reviewDetails ? (
          <div>
            <button
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100 transition-colors"
            >
              <span className="sr-only">Close</span>
            </button>

            <div className="flex justify-center mt-10">
              <div>
                <span className="text-3xl font-medium">
                  {isUSD && hasPrice ? "USDC" : token.symbol}
                </span>
              </div>
            </div>

            <div className="text-center mb-1 flex justify-center items-center gap-4">
              <div>
                <Button
                  onClick={() => {
                    const maxAmount =
                      isUSD && hasPrice ? maxUSDAmount : token.balance;
                    handleInput(maxAmount);
                  }}
                  className="rounded-full bg-slate-300 p-6"
                  variant="outline"
                  size="icon"
                >
                  <span className="font-semibold text-xs text-muted-foreground">
                    MAX
                  </span>
                </Button>
              </div>
              {/* Amount Input */}
              <div className="relative inline-flex items-center">
                {isUSD && hasPrice && (
                  <span className="text-4xl font-medium mr-1">$</span>
                )}
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => handleInput(e.target.value)}
                  className="text-4xl font-medium bg-transparent w-40 text-center focus:outline-none"
                  placeholder="0.00"
                />
              </div>
              {/* Toggle */}
              {hasPrice && (
                <div>
                  <Button
                    size="icon"
                    variant="outline"
                    className="rounded-full bg-slate-200 p-6"
                    onClick={toggleCurrency}
                  >
                    <ArrowUpDown className="text-muted-foreground" />
                  </Button>
                </div>
              )}
            </div>

            {hasPrice && (
              <div className="text-center mb-6">
                <span className="text-sm text-gray-500">
                  {isUSD
                    ? `${getOppositeAmount()} ${token.symbol}`
                    : `$${getOppositeAmount()}`}
                </span>
              </div>
            )}

            {/* Token Selection */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-6 shadow-medium">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full">
                  <Image
                    src={token.logoURI}
                    alt={token.name}
                    width={52}
                    height={52}
                    className="rounded-full"
                  />
                </div>
                <div>
                  <div className="font-medium">{token.name}</div>
                  <div className="text-sm text-gray-500">Your balance</div>
                </div>
              </div>
              <div className="text-right">
                {hasPrice ? (
                  <>
                    <div className="font-medium">${maxUSDAmount}</div>
                    <div className="text-sm text-gray-500">
                      {parseFloat(token.balance).toFixed(4)} {token.symbol}
                    </div>
                  </>
                ) : (
                  <div className="font-medium">
                    {parseFloat(token.balance).toFixed(4)} {token.symbol}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shadow-medium p-2 rounded-lg w-full mb-6">
              <span className="p-3 bg-gray-200 rounded-lg">
                <BsBank2 size={20} />
              </span>
              <div>
                <h3 className="font-medium">
                  {selectedBank.account_owner_name}
                </h3>
                <p className="text-gray-400">
                  {selectedBank.bank_name} ...{selectedBank.account.last_4}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl py-6"
                onClick={() => onOpenChange(false)}
              >
                Back
              </Button>
              <Button
                className="flex-1 rounded-xl py-6 bg-black text-white hover:bg-gray-800"
                onClick={() => handleNext(amount, isUSD)}
                // onClick={() => onNext(amount, isUSD)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : !selectedBank && !reviewDetails ? (
          <div>
            <h2 className="text-lg font-semibold mb-3">Select Bank</h2>
            {externalBanks.map((bank: any, index) => (
              <button
                onClick={() => setSelectedBank(bank)}
                key={index}
                className="flex items-center gap-3 shadow-medium p-2 rounded-lg w-full"
              >
                <span className="p-3 bg-gray-200 rounded-lg">
                  <BsBank2 size={20} />
                </span>
                <div>
                  <h3 className="font-medium">{bank.account_owner_name}</h3>
                  <p className="text-gray-400">
                    {bank.bank_name} ...{bank.account.last_4}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-semibold mb-3">Review Details</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full">
                  <Image
                    src={token.logoURI}
                    alt={token.name}
                    width={52}
                    height={52}
                    className="rounded-full"
                  />
                </div>
                <div>
                  <p className="text-gray-400">You Send</p>
                  <p>
                    {parseFloat(token.balance).toFixed(4)} {token.symbol}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                  <PiWalletBold size={20} />
                </div>
                <div>
                  <p className="text-gray-400">To</p>
                  <p>
                    {selectedBank.bank_name} ...{selectedBank.account.last_4}
                  </p>
                </div>
              </div>
            </div>
            <hr className="my-3 text-gray-600" />
            <div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between w-full">
                  <p className="text-gray-500">From</p>
                  <p>{user?.ensName}</p>
                </div>
                <div className="flex items-center justify-between w-full">
                  <p className="text-gray-500">Account Owner Name</p>
                  <p>{selectedBank.account_owner_name}</p>
                </div>
                <div className="flex items-center justify-between w-full">
                  <p className="text-gray-500">Bank Account Number</p>
                  <p>...{selectedBank.account.last_4}</p>
                </div>
              </div>
            </div>
            <hr className="my-3 text-gray-600" />
            <div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between w-full">
                  <p className="text-gray-500">Network Fee</p>
                  <p>{networkFee}</p>
                </div>
                <div className="flex items-center justify-between w-full">
                  <p className="text-gray-500">Transfer Fee</p>
                  <p>{(Number(amount) * 0.005).toFixed(2)}</p>
                </div>
                <div className="flex items-center justify-between w-full">
                  <p className="text-gray-500">Bank Received</p>
                  <p>{parseFloat(amount) - parseFloat(amount) * 0.005}</p>
                </div>
              </div>
            </div>
            <Button
              className="rounded-xl py-6 bg-black text-white hover:bg-gray-800 mt-3 px-10 w-full"
              onClick={() => handleSend(amount, isUSD)}
              //   onClick={() => onNext(amount, isUSD)}
            >
              Send
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
