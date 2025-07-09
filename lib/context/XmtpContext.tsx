'use client';

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

import { useWallets } from '@privy-io/react-auth';
import {
  safeGetClient,
  safeListConversations,
  safeStartNewConversation,
  AnyConversation,
  safeCanMessage,
  safeGetMessages,
  safeSyncConversations,
  safeGetPeerAddress,
} from '@/lib/xmtp-safe';
import { loadXmtp } from '@/lib/xmtp-browser';

// We'll initialize XMTP in useEffect

interface XmtpContextValue {
  client: any | null;
  isConnected: boolean;
  conversations: AnyConversation[];
  conversationRequests: AnyConversation[];
  loading: boolean;
  error: Error | null;
  refreshConversations: () => Promise<void>;
  newConversation: (peerAddress: string) => Promise<AnyConversation | null>;
  sendText: (convo: AnyConversation, text: string) => Promise<void>;
  allowConversation: (convo: AnyConversation) => Promise<void>;
  canMessage: (address: string) => Promise<boolean>;
  getMessages: (convo: AnyConversation) => Promise<any[]>;
}

const XmtpContext = createContext<XmtpContextValue | null>(null);

export const useXmtpContext = () => {
  const ctx = useContext(XmtpContext);
  if (!ctx) throw new Error('useXmtpContext must be used within XmtpProvider');
  return ctx;
};

