'use client';

import React, { createContext, useState, useContext, useCallback, useMemo, useEffect } from "react";
import { useWallets } from '@privy-io/react-auth';
import { Client, Identifier, Signer as XMSigner, Conversation, Dm, Group, ConsentState } from "@xmtp/browser-sdk";
import { ethers } from "ethers";

export type AnyConversation = Conversation<unknown> | Dm<unknown> | Group<unknown>;

interface XmtpContextValue {
  client: Client | null;
  isConnected: boolean;
  conversations: AnyConversation[];
  conversationRequests: AnyConversation[];
  loading: boolean;
  error: Error | null;
  initClient: () => Promise<Client | null>;
  disconnect: () => void;
  refreshConversations: () => Promise<void>;
  newConversation: (addressOrName: string) => Promise<AnyConversation | null>;
  sendText: (conversation: AnyConversation, message: string) => Promise<unknown | null>;
  allowConversation: (conversation: AnyConversation) => void;
  canMessage: (address: string) => Promise<boolean>;
  getMessages: (conversation: AnyConversation) => Promise<any[]>;
  clearClientData: () => void;
}

const XmtpContext = createContext<XmtpContextValue | null>(null);

export const useXmtpContext = (): XmtpContextValue => {
  const ctx = useContext(XmtpContext);
  if (!ctx) throw new Error('useXmtpContext must be used within XmtpProvider');
  return ctx;
};

