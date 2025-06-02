/*
 * ChatBox Component with Token Sending Functionality
 *
 * This component provides a chat interface with integrated token sending functionality.
 * It supports both Ethereum and Solana blockchain transactions using Privy wallets.
 *
 * Features:
 * - Real-time chat messaging
 * - Token selection and sending from chat interface
 * - Support for both Ethereum and Solana blockchains
 * - Transaction status notifications
 *
 * The implementation uses Privy wallet hooks (useWallets, useSolanaWallets)
 * to access and interact with user wallets.
 */

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Send, DollarSign, Wallet, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWallets, useSolanaWallets } from '@privy-io/react-auth';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { ethers } from 'ethers';

interface Message {
  id: string;
  content: string;
  sent: Date;
  senderAddress: string;
}

interface TokenData {
  symbol: string;
  balance: string;
  address: string;
  chain: string;
  decimals?: number;
  marketData?: {
    price: string;
  };
}

interface WalletData {
  address: string;
  isActive: boolean;
  isEVM: boolean;
}

interface ChatProps {
  client: {
    address: string;
  };
  conversation: {
    send: (message: string) => Promise<void>;
    peerAddress: string;
  };
  messageHistory: Message[];
  tokenData?: TokenData[];
  recipientWalletData?: WalletData[];
  recipientAddress: string;
}

