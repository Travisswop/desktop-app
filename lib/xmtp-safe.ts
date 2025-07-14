'use client';

import type { Client } from '@xmtp/browser-sdk';
import {
    getClient,
    canMessage,
    startNewConversation,
    listConversations,
    getMessages,
    syncConversations,
    getPeerAddress,
    resolveInboxId,
    findExistingDm
} from './xmtp';

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

/**
 * Safe wrapper for resolving Ethereum address to inbox ID
 */
export const safeResolveInboxId = async (client: any, ethAddress: string): Promise<string | null> => {
    try {
        if (!client || typeof window === 'undefined') {
            console.log('⚠️ [safeResolveInboxId] No client or running server-side');
            return null;
        }

        const inboxId = await resolveInboxId(client, ethAddress);
        console.log('✅ [safeResolveInboxId] Resolved inbox ID:', inboxId);
        return inboxId;
    } catch (error) {
        console.error('❌ [safeResolveInboxId] Error resolving inbox ID:', error);
        return null;
    }
};

/**
 * Safe wrapper for finding existing DM by Ethereum address
 */
export const safeFindExistingDm = async (client: any, ethAddress: string): Promise<AnyConversation | null> => {
    try {
        if (!client || typeof window === 'undefined') {
            console.log('⚠️ [safeFindExistingDm] No client or running server-side');
            return null;
        }

        const existingDm = await findExistingDm(client, ethAddress);
        console.log('✅ [safeFindExistingDm] Found existing DM:', existingDm ? (existingDm as any).id : 'none');
        return existingDm;
    } catch (error) {
        console.error('❌ [safeFindExistingDm] Error finding existing DM:', error);
        return null;
    }
}; 