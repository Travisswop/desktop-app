'use client';

import type { Client } from '@xmtp/browser-sdk';

// Server-safe XMTP wrapper that prevents SSR issues

export type AnyConversation = any; // We'll define this loosely to avoid import issues

interface XmtpFunctions {
    getClient: (wallet: any) => Promise<Client | null>;
    listConversations: (client: Client | null) => Promise<AnyConversation[]>;
    startNewConversation: (client: Client | null, address: string) => Promise<AnyConversation | null>;
    canMessage: (address: string, client: Client | null) => Promise<boolean>;
    getMessages: (conversation: AnyConversation | null) => Promise<any[]>;
    syncConversations: (client: Client | null) => Promise<void>;
    getPeerAddress: (conversation: AnyConversation | null) => Promise<string | null>;
}

// Only import XMTP types and functions if we're on the client
const getXmtpFunctions = async (): Promise<XmtpFunctions> => {
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
export const safeGetClient = async (wallet: any): Promise<Client | null> => {
    const { getClient } = await getXmtpFunctions();
    return getClient(wallet);
};

export const safeListConversations = async (client: Client | null): Promise<AnyConversation[]> => {
    const { listConversations } = await getXmtpFunctions();
    return listConversations(client);
};

export const safeStartNewConversation = async (client: Client | null, address: string): Promise<AnyConversation | null> => {
    const { startNewConversation } = await getXmtpFunctions();
    return startNewConversation(client, address);
};

export const safeCanMessage = async (address: string, client: Client | null): Promise<boolean> => {
    const { canMessage } = await getXmtpFunctions();
    return canMessage(address, client);
};

export const safeGetMessages = async (conversation: AnyConversation | null): Promise<any[]> => {
    const { getMessages } = await getXmtpFunctions();
    return getMessages(conversation);
};

export const safeSyncConversations = async (client: Client | null): Promise<void> => {
    const { syncConversations } = await getXmtpFunctions();
    return syncConversations(client);
};

export const safeGetPeerAddress = async (conversation: AnyConversation | null): Promise<string | null> => {
    const { getPeerAddress } = await getXmtpFunctions();
    return getPeerAddress(conversation);
}; 