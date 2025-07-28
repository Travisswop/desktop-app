"use client";

import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { useWallets } from "@privy-io/react-auth";
import {
  Client,
  Identifier,
  Signer as XMSigner,
  Conversation,
  Dm,
  Group,
  ConsentState,
} from "@xmtp/browser-sdk";
import { ethers } from "ethers";

export type AnyConversation =
  | Conversation<unknown>
  | Dm<unknown>
  | Group<unknown>;

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
  sendText: (
    conversation: AnyConversation,
    message: string
  ) => Promise<unknown | null>;
  allowConversation: (conversation: AnyConversation) => void;
  canMessage: (address: string) => Promise<boolean>;
  getMessages: (conversation: AnyConversation) => Promise<any[]>;
  clearClientData: () => void;
}

const XmtpContext = createContext<XmtpContextValue | null>(null);

export const useXmtpContext = (): XmtpContextValue => {
  const ctx = useContext(XmtpContext);
  if (!ctx) throw new Error("useXmtpContext must be used within XmtpProvider");
  return ctx;
};

export const XmtpProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { wallets } = useWallets();
  const [client, setClient] = useState<Client | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState<AnyConversation[]>([]);
  const [conversationRequests, setConversationRequests] = useState<
    AnyConversation[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get the Ethereum wallet from Privy
  const privyEthWallet = useMemo(() => {


    if (!wallets?.length) {
      return null;
    }

    const ethWallet = wallets.find((w) => w?.type === "ethereum");
    if (ethWallet) {
      return ethWallet;
    }

    return wallets[0];
  }, [wallets]);

  // Initialize the XMTP client
  const initClient = useCallback(async (): Promise<Client | null> => {
    if (!privyEthWallet) {

      setError(new Error("No wallet connected"));
      setLoading(false);
      return null;
    }

    try {
      setLoading(true);
      setError(null);


      // Get the Ethereum provider from Privy wallet
      const provider = await privyEthWallet.getEthereumProvider();

      if (!provider) {
        throw new Error("Failed to get Ethereum provider from Privy wallet");
      }


      // Create ethers provider and signer
      const ethersProvider = new ethers.BrowserProvider(provider as any);
      const ethSigner = await ethersProvider.getSigner();
      const address = await ethSigner.getAddress();

      console.log("✅ [XmtpContext] Ethereum signer ready:", {
        address: address,
        walletAddress: privyEthWallet.address,
        match: address.toLowerCase() === privyEthWallet.address.toLowerCase(),
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
          try {
            const signature = await ethSigner.signMessage(message);
            return ethers.getBytes(signature);
          } catch (signError) {
            console.error("❌ [XmtpContext] Error signing message:", signError);
            throw signError;
          }
        },
      };


      // Create XMTP client following v3 documentation
      const xmtp = await Client.create(xmtpSigner, {
        env: "production", // Use production environment for real deployment
      });



      setClient(xmtp);
      setIsConnected(true);
      setLoading(false);

      return xmtp;
    } catch (error) {
      console.error("❌ [XmtpContext] Error initializing XMTP client:", error);

      // Provide more specific error messages
      let errorMessage = "Failed to initialize XMTP client";
      if (error instanceof Error) {
        if (error.message.includes("User rejected")) {
          errorMessage = "Wallet signature was rejected. Please try again.";
        } else if (error.message.includes("network")) {
          errorMessage = "Network error. Please check your connection.";
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
    setClient(null);
    setIsConnected(false);
    setConversations([]);
    setConversationRequests([]);
    setError(null);
  }, []);

  // Load conversations following v3 documentation
  const refreshConversations = useCallback(async (): Promise<void> => {
    if (!client) {
      return;
    }

    try {

      // Sync new conversations from network (v3 approach)
      try {
        await client.conversations.sync();
      } catch (syncErr) {
        console.warn(
          "⚠️ [XmtpContext] Sync warning (may be expected):",
          syncErr
        );
      }

      // List all conversations
      const convos = await client.conversations.list();

      const allowedConvos: AnyConversation[] = [];
      const requestConvos: AnyConversation[] = [];

      // Process conversations and check consent state
      for (const convo of convos) {
        try {
          const consentState = (convo as any).consentState;

          if (consentState === "allowed") {
            allowedConvos.push(convo as AnyConversation);
          } else {
            requestConvos.push(convo as AnyConversation);
          }
        } catch (convoError) {
          console.warn(
            "⚠️ [XmtpContext] Error processing conversation:",
            convoError
          );
          // Default to allowed if we can't determine consent state
          allowedConvos.push(convo as AnyConversation);
        }
      }

      setConversations(allowedConvos);
      setConversationRequests(requestConvos);


    } catch (error) {
      console.error("❌ [XmtpContext] Error loading conversations:", error);
      setError(
        error instanceof Error
          ? error
          : new Error("Failed to load conversations")
      );
    }
  }, [client]);

  // Create new conversation following v3 documentation
  const newConversation = useCallback(
    async (addressOrName: string): Promise<AnyConversation | null> => {
      if (!client) {
        return null;
      }

      try {

        let address = addressOrName;

        // Handle ENS resolution
        if (addressOrName.includes(".eth")) {
          const provider = new ethers.JsonRpcProvider(
            "https://eth-mainnet.g.alchemy.com/v2/3YZEMwwXrlGYDY4t-PQED7DOx28wR9av"
          );
          const resolvedAddress = await provider.resolveName(addressOrName);
          if (!resolvedAddress) {
            throw new Error(`Could not resolve ENS name: ${addressOrName}`);
          }
          address = resolvedAddress;
        }

        // Check if address can receive messages
        const canMessageResult = await client.canMessage([
          {
            identifier: address.toLowerCase(),
            identifierKind: "Ethereum",
          },
        ]);

        const canMsg = canMessageResult.get(address.toLowerCase());
        if (!canMsg) {
          throw new Error(`Address ${address} cannot receive XMTP messages`);
        }


        // Create identifier for the peer
        const identifier: Identifier = {
          identifier: address.toLowerCase(),
          identifierKind: "Ethereum",
        };

        // First, get the peer's inbox ID
        let peerInboxId: string;

        try {
          // For XMTP v3, we need to get the inbox ID from the identifier
          // This is a simplified approach - in production you might need to handle this differently
          const inboxId = await client.findInboxIdByIdentifier(identifier);

          if (!inboxId) {
            throw new Error(`Could not get inbox ID for address: ${address}`);
          }

          peerInboxId = inboxId;
        } catch (error) {
          console.error("❌ [XmtpContext] Error getting peer inbox ID:", error);
          throw error;
        }

        // Check if we already have a DM with this peer
        let conversation: any;

        try {
          conversation = await client.conversations.getDmByInboxId(peerInboxId);
          if (conversation) {
            console.log("✅ [XmtpContext] Found existing DM:", {
              id: conversation.id,
              peerInboxId: peerInboxId,
            });
          }
        } catch (error) {
          console.log(
            "📝 [XmtpContext] No existing DM found, will create new one"
          );
          conversation = null;
        }

        // If no existing DM, create a new one
        if (!conversation) {
          try {
            conversation = await client.conversations.newDm(peerInboxId);
            console.log("✅ [XmtpContext] New DM created:", {
              id: conversation.id,
              peerInboxId: peerInboxId,
            });
          } catch (error) {
            console.error("❌ [XmtpContext] Error creating new DM:", error);
            throw error;
          }
        }

        // Ensure the conversation is allowed
        try {
          await conversation.updateConsentState(ConsentState.Allowed);
        
        } catch (error) {
          console.warn(
            "⚠️ [XmtpContext] Warning updating consent state:",
            error
          );
        }

        // Refresh conversations to include the new/updated one
        await refreshConversations();

        return conversation as unknown as AnyConversation;
      } catch (error) {
        console.error("❌ [XmtpContext] Error creating conversation:", error);
        setError(
          error instanceof Error
            ? error
            : new Error("Failed to create conversation")
        );
        return null;
      }
    },
    [client, refreshConversations]
  );

  // Send message following v3 documentation
  const sendText = useCallback(
    async (
      conversation: AnyConversation,
      message: string
    ): Promise<unknown | null> => {
      if (!client || !conversation) {
        console.log(
          "❌ [XmtpContext] Cannot send message - missing client or conversation"
        );
        return null;
      }

      try {
        const sent = await conversation.send(message);
        return sent;
      } catch (error) {
        // Handle the misleading "successful sync" error from XMTP SDK
        if (
          error instanceof Error &&
          error.message.includes("synced") &&
          error.message.includes("succeeded") &&
          (error.message.includes("0 failed") ||
            !error.message.includes("failed"))
        ) {
          console.log(
            "🔄 [XmtpContext] Message sent successfully (sync message detected)"
          );
          return true;
        }

        console.error("❌ [XmtpContext] Error sending message:", error);
        setError(
          error instanceof Error ? error : new Error("Failed to send message")
        );
        return null;
      }
    },
    [client]
  );

  // Allow conversation request
  const allowConversation = useCallback(
    async (conversation: AnyConversation): Promise<void> => {
      try {
        await (conversation as any).updateConsentState(ConsentState.Allowed);
        await refreshConversations();
      } catch (error) {
        console.error("❌ [XmtpContext] Error allowing conversation:", error);
        setError(
          error instanceof Error
            ? error
            : new Error("Failed to allow conversation")
        );
      }
    },
    [refreshConversations]
  );

  // Check if can message an address
  const canMessage = useCallback(
    async (address: string): Promise<boolean> => {
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
    },
    [client]
  );

  // Get messages from conversation following v3 documentation
  const getMessages = useCallback(
    async (conversation: AnyConversation): Promise<any[]> => {
      if (!conversation) return [];

      try {

        // Sync conversation to get latest messages
        try {
          await (conversation as any).sync?.();
        } catch (syncError) {
          console.warn(
            "⚠️ [XmtpContext] Sync warning (may be expected):",
            syncError
          );
        }

        const messages = await conversation.messages();
        return messages;
      } catch (error) {
        console.error("❌ [XmtpContext] Error loading messages:", error);
        return [];
      }
    },
    []
  );

  // Clear client data
  const clearClientData = useCallback(() => {
    disconnect();
  }, [disconnect]);

  // Auto-initialize when wallet becomes available
  useEffect(() => {
 

    if (privyEthWallet && !client && !loading) {
      console.log("🚀 [XmtpContext] Starting auto-initialization...");
      initClient();
    }
  }, []);

  // Auto-load conversations when client is ready
  useEffect(() => {
    if (client && isConnected) {
      console.log("🚀 [XmtpContext] Client ready, loading conversations...");
      refreshConversations();
    }
  }, []);

  // Debug wallet state changes
  useEffect(() => {
    console.log("🔍 [XmtpContext] Wallet state changed:", {
      walletCount: wallets?.length || 0,
      hasEthWallet: !!privyEthWallet,
      walletAddress: privyEthWallet?.address,
    });
  }, []);

  // Value object to be provided by the context
  const value: XmtpContextValue = useMemo(
    () => ({
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
    }),
    [
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
    ]
  );

  return <XmtpContext.Provider value={value}>{children}</XmtpContext.Provider>;
};
