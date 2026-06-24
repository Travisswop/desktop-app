'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { sanitizeNextImageSrc } from '@/lib/sanitizeNextImageSrc';
import { DialogTitle } from '@radix-ui/react-dialog';
import { TokenData } from '@/types/token';
import { ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createBridgePayment,
  getDBExternalAccountInfo,
} from '@/actions/bank';
import Cookies from 'js-cookie';
import { BsBank2 } from 'react-icons/bs';
import { PiWalletBold } from 'react-icons/pi';
import { useUser } from '@/lib/UserContext';
import { useSolanaWalletContext } from '@/lib/context/SolanaWalletContext';
import logger from '@/utils/logger';
import { BentoCard } from '@/components/ui/bento';

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
  const hasPrice = parseFloat(token?.marketData?.price || '0') > 0;
  const [isUSD, setIsUSD] = useState(hasPrice);
  const [amount, setAmount] = useState('2.00');
  const [userId, setUserId] = useState('');
  const [externalBanks, setExternalBanks] = useState([]);
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [reviewDetails, setReviewDetails] = useState<any>(false);

  if (token.chain === 'SOLANA') {
    networkFee = '0.000005';
  }

  const { solanaWallets: wallets } = useSolanaWalletContext();

  const { user, accessToken } = useUser();

  useEffect(() => {
    if (typeof window !== undefined) {
      const id = Cookies.get('user-id');
      if (id) {
        setUserId(id);
      }
    }
  }, []);

  useEffect(() => {
    const fetchBanks = async () => {
      const externalDBInfo = await getDBExternalAccountInfo(
        userId,
        accessToken ?? ""
      );
      setExternalBanks(externalDBInfo?.data?.accounts || []);
    };
    if (userId && !userId.startsWith('did:privy:cm')) {
      fetchBanks();
    }
  }, [accessToken, userId]);

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
      toast.error('Minimum 2 USDC needed to continue');
    } else if (!reviewDetails) {
      setReviewDetails(true);
    } else {
      onNext(amount, isUSD);
    }
  };
  const handleSend = async (amount: any, isUSD: any) => {
    if (!user?._id || !accessToken || !wallets?.[0]?.address) {
      toast.error('Wallet or user information is unavailable');
      return;
    }

    // const kycData = await getKycInfo(user?._id);
    const externalData = await getDBExternalAccountInfo(
      user._id,
      accessToken
    );

    logger.info('options for bank', {
      network: token?.chain?.toLowerCase(),
      walletAddress: wallets?.[0]?.address,
      id: externalData.data.accounts[0].id,
      customerId: externalData.data.accounts[0].customer_id,
      amount: amount,
      networkFee: networkFee,
    });

    const response = await createBridgePayment(
      token?.chain?.toLowerCase(),
      wallets?.[0]?.address,
      externalData.data.accounts[0].id,
      externalData.data.accounts[0].customer_id,
      amount
    );

    onNext(amount, isUSD);
    setSendFlow((prev: any) => ({
      ...prev,
      step: 'bank-confirm',
      recipient: {
        address: response,
      },
    }));
  };

  const maxUSDAmount =
    !token || !hasPrice
      ? '0.00'
      : (
          parseFloat(token.balance) *
          (token.marketData?.price
            ? parseFloat(token.marketData.price)
            : 0)
        ).toFixed(2);

  const convertUSDToToken = (usdAmount: number) => {
    if (!token?.marketData?.price || !hasPrice) return '0';
    const price = parseFloat(token.marketData.price);
    return (usdAmount / price).toFixed(4);
  };

  const convertTokenToUSD = (tokenAmount: number) => {
    if (!token?.marketData?.price || !hasPrice) return '0';
    return (tokenAmount * parseFloat(token.marketData.price)).toFixed(
      2
    );
  };

  const handleInput = (value: string) => {
    if (!token) return;

    // Remove non-numeric/decimal characters and multiple decimals
    const sanitizedValue = value
      .replace(/[^0-9.]/g, '')
      .replace(/(\..*)\./g, '$1');

    // Handle empty or just decimal input
    if (sanitizedValue === '' || sanitizedValue === '.') {
      setAmount('0');
      return;
    }

    // Remove leading zeros unless it's a decimal (e.g. 0.123)
    const normalizedValue = sanitizedValue.replace(/^0+(?=\d)/, '');

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
    if (!token || !hasPrice) return '0';

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) return '0';

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

      <DialogContent className="max-w-xl p-6 rounded-2xl bg-gray-50">
        {externalBanks.length > 0 &&
        selectedBank &&
        !reviewDetails ? (
          <div>
            <button
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100 transition-colors"
            >
              <span className="sr-only">Close</span>
            </button>

            <div className="flex justify-center mt-10">
              <div>
                <span className="text-3xl font-medium font-mono tabular-nums">
                  {isUSD && hasPrice ? 'USDC' : token.symbol}
                </span>
              </div>
            </div>

            <div className="text-center mb-1 flex justify-center items-center gap-4">
              <div>
                <Button
                  onClick={() => {
                    const maxAmount =
                      isUSD && hasPrice
                        ? maxUSDAmount
                        : token.balance;
                    handleInput(maxAmount);
                  }}
                  className="rounded-full bg-slate-300 p-6"
                  variant="outline"
                  size="icon"
                >
                  <span className="font-semibold text-[11px] text-gray-500">
                    MAX
                  </span>
                </Button>
              </div>
              {/* Amount Input */}
              <div className="relative inline-flex items-center">
                {isUSD && hasPrice && (
                  <span className="text-4xl font-medium mr-1 font-mono tabular-nums">$</span>
                )}
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => handleInput(e.target.value)}
                  className="text-4xl font-medium font-mono tabular-nums bg-transparent w-40 text-center focus:outline-none"
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
                    <ArrowUpDown className="text-gray-500" />
                  </Button>
                </div>
              )}
            </div>

            {hasPrice && (
              <div className="text-center mb-6">
                <span className="text-[13px] text-gray-500 font-mono tabular-nums">
                  {isUSD
                    ? `${getOppositeAmount()} ${token.symbol}`
                    : `$${getOppositeAmount()}`}
                </span>
              </div>
            )}

            {/* Token Selection */}
            <BentoCard padding="p-4" className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full">
                  <Image
                    src={sanitizeNextImageSrc(token.logoURI)}
                    alt={token.name}
                    width={52}
                    height={52}
                    className="rounded-full"
                  />
                </div>
                <div>
                  <div className="font-medium">{token.name}</div>
                  <div className="text-[13px] text-gray-500">
                    Your balance
                  </div>
                </div>
              </div>
              <div className="text-right">
                {hasPrice ? (
                  <>
                    <div className="font-medium font-mono tabular-nums">${maxUSDAmount}</div>
                    <div className="text-[13px] text-gray-500 font-mono tabular-nums">
                      {parseFloat(token.balance).toFixed(4)}{' '}
                      {token.symbol}
                    </div>
                  </>
                ) : (
                  <div className="font-medium font-mono tabular-nums">
                    {parseFloat(token.balance).toFixed(4)}{' '}
                    {token.symbol}
                  </div>
                )}
              </div>
            </BentoCard>

            <BentoCard padding="p-2" className="flex items-center gap-3 w-full mb-6">
              <span className="p-3 bg-gray-200 rounded-full">
                <BsBank2 size={20} />
              </span>
              <div>
                <h3 className="font-medium">
                  {selectedBank.account_owner_name}
                </h3>
                <p className="text-gray-400 font-mono tabular-nums">
                  {selectedBank.bank_name} ...
                  {selectedBank.account.last_4}
                </p>
              </div>
            </BentoCard>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-full py-6 border-black/[0.06] hover:border-black/[0.15] text-[13px] font-semibold transition"
                onClick={() => onOpenChange(false)}
              >
                Back
              </Button>
              <Button
                className="flex-1 rounded-full py-6 bg-gray-950 text-white hover:bg-gray-800 text-[13px] font-semibold transition"
                onClick={() => handleNext(amount, isUSD)}
                // onClick={() => onNext(amount, isUSD)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : !selectedBank && !reviewDetails ? (
          <div>
            <h2 className="text-[22px] leading-tight font-semibold tracking-[-0.02em] text-gray-900 mb-3">
              Select Bank
            </h2>
            {externalBanks.map((bank: any, index) => (
              <button
                onClick={() => setSelectedBank(bank)}
                key={index}
                className="flex items-center gap-3 border border-black/[0.06] hover:border-black/[0.15] shadow-[0_1px_2px_rgba(10,10,12,0.04),0_8px_28px_-12px_rgba(10,10,12,0.10)] p-2 rounded-xl w-full transition"
              >
                <span className="p-3 bg-gray-200 rounded-full">
                  <BsBank2 size={20} />
                </span>
                <div>
                  <h3 className="font-medium">
                    {bank.account_owner_name}
                  </h3>
                  <p className="text-gray-400 font-mono tabular-nums">
                    {bank.bank_name} ...{bank.account.last_4}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <h3 className="text-[22px] leading-tight font-semibold tracking-[-0.02em] text-gray-900 mb-3">
              Review Details
            </h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full">
                  <Image
                    src={sanitizeNextImageSrc(token.logoURI)}
                    alt={token.name}
                    width={52}
                    height={52}
                    className="rounded-full"
                  />
                </div>
                <div>
                  <p className="text-gray-400">You Send</p>
                  <p className="font-mono tabular-nums">
                    {parseFloat(token.balance).toFixed(4)}{' '}
                    {token.symbol}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <PiWalletBold size={20} />
                </div>
                <div>
                  <p className="text-gray-400">To</p>
                  <p className="font-mono tabular-nums">
                    {selectedBank.bank_name} ...
                    {selectedBank.account.last_4}
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
                  <p className="font-mono tabular-nums">...{selectedBank.account.last_4}</p>
                </div>
              </div>
            </div>
            <hr className="my-3 text-gray-600" />
            <div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between w-full">
                  <p className="text-gray-500">Network Fee</p>
                  <p className="font-mono tabular-nums">{networkFee}</p>
                </div>
                <div className="flex items-center justify-between w-full">
                  <p className="text-gray-500">Transfer Fee</p>
                  <p className="font-mono tabular-nums">{(Number(amount) * 0.005).toFixed(2)}</p>
                </div>
                <div className="flex items-center justify-between w-full">
                  <p className="text-gray-500">Bank Received</p>
                  <p className="font-mono tabular-nums">
                    {parseFloat(amount) - parseFloat(amount) * 0.005}
                  </p>
                </div>
              </div>
            </div>
            <Button
              className="rounded-full py-6 bg-gray-950 text-white hover:bg-gray-800 mt-3 px-10 w-full text-[13px] font-semibold transition"
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
