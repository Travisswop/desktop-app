'use client';

import { ethers } from 'ethers';
import { createClient, loadXmtp } from './xmtp-browser';

// Use dynamic type imports to avoid server-side issues
type Client = any; // Will be properly typed at runtime
type AnyConversation = any; // Will be properly typed at runtime
type Identifier = any; // Will be properly typed at runtime
type XmtpSigner = any; // Will be properly typed at runtime

export type { AnyConversation };

// Dynamic function to get XMTP types and classes
const getXmtpModule = async () => {
    if (typeof window === 'undefined') return null;
    return await loadXmtp();
};

/**
 * Build an XMTP-compatible signer from a Privy embedded wallet
 */
export const buildXmtpSigner = async (privyEthWallet: any): Promise<XmtpSigner> => {
    const xmtp = await getXmtpModule();
    if (!xmtp) throw new Error('XMTP module not available');

    // Get EIP-1193 provider from Privy
    const eip1193 = await privyEthWallet.getEthereumProvider();
    // Wrap with ethers provider
    const provider = new ethers.BrowserProvider(eip1193 as any);
    const signer = await provider.getSigner();
    const address = (await signer.getAddress()).toLowerCase();

    // XMTP expects a custom signer interface
    const accountIdentifier: Identifier = {
        identifier: address,
        identifierKind: 'Ethereum',
    } as const;

    const xmtpSigner: XmtpSigner = {
        type: 'EOA',
        getIdentifier: () => accountIdentifier,
        signMessage: async (message: string): Promise<Uint8Array> => {
            const signature = await signer.signMessage(message);
            return ethers.getBytes(signature);
        },
    };

    // Add address property for easier access
    (xmtpSigner as any).address = address;

    return xmtpSigner;
};

/**
 * Create (or load) an XMTP client using a Privy embedded wallet.
 */
export const getClient = async (privyEthWallet: any): Promise<Client | null> => {
    if (typeof window === 'undefined') return null;

    try {
        console.log('🔄 [XMTP] Building XMTP signer from Privy wallet...');

        // Build the XMTP signer
        const xmtpSigner = await buildXmtpSigner(privyEthWallet);

        console.log('✅ [XMTP] XMTP signer built successfully:', {
            address: (xmtpSigner as any).address,
            type: xmtpSigner.type
        });

        // Use the enhanced createClient that handles localStorage and client lifecycle
        const client = await createClient(xmtpSigner);

        if (client) {
            console.log('✅ [XMTP] XMTP client ready:', {
                inboxId: client.inboxId,
                address: (xmtpSigner as any).address
            });
        }

        return client;
    } catch (e) {
        console.error('❌ [XMTP] Error creating XMTP client:', e);
        return null;
    }
};

/** Check if the target address can be messaged */
export const canMessage = async (
    address: string,
    client: Client | null,
): Promise<boolean> => {
    if (!address || !client || typeof window === 'undefined') return false;

    try {
        const result = await client.canMessage([
            {
                identifier: address.toLowerCase(),
                identifierKind: 'Ethereum',
            } as const,
        ]);
        return result.get(address.toLowerCase()) || false;
    } catch (e) {
        console.error('Error in canMessage:', e);
        return false;
    }
};

/**
 * Resolve an Ethereum address to an inbox ID
 * This is needed for v3 API conversation creation
 */
