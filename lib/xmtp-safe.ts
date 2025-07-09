'use client';

// Server-safe XMTP wrapper that prevents SSR issues

export type AnyConversation = any; // We'll define this loosely to avoid import issues

// Only import XMTP types and functions if we're on the client
const getXmtpFunctions = async () => {
    if (typeof window === 'undefined') {
        // Return mock functions for server-side rendering
        return {
            getClient: async () => null,
            listConversations: async () => [],
            startNewConversation: async () => null,
            canMessage: async () => false,
            getMessages: async () => [],
            syncConversations: async () => { },
            getPeerAddress: async () => null,
        };
    }

    // Dynamically import the actual XMTP functions only on the client
    const xmtpModule = await import('./xmtp');
    return {
        getClient: xmtpModule.getClient,
        listConversations: xmtpModule.listConversations,
        startNewConversation: xmtpModule.startNewConversation,
        canMessage: xmtpModule.canMessage,
        getMessages: xmtpModule.getMessages,
        syncConversations: xmtpModule.syncConversations,
        getPeerAddress: xmtpModule.getPeerAddress,
    };
};

// Export safe wrapper functions
export const safeGetClient = async (wallet: any) => {
    const { getClient } = await getXmtpFunctions();
    return getClient(wallet);
};

export const safeListConversations = async (client: any) => {
    const { listConversations } = await getXmtpFunctions();
    return listConversations(client);
};

export const safeStartNewConversation = async (client: any, address: string) => {
    const { startNewConversation } = await getXmtpFunctions();
    return startNewConversation(client, address);
};

export const safeCanMessage = async (address: string, client: any) => {
    const { canMessage } = await getXmtpFunctions();
    return canMessage(address, client);
};

export const safeGetMessages = async (conversation: any) => {
    const { getMessages } = await getXmtpFunctions();
    return getMessages(conversation);
};

export const safeSyncConversations = async (client: any) => {
    const { syncConversations } = await getXmtpFunctions();
    return syncConversations(client);
};

export const safeGetPeerAddress = async (conversation: any) => {
    const { getPeerAddress } = await getXmtpFunctions();
    return getPeerAddress(conversation);
}; 