export const XmtpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { wallets } = useWallets();
  const [client, setClient] = useState<Client | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState<AnyConversation[]>([]);
  const [conversationRequests, setConversationRequests] = useState<AnyConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get the Ethereum wallet from Privy
  const privyEthWallet = useMemo(() => {
    console.log('🔍 [XmtpContext] Checking wallets:', {
      walletsLength: wallets?.length || 0,
      wallets: wallets?.map(w => ({ type: w.type, address: w.address }))
    });

    if (!wallets?.length) {
      console.log('⚠️ [XmtpContext] No wallets available');
      return null;
    }

    const ethWallet = wallets.find((w) => w?.type === 'ethereum');
    if (ethWallet) {
      console.log('✅ [XmtpContext] Found Ethereum wallet:', ethWallet.address);
      return ethWallet;
    }

    console.log('⚠️ [XmtpContext] No Ethereum wallet found, using first wallet');
    return wallets[0];
  }, [wallets]);

  // Initialize the XMTP client
  const initClient = useCallback(async (): Promise<Client | null> => {
    if (!privyEthWallet) {
      console.log('❌ [XmtpContext] No Privy wallet available for XMTP initialization');
      setError(new Error('No wallet connected'));
      setLoading(false);
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 [XmtpContext] Starting XMTP client initialization...');
      console.log('🔄 [XmtpContext] Wallet details:', {
        address: privyEthWallet.address,
        type: privyEthWallet.type
      });

      // Get the Ethereum provider from Privy wallet
      console.log('🔄 [XmtpContext] Getting Ethereum provider...');
      const provider = await privyEthWallet.getEthereumProvider();

      if (!provider) {
        throw new Error('Failed to get Ethereum provider from Privy wallet');
      }

      console.log('✅ [XmtpContext] Ethereum provider obtained');

      // Create ethers provider and signer
      const ethersProvider = new ethers.BrowserProvider(provider as any);
      const ethSigner = await ethersProvider.getSigner();
      const address = await ethSigner.getAddress();

      console.log('✅ [XmtpContext] Ethereum signer ready:', {
        address: address,
        walletAddress: privyEthWallet.address,
        match: address.toLowerCase() === privyEthWallet.address.toLowerCase()
      });

      // Create XMTP-compatible signer following v3 documentation
      const accountIdentifier: Identifier = {
        identifier: address.toLowerCase(),
        identifierKind: "Ethereum",
      };

      const xmtpSigner: XMSigner = {
        type: "EOA",
        getIdentifier: () => accountIdentifier,
        signMessage: async (message: string): Promise<Uint8Array> => {
          console.log('🔄 [XmtpContext] Signing message for XMTP...');
          try {
            const signature = await ethSigner.signMessage(message);
            console.log('✅ [XmtpContext] Message signed successfully');
            return ethers.getBytes(signature);
          } catch (signError) {
            console.error('❌ [XmtpContext] Error signing message:', signError);
            throw signError;
          }
        },
      };

      console.log('🔄 [XmtpContext] Creating XMTP client...');

      // Create XMTP client following v3 documentation
      const xmtp = await Client.create(xmtpSigner, {
        env: "production" // Use production environment for real deployment
      });

      console.log('✅ [XmtpContext] XMTP client created successfully:', {
        inboxId: xmtp.inboxId,
        address: address,
        clientReady: !!xmtp
      });

      setClient(xmtp);
      setIsConnected(true);
      setLoading(false);

      return xmtp;
    } catch (error) {
      console.error("❌ [XmtpContext] Error initializing XMTP client:", error);

      // Provide more specific error messages
      let errorMessage = 'Failed to initialize XMTP client';
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          errorMessage = 'Wallet signature was rejected. Please try again.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          errorMessage = error.message;
        }
      }

      setError(new Error(errorMessage));
      setIsConnected(false);
      setLoading(false);
      return null;
    }
  }, [privyEthWallet]);

  // Disconnect the XMTP client
  const disconnect = useCallback(() => {
    console.log('🔄 [XmtpContext] Disconnecting XMTP client...');
    setClient(null);
    setIsConnected(false);
    setConversations([]);
    setConversationRequests([]);
    setError(null);
    console.log('✅ [XmtpContext] XMTP client disconnected');
  }, []);

  // Load conversations following v3 documentation
  const refreshConversations = useCallback(async (): Promise<void> => {
    if (!client) {
      console.log('⚠️ [XmtpContext] Cannot refresh conversations - no client');
      return;
    }

    try {
      console.log('🔄 [XmtpContext] Syncing and loading conversations...');

      // Sync new conversations from network (v3 approach)
      try {
        await client.conversations.sync();
        console.log('✅ [XmtpContext] Conversations synced from network');
      } catch (syncErr) {
        console.warn('⚠️ [XmtpContext] Sync warning (may be expected):', syncErr);
      }

      // List all conversations
      const convos = await client.conversations.list();
      console.log('📝 [XmtpContext] Found conversations:', convos.length);

      const allowedConvos: AnyConversation[] = [];
      const requestConvos: AnyConversation[] = [];

      // Process conversations and check consent state
      for (const convo of convos) {
        try {
          const consentState = (convo as any).consentState;
          console.log('📝 [XmtpContext] Conversation consent state:', {
            id: (convo as any).id,
            consentState: consentState
          });

          if (consentState === 'allowed') {
            allowedConvos.push(convo as AnyConversation);
          } else {
            requestConvos.push(convo as AnyConversation);
          }
        } catch (convoError) {
          console.warn('⚠️ [XmtpContext] Error processing conversation:', convoError);
          // Default to allowed if we can't determine consent state
          allowedConvos.push(convo as AnyConversation);
        }
      }

      setConversations(allowedConvos);
      setConversationRequests(requestConvos);

      console.log('✅ [XmtpContext] Conversations loaded:', {
        allowed: allowedConvos.length,
        requests: requestConvos.length,
        total: convos.length
      });
    } catch (error) {
      console.error("❌ [XmtpContext] Error loading conversations:", error);
      setError(error instanceof Error ? error : new Error('Failed to load conversations'));
    }
  }, [client]);

  // Create new conversation following v3 documentation
  const newConversation = useCallback(async (addressOrName: string): Promise<AnyConversation | null> => {
    if (!client) {
      console.log('❌ [XmtpContext] Cannot create conversation - no client');
      return null;
    }

    try {
      console.log('🔄 [XmtpContext] Creating new conversation with:', addressOrName);

      let address = addressOrName;

      // Handle ENS resolution
      if (addressOrName.includes(".eth")) {
        console.log('🔄 [XmtpContext] Resolving ENS name:', addressOrName);
        const provider = new ethers.JsonRpcProvider(
          "https://eth-mainnet.g.alchemy.com/v2/3YZEMwwXrlGYDY4t-PQED7DOx28wR9av"
        );
        const resolvedAddress = await provider.resolveName(addressOrName);
        if (!resolvedAddress) {
          throw new Error(`Could not resolve ENS name: ${addressOrName}`);
        }
        address = resolvedAddress;
        console.log('✅ [XmtpContext] ENS resolved to:', address);
      }

      // Check if address can receive messages
      const canMessageResult = await client.canMessage([{
        identifier: address.toLowerCase(),
        identifierKind: "Ethereum",
      }]);

      const canMsg = canMessageResult.get(address.toLowerCase());
      if (!canMsg) {
        throw new Error(`Address ${address} cannot receive XMTP messages`);
      }

      console.log('✅ [XmtpContext] Address can receive messages');

      // Create identifier for new DM
      const identifier: Identifier = {
        identifier: address.toLowerCase(),
        identifierKind: "Ethereum",
      };

      // Create new DM conversation
      const conversation = await client.conversations.newDmWithIdentifier(identifier);

      // Immediately allow the conversation
      await (conversation as any).updateConsentState(ConsentState.Allowed);

      console.log('✅ [XmtpContext] New conversation created:', {
        id: (conversation as any).id,
        peerAddress: address
      });

      // Refresh conversations to include the new one
      await refreshConversations();

      return conversation as unknown as AnyConversation;
    } catch (error) {
      console.error("❌ [XmtpContext] Error creating conversation:", error);
      setError(error instanceof Error ? error : new Error('Failed to create conversation'));
      return null;
    }
  }, [client, refreshConversations]);

  // Send message following v3 documentation
  const sendText = useCallback(async (conversation: AnyConversation, message: string): Promise<unknown | null> => {
    if (!client || !conversation) {
      console.log('❌ [XmtpContext] Cannot send message - missing client or conversation');
      return null;
    }

    try {
      console.log('📤 [XmtpContext] Sending message:', message);
      const sent = await conversation.send(message);
      console.log('✅ [XmtpContext] Message sent successfully');
      return sent;
    } catch (error) {
      // Handle the misleading "successful sync" error from XMTP SDK
      if (error instanceof Error &&
        error.message.includes('synced') &&
        error.message.includes('succeeded') &&
        (error.message.includes('0 failed') || !error.message.includes('failed'))) {
        console.log('🔄 [XmtpContext] Message sent successfully (sync message detected)');
        return true;
      }

      console.error("❌ [XmtpContext] Error sending message:", error);
      setError(error instanceof Error ? error : new Error('Failed to send message'));
      return null;
    }
  }, [client]);

  // Allow conversation request
  const allowConversation = useCallback(async (conversation: AnyConversation): Promise<void> => {
    try {
      console.log('🔄 [XmtpContext] Allowing conversation...');
      await (conversation as any).updateConsentState(ConsentState.Allowed);
      await refreshConversations();
      console.log('✅ [XmtpContext] Conversation allowed');
    } catch (error) {
      console.error("❌ [XmtpContext] Error allowing conversation:", error);
      setError(error instanceof Error ? error : new Error('Failed to allow conversation'));
    }
  }, [refreshConversations]);

  // Check if can message an address
  const canMessage = useCallback(async (address: string): Promise<boolean> => {
    if (!client) return false;

    try {
      const identifier: Identifier = {
        identifier: address.toLowerCase(),
        identifierKind: "Ethereum",
      };
      const result = await client.canMessage([identifier]);
      return result.get(address.toLowerCase()) ?? false;
    } catch (error) {
      console.error("❌ [XmtpContext] Error checking canMessage:", error);
      return false;
    }
  }, [client]);

  // Get messages from conversation following v3 documentation
  const getMessages = useCallback(async (conversation: AnyConversation): Promise<any[]> => {
    if (!conversation) return [];

    try {
      console.log('🔄 [XmtpContext] Loading messages...');

      // Sync conversation to get latest messages
      try {
        await (conversation as any).sync?.();
      } catch (syncError) {
        console.warn('⚠️ [XmtpContext] Sync warning (may be expected):', syncError);
      }

      const messages = await conversation.messages();
      console.log('✅ [XmtpContext] Messages loaded:', messages.length);
      return messages;
    } catch (error) {
      console.error("❌ [XmtpContext] Error loading messages:", error);
      return [];
    }
  }, []);

  // Clear client data
  const clearClientData = useCallback(() => {
    disconnect();
  }, [disconnect]);

  // Auto-initialize when wallet becomes available
  useEffect(() => {
    console.log('🔍 [XmtpContext] Auto-init check:', {
      hasWallet: !!privyEthWallet,
      hasClient: !!client,
      isLoading: loading
    });

    if (privyEthWallet && !client && !loading) {
      console.log('🚀 [XmtpContext] Starting auto-initialization...');
      initClient();
    }
  }, [privyEthWallet, client, loading, initClient]);

  // Auto-load conversations when client is ready
  useEffect(() => {
    if (client && isConnected) {
      console.log('🚀 [XmtpContext] Client ready, loading conversations...');
      refreshConversations();
    }
  }, [client, isConnected, refreshConversations]);

  // Debug wallet state changes
  useEffect(() => {
    console.log('🔍 [XmtpContext] Wallet state changed:', {
      walletCount: wallets?.length || 0,
      hasEthWallet: !!privyEthWallet,
      walletAddress: privyEthWallet?.address
    });
  }, [wallets, privyEthWallet]);

  // Value object to be provided by the context
  const value: XmtpContextValue = useMemo(() => ({
    client,
    isConnected,
    conversations,
    conversationRequests,
    loading,
    error,
    initClient,
    disconnect,
    refreshConversations,
    newConversation,
    sendText,
    allowConversation,
    canMessage,
    getMessages,
    clearClientData,
  }), [
    client,
    isConnected,
    conversations,
    conversationRequests,
    loading,
    error,
    initClient,
    disconnect,
    refreshConversations,
    newConversation,
    sendText,
    allowConversation,
    canMessage,
    getMessages,
    clearClientData,
  ]);

  return (
    <XmtpContext.Provider value={value}>
      {children}
    </XmtpContext.Provider>
  );
};