export const XmtpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { wallets } = useWallets();
  const [client, setClient] = useState<any | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState<AnyConversation[]>([]);
  const [conversationRequests, setConversationRequests] = useState<AnyConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Initialize XMTP
  useEffect(() => {
    const initXmtp = async () => {
      try {
        // Preload XMTP module
        await loadXmtp();
      } catch (err) {
        console.error('Failed to initialize XMTP:', err);
      }
    };

    if (typeof window !== 'undefined') {
      initXmtp();
    }
  }, []);

  // Privy returns an array; pick the first ethereum wallet
  const privyEthWallet = useMemo(() => {
    if (!wallets?.length) return null;
    return wallets.find((w) => w?.type === 'ethereum') || wallets[0];
  }, [wallets]);

  // Initialise XMTP client when wallet becomes available
  useEffect(() => {
    if (!privyEthWallet) {
      console.log('⚠️ [XmtpContext] No Privy wallet available for XMTP initialization');
      return;
    }

    console.log('🔄 [XmtpContext] Initializing XMTP client with wallet:', {
      walletType: privyEthWallet.type,
      walletAddress: privyEthWallet.address
    });

    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        console.log('🔄 [XmtpContext] Getting XMTP client...');

        const newClient = await safeGetClient(privyEthWallet);
        console.log('✅ [XmtpContext] XMTP client result:', {
          clientExists: !!newClient,
          clientInboxId: newClient ? newClient.inboxId : null
        });

        if (!mounted) {
          console.log('⚠️ [XmtpContext] Component unmounted during client initialization');
          return;
        }

        if (newClient) {
          setClient(newClient);
          setIsConnected(true);
          console.log('✅ [XmtpContext] XMTP client connected successfully');

          // Sync with network before loading conversations
          console.log('🔄 [XmtpContext] Syncing conversations from network...');
          await safeSyncConversations(newClient);
          console.log('✅ [XmtpContext] Network sync completed');

          console.log('🔄 [XmtpContext] Loading conversations...');
          const convos = await safeListConversations(newClient);
          console.log('✅ [XmtpContext] Conversations loaded:', convos.length);

          const allowed: AnyConversation[] = [];
          const requests: AnyConversation[] = [];

          for (const c of convos) {
            try {
              // Debug: Log the actual conversation object structure
              console.log('🔍 [XmtpContext] Raw conversation object:', {
                conversation: c,
                allKeys: Object.keys(c as any),
                allProperties: Object.getOwnPropertyNames(c as any)
              });

              // Get the current consent state
              let state = 'unknown';
              if (typeof (c as any).consentState === 'function') {
                const consentResult = await (c as any).consentState();
                state = String(consentResult);
              } else {
                state = String((c as any).consentState ?? 'allowed');
              }

              // Extract peer address using working version logic
              const dm = c as unknown as { peerAddress?: string; topic?: string };
              const peerAddress: string = dm.peerAddress || "";
              const topic: string = dm.topic || "";
              const displayAddress = peerAddress || topic || "";

              console.log('📝 [XmtpContext] Conversation:', {
                id: (c as any).id,
                peerAddress: peerAddress || 'null',
                topic: topic || 'null',
                displayAddress: displayAddress || 'null',
                consentState: state
              });

              // AUTO-ALLOW ALL CONVERSATIONS FOR SEAMLESS MESSAGING
              if (state !== 'allowed') {
                console.log('🔄 [XmtpContext] Auto-allowing conversation for seamless messaging...');
                try {
                  // @ts-ignore
                  await c.updateConsentState?.('allowed');
                  console.log('✅ [XmtpContext] Conversation auto-allowed successfully');
                  state = 'allowed';
                } catch (consentError) {
                  console.warn('⚠️ [XmtpContext] Could not auto-allow conversation:', consentError);
                }
              }

              // Always add to allowed list since we auto-allow everything
              allowed.push(c);

            } catch (error) {
              console.error('❌ [XmtpContext] Error processing conversation:', error);
              // If there's an error, still add to allowed list
              allowed.push(c);
            }
          }

          console.log('📝 [XmtpContext] Initial conversations set:', {
            allowed: allowed.length,
            requests: requests.length
          });

          setConversations(allowed);
          setConversationRequests(requests);

          // Set up global auto-allow system for ALL incoming conversations
          console.log('🎧 [XmtpContext] Setting up global auto-allow system...');
          try {
            // Stream all conversations to auto-allow new ones
            const conversationStream = await (newClient as any).conversations.stream();
            console.log('✅ [XmtpContext] Global conversation stream established');

            (async () => {
              for await (const conversation of conversationStream) {
                if (!mounted) break;

                console.log('🆕 [XmtpContext] New conversation detected in stream:', {
                  id: (conversation as any).id,
                  peerAddress: (conversation as any).peerAddress
                });

                // Immediately allow the new conversation
                try {
                  console.log('🔄 [XmtpContext] Auto-allowing new conversation from stream...');
                  // @ts-ignore
                  await conversation.updateConsentState?.('allowed');
                  console.log('✅ [XmtpContext] New conversation auto-allowed from stream');
                } catch (consentError) {
                  console.warn('⚠️ [XmtpContext] Could not auto-allow new conversation from stream:', consentError);
                }

                // Refresh conversations to include the new one
                console.log('🔄 [XmtpContext] Refreshing conversations after new conversation...');
                setTimeout(async () => {
                  if (mounted) {
                    await refreshConversations();
                  }
                }, 500);
              }
            })().catch(error => {
              console.error('❌ [XmtpContext] Error in conversation stream:', error);
            });

          } catch (streamError) {
            console.warn('⚠️ [XmtpContext] Could not set up global conversation stream:', streamError);
          }

          // Set up periodic sync to ensure we don't miss messages
          console.log('⏰ [XmtpContext] Setting up periodic sync system...');
          const syncInterval = setInterval(async () => {
            if (!mounted) {
              clearInterval(syncInterval);
              return;
            }

            try {
              console.log('🔄 [XmtpContext] Running periodic sync...');
              await safeSyncConversations(newClient);
              await refreshConversations();
            } catch (error) {
              console.warn('⚠️ [XmtpContext] Error in periodic sync:', error);
            }
          }, 10000); // Sync every 10 seconds

          // Clean up interval when component unmounts
          return () => {
            clearInterval(syncInterval);
          };

          console.log('🚀 [XmtpContext] Comprehensive auto-allow system fully activated for seamless messaging!');

        } else {
          console.log('❌ [XmtpContext] Failed to get XMTP client');
        }
      } catch (err: any) {
        console.error('❌ [XmtpContext] Error during XMTP initialization:', err);
        if (mounted) setError(err as Error);
      } finally {
        if (mounted) {
          setLoading(false);
          console.log('🏁 [XmtpContext] XMTP initialization completed');
        }
      }
    })();

    return () => {
      console.log('🧹 [XmtpContext] Cleaning up XMTP initialization');
      mounted = false;
    };
  }, [privyEthWallet]);

  const refreshConversations = useCallback(async () => {
    if (!client) {
      console.log('⚠️ [XmtpContext] Cannot refresh conversations - no client');
      return;
    }

    console.log('🔄 [XmtpContext] Refreshing conversations...');
    try {
      // Sync with network first to get latest conversations
      await safeSyncConversations(client);

      const convos = await safeListConversations(client);
      console.log('✅ [XmtpContext] Retrieved conversations:', convos.length, 'total');

      const allowed: AnyConversation[] = [];
      const requests: AnyConversation[] = [];

      for (const c of convos) {
        try {
          // Get the current consent state
          let state = 'unknown';
          if (typeof (c as any).consentState === 'function') {
            const consentResult = await (c as any).consentState();
            state = String(consentResult);
          } else {
            state = String((c as any).consentState ?? 'allowed');
          }

          // Extract peer address using working version logic
          const dm = c as unknown as { peerAddress?: string; topic?: string };
          const peerAddress: string = dm.peerAddress || "";
          const topic: string = dm.topic || "";
          const displayAddress = peerAddress || topic || "";

          console.log('📝 [XmtpContext] Conversation:', {
            id: (c as any).id,
            peerAddress: peerAddress || 'null',
            topic: topic || 'null',
            displayAddress: displayAddress || 'null',
            consentState: state
          });

          // AUTO-ALLOW ALL CONVERSATIONS FOR SEAMLESS MESSAGING
          if (state !== 'allowed') {
            console.log('🔄 [XmtpContext] Auto-allowing conversation for seamless messaging...');
            try {
              // @ts-ignore
              await c.updateConsentState?.('allowed');
              console.log('✅ [XmtpContext] Conversation auto-allowed successfully');
              state = 'allowed';
            } catch (consentError) {
              console.warn('⚠️ [XmtpContext] Could not auto-allow conversation:', consentError);
            }
          }

          // Always add to allowed list since we auto-allow everything
          allowed.push(c);

        } catch (error) {
          console.error('❌ [XmtpContext] Error processing conversation:', error);
          // If there's an error, still add to allowed list
          allowed.push(c);
        }
      }

      console.log('✅ [XmtpContext] Conversations categorized (auto-allowed):', {
        allowed: allowed.length,
        requests: requests.length
      });

      setConversations(allowed);
      setConversationRequests(requests);
    } catch (error) {
      console.error('❌ [XmtpContext] Error refreshing conversations:', error);
    }
  }, [client]);

  const newConversation = useCallback(
    async (peer: string) => {
      if (!client) {
        console.log('⚠️ [XmtpContext] Cannot create conversation - no client');
        return null;
      }

      console.log('🆕 [XmtpContext] Creating new conversation with peer:', peer);
      try {
        const convo = await safeStartNewConversation(client, peer);
        console.log('✅ [XmtpContext] New conversation created:', {
          conversation: convo,
          conversationId: convo ? (convo as any).id : null,
          peerAddress: peer
        });

        if (convo) {
          // Immediately allow the conversation to enable real-time messaging
          try {
            console.log('🔄 [XmtpContext] Auto-allowing conversation for seamless messaging...');
            // @ts-ignore
            await convo.updateConsentState?.('allowed');
            console.log('✅ [XmtpContext] Conversation auto-allowed successfully');
          } catch (consentError) {
            console.warn('⚠️ [XmtpContext] Could not auto-allow conversation:', consentError);
          }

          console.log('🔄 [XmtpContext] Refreshing conversations after creation...');
          await refreshConversations();
          console.log('✅ [XmtpContext] Conversations refreshed after creation');
        }

        return convo;
      } catch (error) {
        console.error('❌ [XmtpContext] Error creating new conversation:', error);
        return null;
      }
    },
    [client, refreshConversations],
  );

  const sendMessage = useCallback(async (convo: AnyConversation, text: string) => {
    console.log('📤 [XmtpContext] sendMessage called with:', {
      conversation: convo,
      conversationId: (convo as any).id,
      peerAddress: (convo as any).peerAddress,
      text: text,
      textLength: text.length
    });

    try {
      console.log('🔄 [XmtpContext] Calling convo.send()...');
      // @ts-ignore
      const result = await convo.send(text);
      console.log('✅ [XmtpContext] Message sent successfully, result:', result);

      // Sync conversations to ensure message appears everywhere
      console.log('🔄 [XmtpContext] Syncing after send...');
      await safeSyncConversations(client);

      // Trigger a refresh of conversations to ensure the message appears
      console.log('🔄 [XmtpContext] Refreshing conversations after send...');
      await refreshConversations();
      console.log('✅ [XmtpContext] Conversations refreshed after send');

    } catch (err) {
      console.error('❌ [XmtpContext] XMTP send error:', err);
      console.error('❌ [XmtpContext] Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        conversationId: (convo as any).id,
        peerAddress: (convo as any).peerAddress
      });
      throw err; // Re-throw so the UI can handle it
    }
  }, [client, refreshConversations]);

  const allowConversation = useCallback(async (convo: AnyConversation) => {
    try {
      // @ts-ignore
      await convo.updateConsentState?.('allowed');
      await refreshConversations();
    } catch (err) {
      console.error('allowConversation error', err);
    }
  }, [refreshConversations]);

  const ctxValue: XmtpContextValue = useMemo(
    () => ({
      client,
      isConnected,
      conversations,
      conversationRequests,
      loading,
      error,
      refreshConversations,
      newConversation,
      sendText: sendMessage,
      allowConversation,
      canMessage: async (addr: string) => safeCanMessage(addr, client),
      getMessages: (c) => safeGetMessages(c),
    }),
    [client, isConnected, conversations, conversationRequests, loading, error, refreshConversations, newConversation, sendMessage, allowConversation],
  );

  return <XmtpContext.Provider value={ctxValue}>{children}</XmtpContext.Provider>;
};
