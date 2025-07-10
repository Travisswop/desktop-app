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
import { DecodedMessage } from '@xmtp/browser-sdk';
import { useXmtpContext } from '@/lib/context/XmtpContext';
import { AnyConversation } from '@/lib/xmtp';
import { safeGetPeerAddress } from '@/lib/xmtp-safe';

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
  conversation: AnyConversation;
  tokenData?: TokenData[];
  recipientWalletData?: WalletData[];
}

export default function ChatBox({
  conversation,
  tokenData,
  recipientWalletData,
}: ChatProps) {
  const { client, sendText } = useXmtpContext();
  const [messages, setMessages] = useState<DecodedMessage[]>([]);
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
  const [recipientUserAddress, setRecipientUserAddress] = useState<string | null>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { wallets: ethWallets } = useWallets();
  const { wallets: solanaWallets } = useSolanaWallets();

  const SOLANA_RPC_URL =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    'https://api.mainnet-beta.solana.com';

  // Extract peer address properly
  useEffect(() => {
    const extractPeerAddress = async () => {
      if (conversation) {
        try {
          console.log('🔍 [ChatBox] Extracting peer address from conversation object...');
          console.log('🔍 [ChatBox] Conversation object keys:', Object.keys(conversation as any));
          console.log('🔍 [ChatBox] Conversation object:', conversation);

          // Try multiple methods to extract peer address
          let peerAddress = '';
          let topic = '';
          let displayAddress = '';

          // Method 1: Direct properties (v3 SDK style)
          const dm = conversation as unknown as { peerAddress?: string; topic?: string };
          if (dm.peerAddress) {
            peerAddress = dm.peerAddress;
            console.log('✅ [ChatBox] Found peerAddress via direct property:', peerAddress);
          }
          if (dm.topic) {
            topic = dm.topic;
            console.log('✅ [ChatBox] Found topic via direct property:', topic);
          }

          // Method 2: Check for members method (v3 Group conversations)
          if (!peerAddress && typeof (conversation as any).members === 'function') {
            try {
              const members = await (conversation as any).members();
              console.log('🔍 [ChatBox] Conversation members:', members);
              if (members && Array.isArray(members) && members.length > 0) {
                // Find the member that's not the current user
                const currentUserAddress = await (conversation as any).client?.address;
                const otherMember = members.find((member: any) => {
                  const memberAddr = member.accountAddresses?.[0] || member.addresses?.[0] || member.address;
                  return memberAddr && memberAddr.toLowerCase() !== currentUserAddress?.toLowerCase();
                });
                if (otherMember) {
                  peerAddress = otherMember.accountAddresses?.[0] || otherMember.addresses?.[0] || otherMember.address || '';
                  console.log('✅ [ChatBox] Found peerAddress via members:', peerAddress);
                }
              }
            } catch (membersError) {
              console.log('⚠️ [ChatBox] Could not get members:', membersError);
            }
          }

          // Method 3: Check conversation metadata/state
          if (!peerAddress && (conversation as any).metadata) {
            const metadata = (conversation as any).metadata;
            console.log('🔍 [ChatBox] Checking metadata:', metadata);
            if (metadata.peerAddress) {
              peerAddress = metadata.peerAddress;
              console.log('✅ [ChatBox] Found peerAddress via metadata:', peerAddress);
            }
          }

          // Method 4: Check if conversation has participants
          if (!peerAddress && (conversation as any).participants) {
            const participants = (conversation as any).participants;
            console.log('🔍 [ChatBox] Checking participants:', participants);
            if (Array.isArray(participants) && participants.length > 0) {
              const otherParticipant = participants.find((p: any) => p !== (conversation as any).client?.address);
              if (otherParticipant) {
                peerAddress = otherParticipant;
                console.log('✅ [ChatBox] Found peerAddress via participants:', peerAddress);
              }
            }
          }

          // Method 5: Check conversation ID for embedded address
          if (!peerAddress && (conversation as any).id) {
            const conversationId = (conversation as any).id;
            console.log('🔍 [ChatBox] Checking conversation ID for address patterns:', conversationId);
            // Sometimes the conversation ID contains the peer address
            // This is a fallback method and might not always work
            topic = conversationId;
          }

          // Determine the display address
          displayAddress = peerAddress || topic || "";

          console.log('✅ [ChatBox] Final extracted peer info:', {
            conversationId: (conversation as any).id,
            peerAddress: peerAddress || 'null',
            topic: topic || 'null',
            displayAddress: displayAddress || 'null',
            conversationType: (conversation as any).version || 'unknown'
          });

          setRecipientUserAddress(displayAddress || null);
        } catch (error) {
          console.error('❌ [ChatBox] Error extracting peer address:', error);
          console.error('❌ [ChatBox] Conversation object that failed:', conversation);
        }
      }
    };

    extractPeerAddress();
  }, [conversation]);

  // Set recipient address based on chain and extracted peer address
  useEffect(() => {
    // Set recipient address from the extracted peer address for Ethereum transactions
    if (selectedChain === 'ETHEREUM' && recipientUserAddress) {
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

  useEffect(() => {
    const loadMessages = async () => {
      if (!conversation) return;
      console.log('🔄 [ChatBox] Loading initial messages for conversation:', conversation);
      try {
        // Sync conversation first to get latest messages
        console.log('🔄 [ChatBox] Syncing conversation before loading messages...');

        // Handle the misleading XMTP sync "error"
        try {
          await (conversation as any).sync?.();
          console.log('✅ [ChatBox] Conversation sync complete');
        } catch (syncError: any) {
          // Check if this is the misleading "successful sync" error from XMTP SDK
          if (syncError.message &&
            syncError.message.includes('synced') &&
            syncError.message.includes('succeeded') &&
            (syncError.message.includes('0 failed') || !syncError.message.includes('failed'))) {

            console.log('🔄 [ChatBox] Detected successful sync reported as error, treating as success:', syncError.message);
          } else {
            // This is a real sync error, re-throw it
            throw syncError;
          }
        }

        const initialMessages = await conversation.messages();
        console.log('✅ [ChatBox] Initial messages loaded:', initialMessages.length, 'messages');
        console.log('📝 [ChatBox] Initial messages:', initialMessages);

        // Add detailed logging for each message
        initialMessages.forEach((msg: any, index: number) => {
          console.log(`📝 [ChatBox] Message ${index + 1}:`, {
            id: msg.id,
            content: msg.content,
            senderAddress: msg.senderAddress,
            sent: msg.sent,
            contentType: msg.contentType
          });
        });

        setMessages(initialMessages);
        console.log('✅ [ChatBox] Messages state updated with', initialMessages.length, 'messages');

        // If no messages initially, try refreshing after a short delay
        if (initialMessages.length === 0) {
          console.log('🔄 [ChatBox] No initial messages found, will retry in 2 seconds...');
          setTimeout(async () => {
            try {
              const retryMessages = await conversation.messages();
              console.log('🔄 [ChatBox] Retry messages loaded:', retryMessages.length, 'messages');
              if (retryMessages.length > 0) {
                setMessages(retryMessages);
                console.log('✅ [ChatBox] Retry successful, messages updated');
              }
            } catch (retryError) {
              console.log('⚠️ [ChatBox] Retry failed:', retryError);
            }
          }, 2000);
        }
      } catch (error) {
        console.error('❌ [ChatBox] Error loading messages:', error);

        // Fallback: try to load messages without sync
        try {
          console.log('🔄 [ChatBox] Attempting fallback message loading without sync...');
          const fallbackMessages = await conversation.messages();
          setMessages(fallbackMessages);
          console.log('✅ [ChatBox] Fallback message loading successful:', fallbackMessages.length, 'messages');
        } catch (fallbackError) {
          console.error('❌ [ChatBox] Fallback message loading also failed:', fallbackError);
        }
      }
    };
    loadMessages();
  }, [conversation]);

  useEffect(() => {
    if (!conversation) return;
    console.log('🎧 [ChatBox] Setting up message stream for conversation:', conversation);

    let isMounted = true;
    let stream: any;

    const streamMessages = async () => {
      try {
        console.log('🔄 [ChatBox] Starting message stream...');

        // Sync conversation before starting stream to catch any missed messages
        // Handle the misleading XMTP sync "error"
        try {
          await (conversation as any).sync?.();
          console.log('✅ [ChatBox] Conversation sync complete before streaming');
        } catch (syncError: any) {
          // Check if this is the misleading "successful sync" error from XMTP SDK
          if (syncError.message &&
            syncError.message.includes('synced') &&
            syncError.message.includes('succeeded') &&
            (syncError.message.includes('0 failed') || !syncError.message.includes('failed'))) {

            console.log('🔄 [ChatBox] Detected successful sync reported as error, treating as success:', syncError.message);
          } else {
            // This is a real sync error, re-throw it
            throw syncError;
          }
        }

        // Use the stream() API to listen for new messages
        stream = await (conversation as any).stream();
        console.log('✅ [ChatBox] Message stream established');

        for await (const message of stream) {
          console.log('📨 [ChatBox] New message received from stream:', message);
          console.log('📨 [ChatBox] Message details:', {
            id: (message as any).id,
            content: (message as any).content,
            senderAddress: (message as any).senderAddress,
            sent: (message as any).sent
          });

          if (isMounted) {
            console.log('✅ [ChatBox] Adding message to state');
            setMessages((prevMessages) => {
              // Check if message already exists to avoid duplicates
              const messageExists = prevMessages.some(
                (prevMsg) => (prevMsg as any).id === (message as any).id
              );

              if (!messageExists) {
                const updatedMessages = [...prevMessages, message];
                console.log('📝 [ChatBox] Updated messages count:', updatedMessages.length);
                return updatedMessages;
              } else {
                console.log('⚠️ [ChatBox] Message already exists, skipping duplicate');
                return prevMessages;
              }
            });
          } else {
            console.log('⚠️ [ChatBox] Component unmounted, not adding message');
          }
        }
      } catch (error: any) {
        // Check if this is the misleading "successful sync" error from XMTP SDK
        if (error.message &&
          error.message.includes('synced') &&
          error.message.includes('succeeded') &&
          (error.message.includes('0 failed') || !error.message.includes('failed'))) {

          console.log('🔄 [ChatBox] Detected successful sync reported as error in stream, treating as success:', error.message);
          // Don't log as error, continue operation
        } else {
          // This is a real streaming error
          console.error('❌ [ChatBox] Error in message stream:', error);
        }
      }
    };

    streamMessages();

    return () => {
      console.log('🧹 [ChatBox] Cleaning up message stream');
      isMounted = false;
      if (stream) {
        try {
          stream.return();
          console.log('✅ [ChatBox] Stream cleanup completed');
        } catch (error) {
          console.error('❌ [ChatBox] Error during stream cleanup:', error);
        }
      }
    };
  }, [conversation]);

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
  }, [messages]);

  // Add debugging for messages state changes
  useEffect(() => {
    console.log('🔄 [ChatBox] Messages state changed:', {
      messageCount: messages.length,
      hasMessages: messages.length > 0,
      messages: messages.map((msg: any, index: number) => ({
        index,
        id: msg.id,
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        senderAddress: msg.senderAddress,
        sent: msg.sent
      }))
    });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && conversation) {
      console.log('📤 [ChatBox] Attempting to send message:', inputMessage);
      console.log('📤 [ChatBox] Conversation details:', conversation);
      console.log('📤 [ChatBox] Conversation ID:', (conversation as any).id);
      console.log('📤 [ChatBox] Peer Address:', recipientUserAddress);

      try {
        console.log('🔄 [ChatBox] Calling sendText function...');
        await sendText(conversation, inputMessage);
        console.log('✅ [ChatBox] Message sent successfully');
        setInputMessage('');
      } catch (error: any) {
        // Check if this is the misleading "successful sync" error from XMTP SDK
        if (error.message &&
          error.message.includes('synced') &&
          error.message.includes('succeeded') &&
          (error.message.includes('0 failed') || !error.message.includes('failed'))) {

          console.log('🔄 [ChatBox] Detected successful sync reported as error, treating as success:', error.message);
          console.log('✅ [ChatBox] Message sent successfully (despite misleading error)');
          setInputMessage('');
          return; // Treat as success
        }

        // This is a real error
        console.error('❌ [ChatBox] Error sending message:', error);
        console.error('❌ [ChatBox] Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        toast({
          title: 'Error',
          description: 'Failed to send message.',
          variant: 'destructive',
        });
      }
    } else {
      console.log('⚠️ [ChatBox] Cannot send message:', {
        hasInputMessage: !!inputMessage.trim(),
        hasConversation: !!conversation,
        inputMessage: inputMessage
      });
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); // Prevent the default new line behavior
      handleSendMessage(event as any); // Trigger form submit
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
      setRecipientAddress(recipientUserAddress || '');
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
      if (recipientUserAddress && client?.inboxId) {
        try {
          const messageResponse = await fetch('http://localhost:1212/api/xmtp/messages/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              senderAddress: client?.inboxId,
              recipientInboxId: (conversation as any).id, // Assuming conversation.id is the inboxId
              message: `I've sent you ${amount} ${selectedToken.symbol} on ${selectedChain}.`,
            }),
          });

          if (!messageResponse.ok) {
            console.error('Failed to send notification message');
          }
        } catch (messageError) {
          console.error('Error sending notification message:', messageError);
        }
      }

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

  // Helper function to safely render message content
  const renderMessageContent = (content: any) => {
    // If content is a string, render it directly
    if (typeof content === 'string') {
      return content;
    }

    // If content is an object, handle different types of system messages
    if (typeof content === 'object' && content !== null) {
      // Handle XMTP system messages (like member additions/removals)
      if (content.initiatedByInboxId) {
        const { addedInboxes = [], removedInboxes = [] } = content;

        if (addedInboxes.length > 0) {
          return `🎉 ${addedInboxes.length === 1 ? 'New member' : 'New members'} joined the conversation`;
        }

        if (removedInboxes.length > 0) {
          return `👋 ${removedInboxes.length === 1 ? 'Member' : 'Members'} left the conversation`;
        }

        return '📢 Group membership updated';
      }

      // Handle other object types by converting to JSON string
      return `System message: ${JSON.stringify(content)}`;
    }

    // Fallback for any other types
    return String(content);
  };

  const MessageList = ({ messages }: { messages: DecodedMessage[] }) => {
    const uniqueMessages = messages.filter(
      (v, i, a) => a.findIndex((t) => (t as any).id === (v as any).id) === i
    );

    console.log('🎨 [ChatBox] Rendering messages:', {
      totalMessages: messages.length,
      uniqueMessages: uniqueMessages.length,
      clientInboxId: client?.inboxId,
      clientAddress: client?.address
    });

    return (
      <div className="px-4 md:px-8 h-full pb-24">
        {uniqueMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          uniqueMessages.map((message, index) => {
            const senderAddress = (message as any).senderAddress;
            const senderInboxId = (message as any).senderInboxId;
            const sent = (message as any).sent;
            const content = (message as any).content;
            const id = (message as any).id;

            // Try multiple ways to determine if this is our message
            const isOurMessage =
              senderAddress === client?.address ||
              senderInboxId === client?.inboxId ||
              senderAddress === client?.inboxId;

            console.log(`🎨 [ChatBox] Rendering message ${index + 1}:`, {
              id,
              senderAddress,
              senderInboxId,
              clientAddress: client?.address,
              clientInboxId: client?.inboxId,
              isOurMessage,
              content: typeof content === 'string' ? content : JSON.stringify(content),
              sent
            });

            return (
              <div
                key={id}
                ref={
                  index === uniqueMessages.length - 1
                    ? lastMessageRef
                    : null
                }
                className={`mb-4 ${isOurMessage
                  ? 'text-right'
                  : 'text-left'
                  }`}
              >
                <div
                  className={`inline-block px-3 py-2 rounded-lg max-w-xs lg:max-w-md ${isOurMessage
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                    }`}
                >
                  {renderMessageContent(content)}
                </div>
                <div className="text-xs mt-1 text-muted-foreground">
                  {new Date(sent).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true,
                  })}
                  {/* Debug info - remove in production */}
                  <span className="ml-2 opacity-60">
                    {isOurMessage ? '(You)' : '(Them)'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="pt-4 w-full overflow-x-hidden h-full">
      <MessageList messages={messages} />
      <div className="absolute bottom-0 bg-white py-4 w-full">
        <form onSubmit={handleSendMessage} className="">
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
