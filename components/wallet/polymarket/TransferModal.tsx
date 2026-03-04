'use client';

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  usePrivy,
  useWallets,
  useSendTransaction,
} from '@privy-io/react-auth';
import {
  useWallets as useSolanaWallets,
  useSignAndSendTransaction,
} from '@privy-io/react-auth/solana';
import {
  erc20Abi,
  parseUnits,
  formatUnits,
  encodeFunctionData,
  createPublicClient,
  http,
} from 'viem';
import {
  OperationType,
  type SafeTransaction,
} from '@polymarket/builder-relayer-client';
import { polygon, mainnet, base } from 'viem/chains';
import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import {
  Check,
  Loader2,
  AlertCircle,
  ArrowUpDown,
  RefreshCw,
  ArrowDownToLine,
  Wallet,
  Copy,
  CheckCheck,
} from 'lucide-react';
import CustomModal from '@/components/modal/CustomModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useTrading,
  usePolymarketWallet,
} from '@/providers/polymarket';
import { useMultiChainTokenData } from '@/lib/hooks/useToken';
import { getLifiDepositQuote } from '@/actions/lifiForTokenSwap';
import { usePolygonBalances } from '@/hooks/polymarket';
import {
  USDC_E_CONTRACT_ADDRESS,
  USDC_E_DECIMALS,
} from '@/constants/polymarket';
import {
  Connection,
  VersionedTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';

// ─── Types ───────────────────────────────────────────────────────────────────

type ActiveTab = 'deposit' | 'withdraw';

type DepositStep = 'select' | 'amount' | 'processing' | 'success' | 'error';
type WithdrawStep = 'amount' | 'confirm' | 'processing' | 'success' | 'error';

interface DepositToken {
  name: string;
  symbol: string;
  balance: string;
  decimals: number;
  address: string | null;
  logoURI: string;
  chain: string;
  marketData?: { price?: string } | null;
}

interface LiFiQuote {
  estimate: {
    toAmount: string;
    toAmountMin: string;
    approvalAddress?: string;
    executionDuration?: number;
    feeCosts?: Array<{ amount: string; token: { symbol: string } }>;
    gasCosts?: Array<{ amount: string; token: { symbol: string } }>;
  };
  transactionRequest: {
    to: string;
    data: string;
    value: string;
    from: string;
    chainId: number;
    gasLimit?: string;
    gasPrice?: string;
    transaction?: string;
  };
  action: {
    fromToken: { symbol: string; decimals: number };
    toToken: { symbol: string; decimals: number };
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const USDC_E_ADDRESS = USDC_E_CONTRACT_ADDRESS;
const SUPPORTED_CHAINS = ['ETHEREUM', 'POLYGON', 'BASE', 'SOLANA'] as const;
const CHAIN_CONFIG: Record<string, { id: string; name: string; icon: string }> = {
  ETHEREUM: { id: '1', name: 'Ethereum', icon: '/images/IconShop/eTH@3x.png' },
  POLYGON: { id: '137', name: 'Polygon', icon: '/images/IconShop/polygon.png' },
  BASE: { id: '8453', name: 'Base', icon: 'https://www.base.org/document/safari-pinned-tab.svg' },
  SOLANA: { id: '1151111081099710', name: 'Solana', icon: '/images/IconShop/solana@2x.png' },
};
const POLYGON_CHAIN_ID = '137';
const VIEM_CHAINS: Record<string, typeof mainnet | typeof polygon | typeof base> = {
  '1': mainnet, '137': polygon, '8453': base,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getPublicClientForChain = (chainId: string) => {
  const chain = VIEM_CHAINS[chainId];
  if (!chain) return null;
  return createPublicClient({ chain, transport: http() });
};

const formatTokenAmount = (amount: string | number, decimals: number): string => {
  try {
    const safeDecimals = decimals || 18;
    const amountStr = typeof amount === 'number' ? amount.toString() : amount;
    if (!amountStr || amountStr.trim() === '') return '0';
    const numAmount = parseFloat(amountStr);
    if (isNaN(numAmount) || numAmount <= 0) return '0';
    let cleanAmount = numAmount.toFixed(safeDecimals);
    if (cleanAmount.includes('.')) {
      cleanAmount = cleanAmount.replace(/0+$/, '').replace(/\.$/, '');
    }
    if (!cleanAmount || cleanAmount === '0') return '0';
    return parseUnits(cleanAmount, safeDecimals).toString();
  } catch {
    return '0';
  }
};

const getTokenAddressForLifi = (token: DepositToken): string => {
  const chain = token.chain.toUpperCase();
  if (chain === 'SOLANA' && token.symbol === 'SOL')
    return 'So11111111111111111111111111111111111111112';
  if (['ETHEREUM', 'POLYGON', 'BASE'].includes(chain) && ['ETH', 'POL', 'MATIC'].includes(token.symbol))
    return '0x0000000000000000000000000000000000000000';
  return token.address || '0x0000000000000000000000000000000000000000';
};

// ─── Main component ───────────────────────────────────────────────────────────

interface TransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: ActiveTab;
}

export default function TransferModal({
  open,
  onOpenChange,
  defaultTab = 'deposit',
}: TransferModalProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>(defaultTab);

  // Reset tab when modal opens
  useEffect(() => {
    if (open) setActiveTab(defaultTab);
  }, [open, defaultTab]);

  return (
    <CustomModal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title=""
      width="max-w-md"
    >
      {/* Tab switcher */}
      <div className="flex gap-1 mx-6 mb-4 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('deposit')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'deposit'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Deposit
        </button>
        <button
          onClick={() => setActiveTab('withdraw')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'withdraw'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Withdraw
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'deposit' && (
        <DepositTab open={open} onClose={() => onOpenChange(false)} />
      )}
      {activeTab === 'withdraw' && (
        <WithdrawTab open={open} onClose={() => onOpenChange(false)} />
      )}
    </CustomModal>
  );
}

// ─── Deposit Tab ─────────────────────────────────────────────────────────────

function DepositTab({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, getAccessToken } = usePrivy();
  const { safeAddress } = useTrading();
  const { publicClient, eoaAddress, switchToPolygon } = usePolymarketWallet();
  const { wallets } = useWallets();
  const { ready: solanaReady, wallets: directSolanaWallets } = useSolanaWallets();
  const { sendTransaction } = useSendTransaction();
  const { signAndSendTransaction } = useSignAndSendTransaction();

  const selectedSolanaWallet = useMemo(() => {
    if (!solanaReady || !directSolanaWallets.length) return undefined;
    return directSolanaWallets.find((w) => w.address?.length > 0) || directSolanaWallets[0];
  }, [solanaReady, directSolanaWallets]);

  const safeRefreshSession = useCallback(async () => {
    try {
      await Promise.race([
        getAccessToken(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
      ]);
    } catch {}
  }, [getAccessToken]);

  const evmAddress = user?.wallet?.address;
  const solanaAddress = selectedSolanaWallet?.address;

  const { tokens, loading: tokensLoading, refetch: refetchTokens } =
    useMultiChainTokenData(solanaAddress, evmAddress, [...SUPPORTED_CHAINS]);

  const [step, setStep] = useState<DepositStep>('select');
  const [selectedToken, setSelectedToken] = useState<DepositToken | null>(null);
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lifiQuote, setLifiQuote] = useState<LiFiQuote | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [selectedChainFilter, setSelectedChainFilter] = useState('all');
  const [depositStatus, setDepositStatus] = useState('');
  const isTransactionInProgress = useRef(false);

  const filteredTokens = tokens.filter((t) => {
    const hasBalance = parseFloat(t.balance) > 0;
    const matchesChain =
      selectedChainFilter === 'all' ||
      t.chain.toUpperCase() === selectedChainFilter.toUpperCase();
    return hasBalance && matchesChain;
  });

  const userUsdcE = tokens.find(
    (t) =>
      t.chain.toUpperCase() === 'POLYGON' &&
      t.address?.toLowerCase() === USDC_E_ADDRESS.toLowerCase(),
  );

  const isDirectUsdcE =
    selectedToken?.chain.toUpperCase() === 'POLYGON' &&
    selectedToken?.address?.toLowerCase() === USDC_E_ADDRESS.toLowerCase();

  const needsBridge = selectedToken && !isDirectUsdcE;

  useEffect(() => {
    if (isDirectUsdcE) return;
    if (!selectedToken || !amount || !safeAddress || parseFloat(amount) <= 0 ||
      parseFloat(amount) > parseFloat(selectedToken.balance)) {
      setLifiQuote(null);
      return;
    }
    const timer = setTimeout(() => fetchLifiQuote(), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, selectedToken, safeAddress, isDirectUsdcE]);

  useEffect(() => {
    if (!open && !isTransactionInProgress.current) {
      setStep('select');
      setSelectedToken(null);
      setAmount('');
      setTxHash(null);
      setError(null);
      setLifiQuote(null);
      setIsQuoteLoading(false);
      setQuoteError(null);
      setSelectedChainFilter('all');
      setDepositStatus('');
    }
  }, [open]);

  const fetchLifiQuote = useCallback(async () => {
    if (!selectedToken || !amount || !safeAddress || parseFloat(amount) <= 0) return;
    if (isDirectUsdcE) return;
    setIsQuoteLoading(true);
    setQuoteError(null);
    setLifiQuote(null);
    try {
      const fromChainId = CHAIN_CONFIG[selectedToken.chain.toUpperCase()]?.id;
      if (!fromChainId) throw new Error('Unsupported chain');
      const fromAmount = formatTokenAmount(amount, selectedToken.decimals || 6);
      if (fromAmount === '0') throw new Error('Invalid amount');
      const fromTokenAddress = getTokenAddressForLifi(selectedToken);
      const fromWalletAddress =
        selectedToken.chain.toUpperCase() === 'SOLANA' ? solanaAddress : evmAddress;
      if (!fromWalletAddress) throw new Error('Wallet address not available');
      const result = await getLifiDepositQuote({
        fromChain: fromChainId,
        toChain: POLYGON_CHAIN_ID,
        fromToken: fromTokenAddress,
        toToken: USDC_E_ADDRESS,
        fromAddress: fromWalletAddress,
        toAddress: safeAddress,
        fromAmount,
        slippage: '0.01',
      });
      if (!result.success) throw new Error(result.error);
      setLifiQuote(result.data);
    } catch (err: any) {
      setQuoteError(err.message || 'Failed to get quote');
    } finally {
      setIsQuoteLoading(false);
    }
  }, [selectedToken, amount, safeAddress, solanaAddress, evmAddress, isDirectUsdcE]);

  const executeDirectTransfer = async () => {
    if (!eoaAddress || !safeAddress) throw new Error('Wallet not ready');
    await switchToPolygon();

    // Safely coerce to string (balance fields can be numeric at runtime)
    // and truncate to max USDC_E_DECIMALS places to prevent viem parseUnits errors
    const amountStr = String(amount ?? '').trim();
    const dotIdx = amountStr.indexOf('.');
    const safeAmount =
      dotIdx >= 0
        ? `${amountStr.slice(0, dotIdx)}.${amountStr.slice(dotIdx + 1, dotIdx + 1 + USDC_E_DECIMALS)}`
        : amountStr || '0';

    const amountInWei = parseUnits(safeAmount, USDC_E_DECIMALS);
    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [safeAddress as `0x${string}`, amountInWei],
    });
    try {
      const result = await sendTransaction(
        { to: USDC_E_ADDRESS as `0x${string}`, data, chainId: polygon.id },
        { sponsor: true },
      );
      return result.hash;
    } catch (sponsorErr: any) {
      if (['rejected', 'denied', 'cancelled', 'user rejected'].some((s) => sponsorErr?.message?.includes(s)))
        throw sponsorErr;
      setDepositStatus('Retrying transfer...');
      const result = await sendTransaction({ to: USDC_E_ADDRESS as `0x${string}`, data, chainId: polygon.id });
      return result.hash;
    }
  };

  const executeLifiEvmSwap = async () => {
    if (!lifiQuote) throw new Error('No quote available');
    const wallet = wallets.find((w) => w.address?.toLowerCase() === evmAddress?.toLowerCase());
    if (!wallet) throw new Error('EVM wallet not found');
    const sourceChainIdStr = CHAIN_CONFIG[selectedToken!.chain.toUpperCase()].id;
    const sourceChainId = parseInt(sourceChainIdStr);
    if (wallet.chainId !== `eip155:${sourceChainId}`) await wallet.switchChain(sourceChainId);
    const sourcePublicClient =
      sourceChainId === polygon.id ? publicClient : getPublicClientForChain(sourceChainIdStr);
    if (!sourcePublicClient) throw new Error(`Unsupported source chain: ${selectedToken!.chain}`);
    const { transactionRequest, estimate } = lifiQuote;
    const fromTokenAddress = getTokenAddressForLifi(selectedToken!);
    const isNativeToken = fromTokenAddress === '0x0000000000000000000000000000000000000000';
    if (!isNativeToken && estimate.approvalAddress) {
      setDepositStatus('Checking token approval...');
      const fromAmount = formatTokenAmount(amount, selectedToken!.decimals || 6);
      const currentAllowance = await sourcePublicClient.readContract({
        address: fromTokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [evmAddress as `0x${string}`, estimate.approvalAddress as `0x${string}`],
      });
      if (currentAllowance < BigInt(fromAmount)) {
        setDepositStatus('Requesting token approval...');
        const approveData = encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [estimate.approvalAddress as `0x${string}`,
            BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')],
        });
        let approvalHash: string;
        try {
          const r = await sendTransaction({ to: fromTokenAddress as `0x${string}`, data: approveData, chainId: sourceChainId }, { sponsor: true });
          approvalHash = r.hash;
        } catch {
          const r = await sendTransaction({ to: fromTokenAddress as `0x${string}`, data: approveData, chainId: sourceChainId });
          approvalHash = r.hash;
        }
        setDepositStatus('Waiting for approval confirmation...');
        await sourcePublicClient.waitForTransactionReceipt({ hash: approvalHash as `0x${string}` });
      }
    }
    setDepositStatus('Waiting for transaction approval...');
    let txValue = BigInt(0);
    if (transactionRequest.value) { try { txValue = BigInt(transactionRequest.value); } catch {} }
    let hash: string;
    try {
      const r = await sendTransaction(
        { to: transactionRequest.to as `0x${string}`, data: transactionRequest.data as `0x${string}`, value: txValue, chainId: sourceChainId },
        { sponsor: true },
      );
      hash = r.hash;
    } catch (sponsorErr: any) {
      if (['rejected', 'denied', 'cancelled', 'user rejected'].some((s) => sponsorErr?.message?.includes(s))) throw sponsorErr;
      setDepositStatus('Retrying transaction...');
      const r = await sendTransaction({ to: transactionRequest.to as `0x${string}`, data: transactionRequest.data as `0x${string}`, value: txValue, chainId: sourceChainId });
      hash = r.hash;
    }
    setDepositStatus('Waiting for confirmation...');
    try { await sourcePublicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` }); } catch {}
    return hash;
  };

  const executeLifiSolanaSwap = async () => {
    if (!lifiQuote || !signAndSendTransaction || !selectedSolanaWallet)
      throw new Error('No quote available or wallet not ready');
    const { transactionRequest } = lifiQuote;
    const rawTx = transactionRequest.transaction || transactionRequest.data;
    if (!rawTx) throw new Error('No transaction data in LiFi quote');
    setDepositStatus('Preparing transaction...');
    const solanaRpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    if (!solanaRpcUrl) throw new Error('No Solana RPC URL configured');
    const connection = new Connection(solanaRpcUrl, { commitment: 'confirmed', confirmTransactionInitialTimeout: 60000 });
    setDepositStatus('Checking token accounts...');
    const txBuffer = Buffer.from(rawTx, 'base64');
    const transaction = VersionedTransaction.deserialize(txBuffer);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.message.recentBlockhash = blockhash;
    setDepositStatus('Waiting for signature...');
    await safeRefreshSession();
    const serializedTransaction = new Uint8Array(transaction.serialize());
    let signatureString: string;
    try {
      const r = await signAndSendTransaction({ transaction: serializedTransaction, wallet: selectedSolanaWallet, options: { sponsor: true } });
      signatureString = bs58.encode(r.signature);
    } catch (sponsorErr: any) {
      const msg = sponsorErr?.message || sponsorErr?.toString() || '';
      if (['rejected', 'denied', 'cancelled', 'user rejected'].some((s) => msg.includes(s))) throw sponsorErr;
      setDepositStatus('Retrying transaction...');
      await safeRefreshSession();
      try {
        const r = await signAndSendTransaction({ transaction: serializedTransaction, wallet: selectedSolanaWallet });
        signatureString = bs58.encode(r.signature);
      } catch { throw sponsorErr; }
    }
    setDepositStatus('Waiting for confirmation...');
    await new Promise((r) => setTimeout(r, 2000));
    try { await connection.confirmTransaction({ signature: signatureString, blockhash, lastValidBlockHeight }, 'confirmed'); } catch {}
    return signatureString;
  };

  const handleDeposit = async () => {
    if (!selectedToken || !amount || !safeAddress) return;
    if (needsBridge && !lifiQuote) { setError('Please get a quote first'); return; }
    isTransactionInProgress.current = true;
    setStep('processing');
    setError(null);
    setDepositStatus('Initiating deposit...');
    try {
      let hash: string;
      if (isDirectUsdcE) { setDepositStatus('Transferring USDC.e...'); hash = await executeDirectTransfer(); }
      else if (selectedToken.chain.toUpperCase() === 'SOLANA') { hash = await executeLifiSolanaSwap(); }
      else { hash = await executeLifiEvmSwap(); }
      setTxHash(hash);
      setDepositStatus('Waiting for confirmation...');
      if (selectedToken.chain.toUpperCase() !== 'SOLANA' && isDirectUsdcE)
        await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
      isTransactionInProgress.current = false;
      setStep('success');
    } catch (err: any) {
      isTransactionInProgress.current = false;
      const raw = err.message || 'Failed to complete deposit';
      let msg = raw;
      if (['rejected', 'denied', 'user rejected'].some((s) => raw.includes(s))) msg = 'Transaction was rejected. Please try again.';
      else if (raw.includes('insufficient funds')) msg = 'Insufficient funds for gas fees.';
      else if (raw.includes('timeout')) msg = 'Transaction timed out.';
      setError(msg);
      setStep('error');
    }
  };

  const getExplorerUrl = (chain: string, hash: string) => ({
    SOLANA: `https://solscan.io/tx/${hash}`,
    ETHEREUM: `https://etherscan.io/tx/${hash}`,
    POLYGON: `https://polygonscan.com/tx/${hash}`,
    BASE: `https://basescan.org/tx/${hash}`,
  }[chain.toUpperCase()] || `https://polygonscan.com/tx/${hash}`);

  // Render helpers
  if (step === 'processing') return (
    <div className="px-6 pb-6 flex flex-col items-center py-8">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-lg font-medium text-gray-900 mb-2">{needsBridge ? 'Bridging & Depositing' : 'Processing Deposit'}</p>
      <p className="text-sm text-gray-500 text-center">{depositStatus || 'Transferring to trading wallet...'}</p>
      {txHash && selectedToken && (
        <a href={getExplorerUrl(selectedToken.chain, txHash)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 mt-4">View on explorer</a>
      )}
    </div>
  );

  if (step === 'success') return (
    <div className="px-6 pb-6 flex flex-col items-center py-8">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <Check className="w-8 h-8 text-green-600" />
      </div>
      <p className="text-lg font-medium text-gray-900 mb-2">{needsBridge ? 'Bridge Initiated!' : 'Deposit Complete!'}</p>
      <p className="text-sm text-gray-500 text-center mb-4">
        {needsBridge ? 'Your funds are being bridged. This may take a few minutes.' : 'Your funds have been deposited.'}
      </p>
      {txHash && selectedToken && (
        <a href={getExplorerUrl(selectedToken.chain, txHash)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 mb-4">View transaction</a>
      )}
      <Button className="w-full bg-black text-white hover:bg-gray-800" onClick={() => { onClose(); refetchTokens(); }}>Done</Button>
    </div>
  );

  if (step === 'error') return (
    <div className="px-6 pb-6 flex flex-col items-center py-8">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <p className="text-lg font-medium text-gray-900 mb-2">Deposit Failed</p>
      <p className="text-sm text-red-600 text-center mb-4">{error}</p>
      <div className="flex gap-3 w-full">
        <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button className="flex-1 bg-black text-white hover:bg-gray-800" onClick={() => setStep('amount')}>Try Again</Button>
      </div>
    </div>
  );

  if (step === 'amount' && selectedToken) {
    const canDeposit = amount && parseFloat(amount) > 0 && parseFloat(amount) <= parseFloat(selectedToken.balance);
    const hasValidQuote = needsBridge && lifiQuote;
    const isLoadingQuote = needsBridge && canDeposit && isQuoteLoading;
    return (
      <div className="px-6 pb-6 space-y-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                {selectedToken.logoURI ? (
                  <Image src={selectedToken.logoURI} alt={selectedToken.symbol} width={40} height={40} className="rounded-full" />
                ) : (
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"><span className="text-blue-600 font-bold">$</span></div>
                )}
                {CHAIN_CONFIG[selectedToken.chain.toUpperCase()]?.icon && (
                  <Image src={CHAIN_CONFIG[selectedToken.chain.toUpperCase()].icon} alt={selectedToken.chain} width={16} height={16} className="absolute -bottom-1 -right-1 rounded-full border border-white bg-white" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">{selectedToken.symbol}</p>
                <p className="text-xs text-gray-500">Balance: {parseFloat(selectedToken.balance).toFixed(4)} on {CHAIN_CONFIG[selectedToken.chain.toUpperCase()]?.name || selectedToken.chain}</p>
              </div>
            </div>
            <button onClick={() => { setStep('select'); setLifiQuote(null); setQuoteError(null); }} className="text-sm text-blue-600">Change</button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Amount</label>
            <button onClick={() => { setAmount(selectedToken.balance); setLifiQuote(null); setQuoteError(null); }} className="text-xs text-blue-600">MAX</button>
          </div>
          <Input type="text" value={amount} onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'); setAmount(v); setLifiQuote(null); setQuoteError(null); }} placeholder="0.00" className="text-2xl font-medium h-14 text-center" />
        </div>

        {needsBridge && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <ArrowUpDown className="w-4 h-4 text-yellow-600 mt-0.5" />
              <p className="text-sm text-yellow-800">Bridge & Swap required — {selectedToken.symbol} will be converted to USDC.e on Polygon</p>
            </div>
          </div>
        )}

        {isLoadingQuote && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <p className="text-sm text-blue-800">Fetching best route...</p>
          </div>
        )}

        {!isLoadingQuote && hasValidQuote && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-green-800 font-medium">You will receive</p>
              <button onClick={fetchLifiQuote} disabled={isQuoteLoading} className="text-xs text-green-600 flex items-center gap-1">
                <RefreshCw className={`w-3 h-3 ${isQuoteLoading ? 'animate-spin' : ''}`} />Refresh
              </button>
            </div>
            <p className="text-lg font-semibold text-green-900">~{formatUnits(BigInt(lifiQuote.estimate.toAmount), USDC_E_DECIMALS)} USDC.e</p>
          </div>
        )}

        {!isLoadingQuote && quoteError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
            <p className="text-sm text-red-600">{quoteError}</p>
          </div>
        )}

        {isDirectUsdcE && canDeposit && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
            <Check className="w-4 h-4 text-green-600 mt-0.5" />
            <p className="text-sm text-green-800">Direct transfer — no bridge fees</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => { setStep('select'); setLifiQuote(null); setQuoteError(null); }}>Back</Button>
          {isLoadingQuote && <Button className="flex-1 bg-gray-400 text-white cursor-not-allowed" disabled><Loader2 className="w-4 h-4 animate-spin mr-2" />Getting Quote...</Button>}
          {!isLoadingQuote && (isDirectUsdcE || hasValidQuote) && <Button className="flex-1 bg-black text-white hover:bg-gray-800" onClick={handleDeposit} disabled={!canDeposit}>{isDirectUsdcE ? 'Deposit' : 'Bridge & Deposit'}</Button>}
          {!isLoadingQuote && quoteError && <Button className="flex-1 bg-blue-600 text-white" onClick={fetchLifiQuote} disabled={!canDeposit}>Retry Quote</Button>}
        </div>
      </div>
    );
  }

  // step === 'select'
  return (
    <div className="px-6 pb-6 space-y-4">
      <p className="text-sm text-gray-600 text-center">Select a token from any chain to deposit as USDC.e</p>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', ...SUPPORTED_CHAINS].map((chain) => (
          <button key={chain} onClick={() => setSelectedChainFilter(chain)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors ${selectedChainFilter === chain ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {chain !== 'all' && CHAIN_CONFIG[chain]?.icon && <Image src={CHAIN_CONFIG[chain].icon} alt={chain} width={14} height={14} className="rounded-full" />}
            {chain === 'all' ? 'All Chains' : CHAIN_CONFIG[chain]?.name || chain}
          </button>
        ))}
      </div>

      {tokensLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : filteredTokens.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No tokens found</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {userUsdcE && (selectedChainFilter === 'all' || selectedChainFilter === 'POLYGON') && (
            <button onClick={() => { setSelectedToken(userUsdcE); setAmount(''); setLifiQuote(null); setQuoteError(null); setStep('amount'); }}
              className="w-full p-3 bg-blue-50 border-2 border-blue-200 rounded-xl flex items-center justify-between hover:bg-blue-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"><span className="text-blue-600 font-bold">$</span></div>
                  <Image src={CHAIN_CONFIG.POLYGON.icon} alt="Polygon" width={16} height={16} className="absolute -bottom-1 -right-1 rounded-full border border-white" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">{userUsdcE.symbol}</p>
                  <p className="text-xs text-green-600">Direct deposit (no fees)</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">{parseFloat(userUsdcE.balance).toFixed(2)}</p>
              </div>
            </button>
          )}
          {filteredTokens
            .filter((t) => !(t.chain.toUpperCase() === 'POLYGON' && t.address?.toLowerCase() === USDC_E_ADDRESS.toLowerCase()))
            .map((token) => (
              <button key={`${token.chain}-${token.symbol}-${token.address}`}
                onClick={() => { setSelectedToken(token); setAmount(''); setLifiQuote(null); setQuoteError(null); setStep('amount'); }}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {token.logoURI ? <Image src={token.logoURI} alt={token.symbol} width={40} height={40} className="rounded-full" /> : <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center"><span className="text-gray-600 font-bold text-sm">{token.symbol.slice(0, 2)}</span></div>}
                    {CHAIN_CONFIG[token.chain.toUpperCase()]?.icon && <Image src={CHAIN_CONFIG[token.chain.toUpperCase()].icon} alt={token.chain} width={16} height={16} className="absolute -bottom-1 -right-1 rounded-full border border-white bg-white" />}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{token.symbol}</p>
                    <p className="text-xs text-gray-500">{token.name} ({CHAIN_CONFIG[token.chain.toUpperCase()]?.name || token.chain})</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{parseFloat(token.balance).toFixed(4)}</p>
                  {token.marketData?.price && <p className="text-xs text-gray-500">${(parseFloat(token.balance) * parseFloat(token.marketData.price)).toFixed(2)}</p>}
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Withdraw Tab ─────────────────────────────────────────────────────────────

function WithdrawTab({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { safeAddress, relayClient } = useTrading();
  const { eoaAddress } = usePolymarketWallet();
  const { usdcBalance } = usePolygonBalances(safeAddress);
  const queryClient = useQueryClient();

  const [step, setStep] = useState<WithdrawStep>('amount');
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const destination = eoaAddress;
  const parsedAmount = parseFloat(amount) || 0;
  const isAmountValid = parsedAmount > 0 && parsedAmount <= usdcBalance;

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  useEffect(() => {
    if (!open) { setStep('amount'); setAmount(''); setTxHash(null); setError(null); }
  }, [open]);

  const handleCopyAddress = async () => {
    if (!destination) return;
    await navigator.clipboard.writeText(destination);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const executeWithdraw = useCallback(async () => {
    if (!relayClient || !destination || !safeAddress) {
      setError('Trading session not ready.'); setStep('error'); return;
    }
    setStep('processing');
    setError(null);
    try {
      const amountInWei = parseUnits(parsedAmount.toFixed(USDC_E_DECIMALS), USDC_E_DECIMALS);
      const data = encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [destination as `0x${string}`, amountInWei] });
      const withdrawTx: SafeTransaction = { to: USDC_E_CONTRACT_ADDRESS, operation: OperationType.Call, data, value: '0' };
      const response = await relayClient.execute([withdrawTx], `Withdraw ${parsedAmount.toFixed(2)} USDC.e to ${truncateAddress(destination)}`);
      const receipt = await response.wait();
      setTxHash(typeof receipt === 'string' ? receipt : (receipt as any)?.transactionHash ?? null);
      setStep('success');
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['usdcBalance', safeAddress] }), 3000);
    } catch (err: any) {
      const msg = err?.message || err?.toString() || 'Withdrawal failed';
      const isRejected = ['rejected', 'denied', 'cancelled', 'user rejected'].some((s) => msg.includes(s));
      setError(isRejected ? 'Transaction was rejected.' : `Withdrawal failed: ${msg}`);
      setStep('error');
    }
  }, [relayClient, destination, safeAddress, parsedAmount, queryClient]);

  if (step === 'processing') return (
    <div className="px-6 pb-6 py-8 flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-900">Processing withdrawal...</p>
        <p className="text-sm text-gray-500 mt-1">Signing and submitting via Safe relay</p>
      </div>
    </div>
  );

  if (step === 'success') return (
    <div className="px-6 pb-6 py-8 flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <Check className="w-8 h-8 text-green-600" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-900">Withdrawal successful!</p>
        <p className="text-sm text-gray-500 mt-1">{parsedAmount.toFixed(2)} USDC.e sent to your Privy wallet</p>
      </div>
      {txHash && (
        <a href={`https://polygonscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">View on Polygonscan ↗</a>
      )}
      <Button className="w-full bg-black text-white hover:bg-gray-800 mt-2" onClick={onClose}>Done</Button>
    </div>
  );

  if (step === 'error') return (
    <div className="px-6 pb-6 py-8 flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-900">Withdrawal failed</p>
        <p className="text-sm text-red-500 mt-1">{error}</p>
      </div>
      <div className="flex gap-3 w-full mt-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
        <Button className="flex-1 bg-black text-white hover:bg-gray-800" onClick={() => { setError(null); setStep('confirm'); }}>Try Again</Button>
      </div>
    </div>
  );

  if (step === 'confirm') return (
    <div className="px-6 pb-6 space-y-4">
      <div className="space-y-3">
        {[
          ['You withdraw', `${parsedAmount.toFixed(6)} USDC.e`],
          ['USD value', `≈ $${parsedAmount.toFixed(2)}`],
          ['From', `${safeAddress ? truncateAddress(safeAddress) : '—'} (Safe)`],
          ['To', `${destination ? truncateAddress(destination) : '—'} (Privy wallet)`],
          ['Network', 'Polygon'],
          ['Gas fee', 'Sponsored'],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-gray-500">{label}</span>
            <span className={`font-semibold ${label === 'Gas fee' ? 'text-green-600' : 'text-gray-900'}`}>{value}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 pt-4 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => setStep('amount')}>Back</Button>
        <Button className="flex-1 bg-black text-white hover:bg-gray-800" onClick={executeWithdraw}>Confirm Withdrawal</Button>
      </div>
    </div>
  );

  // step === 'amount'
  return (
    <div className="px-6 pb-6 space-y-5">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
        <p className="text-xs text-gray-500 mb-1">Available to withdraw</p>
        <p className="text-2xl font-bold text-gray-900">${usdcBalance.toFixed(2)}</p>
        <p className="text-xs text-gray-400 mt-0.5">{usdcBalance.toFixed(6)} USDC.e</p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5" />Destination (Privy wallet)
        </label>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
          <span className="text-sm text-gray-700 font-mono flex-1">{destination ? truncateAddress(destination) : 'Not connected'}</span>
          {destination && (
            <button onClick={handleCopyAddress} className="text-gray-400 hover:text-gray-600 transition-colors">
              {copied ? <CheckCheck className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Amount (USDC.e)</label>
        <div className="relative">
          <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="pr-16 text-base" min="0" step="0.01" />
          <button onClick={() => setAmount(usdcBalance.toFixed(6))} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-blue-600 hover:text-blue-800">MAX</button>
        </div>
        {amount && !isAmountValid && (
          <p className="text-xs text-red-500">{parsedAmount <= 0 ? 'Enter a valid amount' : 'Exceeds available balance'}</p>
        )}
      </div>

      <Button onClick={() => setStep('confirm')} disabled={!isAmountValid || !destination || !relayClient} className="w-full bg-black text-white hover:bg-gray-800">
        <ArrowDownToLine className="w-4 h-4 mr-2" />Review Withdrawal
      </Button>
      {!relayClient && <p className="text-xs text-center text-amber-600">Trading session must be initialized to withdraw.</p>}
    </div>
  );
}