export const resolveInboxId = async (client: Client | null, ethAddress: string): Promise<string | null> => {
    if (!client || typeof window === 'undefined') return null;

    try {
        console.log('🔍 [resolveInboxId] Resolving Ethereum address to inbox ID:', ethAddress);

        // First, verify the address can receive messages
        const identifiers = [{
            identifier: ethAddress.toLowerCase(),
            identifierKind: 'Ethereum'
        }];

        const canMessageResult = await client.canMessage(identifiers);
        console.log('✅ [resolveInboxId] canMessage result:', canMessageResult);

        if (!canMessageResult.get(ethAddress.toLowerCase())) {
            console.log('❌ [resolveInboxId] Address cannot receive messages:', ethAddress);
            return null;
        }

        // Method 1: Check if client has methods to resolve address to inbox ID
        try {
            // Try different potential methods the client might have
            const potentialMethods = ['resolveInboxId', 'getInboxId', 'addressToInboxId'];

            for (const methodName of potentialMethods) {
                if (client[methodName] && typeof client[methodName] === 'function') {
                    try {
                        const result = await client[methodName](ethAddress);
                        if (result) {
                            console.log(`✅ [resolveInboxId] Found inbox ID using ${methodName}:`, result);
                            return result;
                        }
                    } catch (error) {
                        console.log(`⚠️ [resolveInboxId] Method ${methodName} failed:`, error);
                    }
                }
            }
        } catch (error) {
            console.log('⚠️ [resolveInboxId] Error trying direct methods:', error);
        }

        // Method 2: Try to find inbox ID from existing conversations
        try {
            const conversations = await client.conversations.list();

            for (const conv of conversations) {
                try {
                    if (conv.members && typeof conv.members === 'function') {
                        const members = await conv.members();
                        if (Array.isArray(members)) {
                            for (const member of members) {
                                const addresses = [
                                    ...(member.accountAddresses || []),
                                    ...(member.addresses || []),
                                    member.address
                                ].filter(Boolean);

                                if (addresses.some(addr => addr.toLowerCase() === ethAddress.toLowerCase())) {
                                    console.log('✅ [resolveInboxId] Found inbox ID in existing conversation:', member.inboxId);
                                    return member.inboxId;
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.warn('⚠️ [resolveInboxId] Error checking conversation member:', error);
                }
            }
        } catch (error) {
            console.warn('⚠️ [resolveInboxId] Error checking existing conversations:', error);
        }

        // Method 3: Create a minimal conversation to extract inbox ID
        // This approach creates a conversation using the old method to get the inbox ID
        try {
            console.log('🔄 [resolveInboxId] Creating conversation to extract inbox ID...');

            const xmtp = await getXmtpModule();
            if (!xmtp) {
                console.log('❌ [resolveInboxId] XMTP module not available');
                return null;
            }

            const identifier = {
                identifier: ethAddress.toLowerCase(),
                identifierKind: 'Ethereum'
            };

            // Create conversation using the identifier method
            const tempConvo = await client.conversations.newDmWithIdentifier(identifier);
            if (!tempConvo) {
                console.log('❌ [resolveInboxId] Could not create temporary conversation');
                return null;
            }

            console.log('✅ [resolveInboxId] Created conversation for inbox ID extraction:', tempConvo.id);

            // Try to get the peer inbox ID using the peerInboxId method
            if (tempConvo.peerInboxId && typeof tempConvo.peerInboxId === 'function') {
                try {
                    const peerInboxId = await tempConvo.peerInboxId();
                    if (peerInboxId) {
                        console.log('✅ [resolveInboxId] Got peer inbox ID from conversation:', peerInboxId);
                        return peerInboxId;
                    }
                } catch (error) {
                    console.warn('⚠️ [resolveInboxId] Could not get peer inbox ID:', error);
                }
            }

            // Fallback: try to extract from members
            if (tempConvo.members && typeof tempConvo.members === 'function') {
                const members = await tempConvo.members();
                if (Array.isArray(members)) {
                    // Get current client inbox ID to identify the peer
                    const currentInboxId = client.inboxId;

                    for (const member of members) {
                        // Skip the current user
                        if (currentInboxId && member.inboxId === currentInboxId) {
                            continue;
                        }

                        const addresses = [
                            ...(member.accountAddresses || []),
                            ...(member.addresses || []),
                            member.address
                        ].filter(Boolean);

                        if (addresses.some(addr => addr.toLowerCase() === ethAddress.toLowerCase())) {
                            console.log('✅ [resolveInboxId] Extracted inbox ID from conversation members:', member.inboxId);
                            return member.inboxId;
                        }

                        // If we can't match by address but have only 2 members, this is likely the peer
                        if (members.length === 2 && member.inboxId) {
                            console.log('✅ [resolveInboxId] Assuming peer inbox ID in 2-member conversation:', member.inboxId);
                            return member.inboxId;
                        }
                    }
                }
            }

            console.log('⚠️ [resolveInboxId] Could not extract inbox ID from conversation');
        } catch (error) {
            console.warn('⚠️ [resolveInboxId] Temporary conversation approach failed:', error);
        }

        console.log('❌ [resolveInboxId] Could not resolve inbox ID for address:', ethAddress);
        return null;
    } catch (error) {
        console.error('❌ [resolveInboxId] Error resolving inbox ID:', error);
        return null;
    }
};

/** Start (or fetch) a direct DM using v3 API */
export const startNewConversation = async (
    client: Client | null,
    peerAddress: string,
): Promise<AnyConversation | null> => {
    if (!client || typeof window === 'undefined') return null;

    try {
        console.log('🚀 [startNewConversation] Starting conversation with:', peerAddress);

        // First, resolve the Ethereum address to inbox ID
        const peerInboxId = await resolveInboxId(client, peerAddress);
        if (!peerInboxId) {
            console.log('❌ [startNewConversation] Could not resolve inbox ID for address:', peerAddress);
            return null;
        }

        console.log('✅ [startNewConversation] Resolved inbox ID:', peerInboxId);

        // Check if a DM already exists with this inbox ID
        // This is important because resolveInboxId might have created a conversation
        try {
            const existingDm = await client.conversations.getDmByInboxId(peerInboxId);
            if (existingDm) {
                console.log('✅ [startNewConversation] Found existing DM (possibly from resolution):', existingDm.id);

                // Ensure the conversation is allowed
                try {
                    await existingDm.updateConsentState?.('allowed');
                } catch (_) { }

                return existingDm as AnyConversation;
            }
        } catch (error) {
            console.log('🔍 [startNewConversation] No existing DM found, will create new one');
        }

        // Create new DM using inbox ID (v3 API)
        try {
            const convo = await client.conversations.newDm(peerInboxId);
            console.log('✅ [startNewConversation] Created new DM using v3 API:', convo.id);

            // Immediately allow the conversation
            try {
                await convo.updateConsentState?.('allowed');
            } catch (_) { }

            return convo as AnyConversation;
        } catch (newDmError) {
            console.warn('⚠️ [startNewConversation] v3 newDm failed, trying fallback:', newDmError);

            // Fallback: if newDm fails, try to find any existing conversation with this peer
            // This might happen if the conversation was created during resolution
            const conversations = await client.conversations.list();
            for (const conv of conversations) {
                try {
                    if (conv.peerInboxId && typeof conv.peerInboxId === 'function') {
                        const convPeerInboxId = await conv.peerInboxId();
                        if (convPeerInboxId === peerInboxId) {
                            console.log('✅ [startNewConversation] Found conversation via fallback search:', conv.id);

                            // Ensure the conversation is allowed
                            try {
                                await conv.updateConsentState?.('allowed');
                            } catch (_) { }

                            return conv as AnyConversation;
                        }
                    }
                } catch (error) {
                    console.warn('⚠️ [startNewConversation] Error checking conversation in fallback:', error);
                }
            }

            console.error('❌ [startNewConversation] All methods failed to create/find conversation');
            return null;
        }
    } catch (e) {
        console.error('❌ [startNewConversation] Error starting conversation:', e);
        return null;
    }
};

/**
 * Find existing DM by Ethereum address
 * This uses the v3 API method getDmByInboxId
 */
export const findExistingDm = async (client: Client | null, ethAddress: string): Promise<AnyConversation | null> => {
    if (!client || typeof window === 'undefined') return null;

    try {
        console.log('🔍 [findExistingDm] Looking for existing DM with address:', ethAddress);

        // Method 1: Try to find inbox ID from existing conversations first (faster)
        const conversations = await client.conversations.list();

        for (const conv of conversations) {
            try {
                if (conv.members && typeof conv.members === 'function') {
                    const members = await conv.members();
                    if (Array.isArray(members)) {
                        for (const member of members) {
                            const addresses = [
                                ...(member.accountAddresses || []),
                                ...(member.addresses || []),
                                member.address
                            ].filter(Boolean);

                            if (addresses.some(addr => addr.toLowerCase() === ethAddress.toLowerCase())) {
                                console.log('✅ [findExistingDm] Found existing DM in conversation list:', conv.id);
                                return conv as AnyConversation;
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn('⚠️ [findExistingDm] Error checking conversation member:', error);
            }
        }

        // Method 2: If not found in existing conversations, try to resolve inbox ID
        const peerInboxId = await resolveInboxId(client, ethAddress);
        if (!peerInboxId) {
            console.log('❌ [findExistingDm] Could not resolve inbox ID for address:', ethAddress);
            return null;
        }

        console.log('✅ [findExistingDm] Resolved inbox ID:', peerInboxId);

        // Method 3: Use the v3 API method to get DM by inbox ID
        try {
            const existingDm = await client.conversations.getDmByInboxId(peerInboxId);
            if (existingDm) {
                console.log('✅ [findExistingDm] Found existing DM via getDmByInboxId:', existingDm.id);
                return existingDm as AnyConversation;
            }
        } catch (error) {
            console.log('🔍 [findExistingDm] getDmByInboxId failed or no DM found:', error);
        }

        // Method 4: Fallback - check if resolveInboxId created a conversation
        // Re-list conversations to catch any that might have been created during resolution
        const updatedConversations = await client.conversations.list();

        for (const conv of updatedConversations) {
            try {
                if (conv.peerInboxId && typeof conv.peerInboxId === 'function') {
                    const convPeerInboxId = await conv.peerInboxId();
                    if (convPeerInboxId === peerInboxId) {
                        console.log('✅ [findExistingDm] Found DM created during resolution:', conv.id);
                        return conv as AnyConversation;
                    }
                }
            } catch (error) {
                console.warn('⚠️ [findExistingDm] Error checking peerInboxId:', error);
            }
        }

        console.log('🔍 [findExistingDm] No existing DM found for address:', ethAddress);
        return null;
    } catch (error) {
        console.error('❌ [findExistingDm] Error finding existing DM:', error);
        return null;
    }
};

export const listConversations = async (client: Client | null): Promise<AnyConversation[]> => {
    if (!client || typeof window === 'undefined') return [];

    try {
        const convos = await client.conversations.list();
        return convos as AnyConversation[];
    } catch (e) {
        console.error('Error listing conversations:', e);
        return [];
    }
};

export const getMessages = async (convo: AnyConversation | null): Promise<any[]> => {
    if (!convo || typeof window === 'undefined') return [];

    try {
        return await convo.messages();
    } catch (e) {
        console.error('Error fetching messages:', e);
        return [];
    }
};

export const syncConversations = async (client: Client | null): Promise<void> => {
    if (!client || typeof window === 'undefined') return;

    try {
        console.debug('[XMTP] Syncing conversations from network...');
        await client.conversations.sync();
        console.debug('[XMTP] Sync complete');
    } catch (e) {
        console.error('Error syncing conversations:', e);
    }
};

/**
 * Extract peer address from conversation object
 * This helps handle different XMTP SDK versions
 * Based on the working xmtp-app implementation
 */
export const getPeerAddress = async (conversation: any): Promise<string | null> => {
    if (!conversation || typeof window === 'undefined') return null;

    try {
        // The new XMTP SDK uses inboxId and has a peerInboxId() method for DMs
        // This is the primary way to get the peer's identifier in the new SDK
        if (conversation.peerInboxId && typeof conversation.peerInboxId === 'function') {
            try {
                const peerInboxId = await conversation.peerInboxId();
                console.log('🔍 [getPeerAddress] Successfully got peer inbox ID:', peerInboxId);

                // Return the inboxId as the "address" - the system will need to work with inbox IDs
                return peerInboxId;
            } catch (peerInboxError) {
                console.error('🔍 [getPeerAddress] Error calling peerInboxId():', peerInboxError);
            }
        }

        // If peerInboxId method doesn't work, try to get members and find the peer
        if (conversation.members && typeof conversation.members === 'function') {
            try {
                const members = await conversation.members();
                console.log('🔍 [getPeerAddress] Members found:', members?.length);

                if (Array.isArray(members) && members.length > 0) {
                    // Try to get the current client's inbox ID from different sources
                    const client = conversation.client;
                    let currentInboxId = null;

                    // Try different ways to get the current inbox ID
                    if (client) {
                        currentInboxId = client.inboxId || client.inbox?.id || client.accountInboxId;
                        console.log('🔍 [getPeerAddress] Found current inboxId from client:', currentInboxId);
                    }

                    // If we still don't have the current inbox ID, try to get it globally
                    if (!currentInboxId && typeof window !== 'undefined') {
                        // Try to get it from the global XMTP client if available
                        const globalClient = (window as any).xmtpClient;
                        if (globalClient) {
                            currentInboxId = globalClient.inboxId || globalClient.inbox?.id;
                            console.log('🔍 [getPeerAddress] Found current inboxId from global client:', currentInboxId);
                        }
                    }

                    console.log('🔍 [getPeerAddress] Current user inboxId:', currentInboxId);
                    console.log('🔍 [getPeerAddress] Available member inbox IDs:', members.map(m => m.inboxId));

                    // Find the peer (member that's not the current user)
                    for (const member of members) {
                        if (currentInboxId && member.inboxId === currentInboxId) {
                            console.log('🔍 [getPeerAddress] Skipping current user:', member.inboxId);
                            continue;
                        }

                        // Return the peer's inbox ID
                        if (member.inboxId) {
                            console.log('🔍 [getPeerAddress] Found peer inboxId:', member.inboxId);
                            return member.inboxId;
                        }
                    }

                    // If we couldn't identify the current user, but we have exactly 2 members,
                    // return the first one (this is a fallback for DM conversations)
                    if (!currentInboxId && members.length === 2) {
                        console.log('🔍 [getPeerAddress] Could not identify current user, assuming DM and returning first member:', members[0].inboxId);
                        return members[0].inboxId;
                    }

                    // If we have members but couldn't identify the peer, return the first member
                    if (members.length > 0) {
                        console.log('🔍 [getPeerAddress] Fallback: returning first member inboxId:', members[0].inboxId);
                        return members[0].inboxId;
                    }
                }
            } catch (membersError) {
                console.error('🔍 [getPeerAddress] Error getting members:', membersError);
            }
        }

        // Try legacy approaches for backwards compatibility with older SDK versions
        const dm = conversation as unknown as { peerAddress?: string; topic?: string };
        const peerAddress: string = dm.peerAddress || "";
        const topic: string = dm.topic || "";

        if (peerAddress) {
            console.log('🔍 [getPeerAddress] Found legacy peerAddress:', peerAddress);
            return peerAddress;
        }

        if (topic) {
            console.log('🔍 [getPeerAddress] Found legacy topic:', topic);
            return topic;
        }

        // Try other conversation properties
        if (conversation.peerAddress) {
            console.log('🔍 [getPeerAddress] Found conversation.peerAddress:', conversation.peerAddress);
            return conversation.peerAddress;
        }

        console.warn('🔍 [getPeerAddress] Could not extract peer identifier from conversation:', conversation.id);
        return null;

    } catch (error) {
        console.error('🔍 [getPeerAddress] Error extracting peer identifier:', error);
        return null;
    }
}; 