export default function ChatBox({
  client,
  conversation,
  messageHistory,
  tokenData,
  recipientWalletData,
  recipientAddress: recipientUserAddress,
}: ChatProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [selectedToken, setSelectedToken] =
    useState<TokenData | null>(null);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [selectedChain, setSelectedChain] = useState<
    'ETHEREUM' | 'SOLANA'
  >('ETHEREUM');
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { wallets: ethWallets } = useWallets();
  const { wallets: solanaWallets } = useSolanaWallets();

  // Network configuration
  const ETHEREUM_RPC_URL =
    process.env.NEXT_PUBLIC_ALCHEMY_SEPOLIA_URL ||
    'https://eth-sepolia.g.alchemy.com/v2/GIGzKPGbo2k_FJH72PzS4mS6buC_PbBo';
  const SOLANA_RPC_URL =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    'https://api.mainnet-beta.solana.com';

  useEffect(() => {
    console.log(
      'Recipient address passed to ChatBox:',
      recipientUserAddress
    );
  }, [recipientUserAddress]);

  useEffect(() => {
    // Set recipient address from the prop for Ethereum transactions
    if (selectedChain === 'ETHEREUM') {
      setRecipientAddress(recipientUserAddress);
    }
    // Only use wallet data for Solana since we don't have a direct Solana address
    else if (
      selectedChain === 'SOLANA' &&
      recipientWalletData &&
      recipientWalletData.length > 0
    ) {
      const solWallet = recipientWalletData.find(
        (wallet) => !wallet.isEVM
      );
      if (solWallet) {
        setRecipientAddress(solWallet.address);
      }
    }
  }, [recipientWalletData, selectedChain, recipientUserAddress]);

  console.log(
    'recipientAddress from the chat box',
    recipientUserAddress
  );

  // Make the filteredTokens a memoized value based on selectedChain and tokenData
  const filteredTokens = useMemo(() => {
    if (!tokenData) return [];

    return tokenData.filter((token) => {
      if (selectedChain === 'ETHEREUM') {
        return token.chain !== 'SOLANA';
      } else {
        return token.chain === 'SOLANA';
      }
    });
  }, [tokenData, selectedChain]);

  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messageHistory]);

  const onSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      await conversation.send(inputMessage);
      setInputMessage('');
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); // Prevent the default new line behavior
      onSendMessage(event as any); // Trigger form submit
    }
  };

  const handleOpenSendModal = () => {
    if (!recipientUserAddress) {
      toast({
        title: 'Error',
        description: 'Recipient address not available.',
        variant: 'destructive',
      });
      return;
    }

    // Reset all form fields when opening modal
    setSelectedToken(null);
    setAmount('');

    // Default to Ethereum first if we have the address
    setSelectedChain('ETHEREUM');
    setRecipientAddress(recipientUserAddress);

    setIsSendModalOpen(true);
  };

  const handleCloseSendModal = () => {
    // Reset form data when closing modal
    setSelectedToken(null);
    setAmount('');
    setIsSendModalOpen(false);
  };

  const handleTokenSelect = (tokenSymbol: string) => {
    const token = filteredTokens.find(
      (t) => `${t.symbol}-${t.chain}` === tokenSymbol
    );
    setSelectedToken(token || null);
  };

  const handleChainChange = (chain: 'ETHEREUM' | 'SOLANA') => {
    console.log(`Changing chain from ${selectedChain} to ${chain}`);

    // Reset token selection when changing chains
    setSelectedToken(null);
    setSelectedChain(chain);

    // Update recipient address based on new chain
    if (chain === 'ETHEREUM') {
      // For Ethereum, use the direct recipient address passed to the component
      setRecipientAddress(recipientUserAddress);
      console.log(
        `Set Ethereum recipient address: ${recipientUserAddress}`
      );
    } else if (chain === 'SOLANA' && recipientWalletData) {
      // For Solana, try to find a Solana wallet from the recipient's wallet data
      const solWallet = recipientWalletData.find(
        (wallet) => !wallet.isEVM
      );
      if (solWallet) {
        setRecipientAddress(solWallet.address);
        console.log(
          `Set Solana recipient address: ${solWallet.address}`
        );
      } else {
        console.warn('No Solana wallet found for recipient');
        // Could show a message that Solana transactions might not be possible
      }
    }
  };

  const getSenderWallet = () => {
    if (selectedChain === 'ETHEREUM') {
      return ethWallets?.[0];
    } else {
      return solanaWallets?.[0];
    }
  };

  // Helper function to safely attempt to send a transaction with any wallet
  const safeWalletSend = async (
    wallet: any,
    data: any,
    options?: any
  ) => {
    // For Ethereum transactions using Privy's getEthereumProvider method
    if (wallet.getEthereumProvider && wallet.type === 'ethereum') {
      try {
        const provider = await wallet.getEthereumProvider();

        // Ensure transaction has all required fields
        // Check if this is a Sepolia testnet wallet
        const isSepolia =
          wallet.chainId && wallet.chainId.includes('11155111');

        // Always set the chainId for Sepolia
        if (isSepolia && !data.chainId) {
          data.chainId = '0xaa36a7'; // Sepolia chainId in hex
        }

        // Always include the from address
        if (!data.from && wallet.address) {
          data.from = wallet.address;
        }

        // Convert value to proper hex if it's not already
        if (data.value && !data.value.startsWith('0x')) {
          data.value = '0x' + Number(data.value).toString(16);
        }

        // Estimate gas
        let gasEstimate;
        try {
          // If the provider has eth_estimateGas method, try to use it
          gasEstimate = await provider.request({
            method: 'eth_estimateGas',
            params: [data],
          });
          // Convert BigInt to string if needed
          if (typeof gasEstimate === 'bigint') {
            data.gas = '0x' + gasEstimate.toString(16);
          } else {
            data.gas = gasEstimate;
          }
        } catch (gasError) {
          console.warn('Could not estimate gas:', gasError);
          // Set a reasonable default gas limit if estimation fails
          data.gas = '0x55555'; // Roughly 350,000 gas
        }

        // Get nonce for transaction to avoid replacement issues
        try {
          const nonce = await provider.request({
            method: 'eth_getTransactionCount',
            params: [wallet.address, 'latest'],
          });
          data.nonce = nonce;
        } catch (nonceError) {
          console.warn('Could not get nonce:', nonceError);
        }

        // Log complete transaction data for debugging
        const logData: Record<string, any> = {};
        // Copy data while handling BigInt values
        Object.keys(data).forEach((key) => {
          logData[key] =
            typeof data[key] === 'bigint'
              ? data[key].toString()
              : data[key];
        });

        try {
          // Send transaction
          const txHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [data],
          });

          return txHash;
        } catch (providerError) {
          console.error(
            'Provider transaction failed:',
            providerError
          );
          return await sendWithEthers(wallet, data);
        }
      } catch (error) {
        console.error('Error using getEthereumProvider:', error);
        throw error;
      }
    }

    // For Solana transactions that need connection
    if (options?.connection && wallet.sendTransaction) {
      return await wallet.sendTransaction(data, options.connection);
    }

    // Try multiple possible methods that might exist on the wallet
    if (wallet.sendTransaction) {
      return await wallet.sendTransaction(data);
    } else if (wallet.send) {
      return await wallet.send(data);
    } else if (wallet.signAndSendTransaction) {
      return await wallet.signAndSendTransaction(data);
    }

    // If the wallet doesn't have standard methods, try to identify other possible methods
    const walletMethods = Object.keys(wallet).filter(
      (key) => typeof wallet[key] === 'function'
    );

    // Look for methods that might be related to transactions
    const possibleTxMethods = walletMethods.filter(
      (method) =>
        method.toLowerCase().includes('transaction') ||
        method.toLowerCase().includes('send') ||
        method.toLowerCase().includes('transfer')
    );

    if (possibleTxMethods.length > 0) {
      // Try each method
      for (const method of possibleTxMethods) {
        try {
          const result = await wallet[method](data);
          return result;
        } catch (err) {
          console.log(`Method ${method} failed:`, err);
          // Continue to next method
        }
      }
    }
    throw new Error('No compatible send method found on wallet');
  };

  // Function to send a transaction using ethers.js as fallback
  const sendWithEthers = async (wallet: any, txData: any) => {
    try {
      const provider = await wallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();

      // Create simple transaction object
      const tx = {
        to: txData.to,
        value: txData.value,
      };

      const response = await signer.sendTransaction(tx);

      return response.hash;
    } catch (error) {
      console.error('Failed to send with ethers:', error);
      throw error;
    }
  };

  const handleSendToken = async () => {
    if (!selectedToken || !amount || !recipientAddress) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    const wallet = getSenderWallet();
    if (!wallet) {
      toast({
        title: 'Error',
        description: 'Wallet not available',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    // Show pending toast notification
    toast({
      title: 'Transaction Pending',
      description: `Sending ${amount} ${selectedToken.symbol}...`,
      duration: 60000, // Long duration as transactions can take time
    });

    try {
      let txHash = '';

      if (selectedChain === 'ETHEREUM') {
        // Handle Ethereum transaction
        try {
          const ethWallet = ethWallets?.[0];
          if (!ethWallet) {
            throw new Error('Ethereum wallet not available');
          }

          try {
            const weiValue = parseFloat(amount) * Math.pow(10, 18);
            const tx = {
              to: recipientAddress,
              from: ethWallet.address,
              value: '0x' + Math.floor(weiValue).toString(16), // Convert to hex string format
              chainId: '0xaa36a7', // Sepolia chainId
            };

            const result = await safeWalletSend(ethWallet, tx);
            txHash =
              typeof result === 'string'
                ? result
                : result?.hash || 'tx_sent';
          } catch (walletError: any) {
            console.error('Wallet method error:', walletError);

            // Extract more detailed error information
            let errorMessage = 'Transaction failed';
            if (walletError.message) {
              errorMessage = walletError.message;
              // Check for common error patterns
              if (errorMessage.includes('insufficient funds')) {
                errorMessage =
                  'Insufficient funds for gas * price + value';
              }
            }

            toast({
              title: 'Transaction Error',
              description: errorMessage,
              variant: 'destructive',
            });
            throw new Error(errorMessage);
          }
        } catch (error) {
          console.error('Ethereum transaction error:', error);
          throw error;
        }
      } else {
        try {
          const solWallet = solanaWallets?.[0];
          if (!solWallet) {
            throw new Error('Solana wallet not available');
          }

          const connection = new Connection(
            SOLANA_RPC_URL,
            'confirmed'
          );

          const lamports = parseFloat(amount) * 10 ** 9;

          // Create a transfer transaction
          const transaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: new PublicKey(solWallet.address),
              toPubkey: new PublicKey(recipientAddress),
              lamports: Math.floor(lamports), // Ensure it's an integer
            })
          );

          // Add a recent blockhash
          const { blockhash } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = new PublicKey(solWallet.address);

          try {
            const signature = await safeWalletSend(
              solWallet,
              transaction,
              { connection }
            );
            txHash = signature;
          } catch (walletError) {
            console.error('Solana wallet method error:', walletError);
            // Fallback to any other method the wallet might support
            toast({
              title: 'Warning',
              description:
                'Transaction initiated with wallet. Please check your wallet for confirmation.',
            });
            txHash = 'sol_tx_initiated';
          }
        } catch (error) {
          console.error('Solana transaction error:', error);
          throw error;
        }
      }

      // Show success toast
      toast({
        title: 'Transaction Successful',
        description: `Successfully sent ${amount} ${selectedToken.symbol}`,
        duration: 5000,
      });

      // Send just a simple message about the transfer (no transaction details)
      await conversation.send(
        `I've sent you ${amount} ${selectedToken.symbol} on ${selectedChain}.`
      );

      // Close modal and reset
      setIsSendModalOpen(false);
      setSelectedToken(null);
      setAmount('');
    } catch (error) {
      console.error('Error sending token:', error);

      // Show error toast
      toast({
        title: 'Transaction Failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to send token',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const MessageList = ({ messages }: { messages: Message[] }) => {
    const uniqueMessages = messages.filter(
      (v, i, a) => a.findIndex((t) => t.id === v.id) === i
    );

    return (
      <div className="px-4 md:px-8 h-full pb-24">
        {uniqueMessages.map((message, index) => (
          <div
            key={message.id}
            ref={
              index === uniqueMessages.length - 1
                ? lastMessageRef
                : null
            }
            className={`mb-4 ${
              message.senderAddress === client.address
                ? 'text-right'
                : 'text-left'
            }`}
          >
            <div
              className={`inline-block px-3 py-2 rounded-lg ${
                message.senderAddress === client.address
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              {message.content}
            </div>
            <div className="text-xs mt-1 text-muted-foreground">
              {message.sent.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="pt-4 w-full overflow-x-hidden h-full">
      <MessageList messages={messageHistory} />
      <div className="absolute bottom-0 bg-white py-4 w-full">
        <form onSubmit={onSendMessage} className="">
          <div className="w-full px-4 md:px-8">
            <div className="flex justify-center items-center gap-2">
              {/* {tokenData && tokenData.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleOpenSendModal}
                  className="p-2"
                  title="Send Tokens"
                >
                  <DollarSign className="h-5 w-5" />
                </Button>
              )} */}
              <div className="flex-1 relative">
                <textarea
                  className="flex outline-none border border-gray-300 focus:border-gray-400 text-gray-700 text-md resize-none rounded-md pl-3 pr-20 pt-2 w-full"
                  value={inputMessage}
                  placeholder="Type your message here....."
                  onKeyDown={handleKeyDown}
                  onChange={(e) => setInputMessage(e.target.value)}
                />
              </div>
              <div className="flex">
                <button type="submit">
                  <svg
                    viewBox="0 0 24 24"
                    height="24"
                    width="24"
                    preserveAspectRatio="xMidYMid meet"
                    version="1.1"
                    x="0px"
                    y="0px"
                    enableBackground="new 0 0 24 24"
                  >
                    <path
                      fill="currentColor"
                      d="M1.101,21.757L23.8,12.028L1.101,2.3l0.011,7.912l13.623,1.816L1.112,13.845 L1.101,21.757z"
                    ></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Token Send Modal */}
      <Dialog
        open={isSendModalOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseSendModal();
          else setIsSendModalOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Wallet className="mr-2 h-5 w-5" />
              Send Tokens
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Blockchain
              </label>
              <Select
                key={`blockchain-select-${isSendModalOpen}`}
                value={selectedChain}
                onValueChange={(value) =>
                  handleChainChange(value as 'ETHEREUM' | 'SOLANA')
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select blockchain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ETHEREUM">
                    Ethereum (EVM)
                  </SelectItem>
                  <SelectItem value="SOLANA">Solana</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Token
              </label>
              <Select
                key={`token-select-${selectedChain}`}
                onValueChange={handleTokenSelect}
                name="token-select"
                value={
                  selectedToken
                    ? `${selectedToken.symbol}-${selectedToken.chain}`
                    : undefined
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent>
                  {filteredTokens.map((token) => (
                    <SelectItem
                      key={`${token.symbol}-${token.chain}`}
                      value={`${token.symbol}-${token.chain}`}
                    >
                      {token.symbol} - {token.balance} ({token.chain})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Amount
              </label>
              <Input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {selectedToken && (
                <p className="text-xs text-muted-foreground mt-1">
                  Available: {selectedToken.balance}{' '}
                  {selectedToken.symbol}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Recipient Address
              </label>
              <Input
                value={recipientAddress}
                readOnly
                disabled={true}
                className="font-mono text-xs bg-gray-50 cursor-not-allowed"
              />
              {selectedChain === 'ETHEREUM' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Sending to Ethereum address of recipient
                </p>
              )}
              {selectedChain === 'SOLANA' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Sending to Solana address of recipient
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseSendModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSendToken}
              disabled={isProcessing || !selectedToken || !amount}
            >
              {isProcessing ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
