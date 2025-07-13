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

/** Start (or fetch) a direct DM */
export const startNewConversation = async (
    client: Client | null,
    peerAddress: string,
): Promise<AnyConversation | null> => {
    if (!client || typeof window === 'undefined') return null;

    try {
        const xmtp = await getXmtpModule();
        if (!xmtp) return null;

        const identifier: Identifier = {
            identifier: peerAddress.toLowerCase(),
            identifierKind: 'Ethereum',
        } as const;

        const convo = await client.conversations.newDmWithIdentifier(identifier);

        // Immediately allow the conversation if it's pending
        try {
            // Use string instead of ConsentState enum to avoid import issues
            await convo.updateConsentState?.('allowed');
        } catch (_) { }

        return convo as AnyConversation;
    } catch (e) {
        console.error('Error starting conversation:', e);
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
        // Log the conversation structure for debugging
        console.log('🔍 [getPeerAddress] Debugging conversation structure:', {
            id: conversation.id,
            keys: Object.keys(conversation),
            hasMembers: typeof conversation.members === 'function',
            conversationType: conversation.conversationType || 'unknown'
        });

        // For the new XMTP SDK, we need to get members and find the peer
        if (conversation.members && typeof conversation.members === 'function') {
            try {
                const members = await conversation.members();
                console.log('🔍 [getPeerAddress] Members structure:', {
                    memberCount: members?.length,
                    members: members?.map((m: any) => ({
                        inboxId: m.inboxId,
                        accountAddresses: m.accountAddresses,
                        addresses: m.addresses,
                        address: m.address,
                        allKeys: Object.keys(m)
                    }))
                });

                if (Array.isArray(members) && members.length > 0) {
                    // Get the current client to identify which member is the peer
                    const client = conversation.client;
                    const currentInboxId = client?.inboxId;

                    console.log('🔍 [getPeerAddress] Current client inboxId:', currentInboxId);

                    for (const member of members) {
                        // Skip if this is the current user
                        if (member.inboxId === currentInboxId) {
                            console.log('🔍 [getPeerAddress] Skipping current user:', member.inboxId);
                            continue;
                        }

                        console.log('🔍 [getPeerAddress] Checking peer member:', {
                            inboxId: member.inboxId,
                            accountAddresses: member.accountAddresses,
                            addresses: member.addresses,
                            address: member.address
                        });

                        // Try various ways to get the peer address from the new SDK structure
                        const possibleAddresses = [
                            // New SDK structure
                            member.accountAddresses?.[0],
                            member.addresses?.[0],
                            member.address,
                            // Legacy properties just in case
                            member.ethAddress,
                            member.walletAddress,
                            member.ethereumAddress
                        ].filter(Boolean);

                        if (possibleAddresses.length > 0) {
                            const peerAddr = possibleAddresses[0];
                            console.log('🔍 [getPeerAddress] Successfully extracted peer address:', peerAddr);
                            return peerAddr;
                        }

                        // If no direct address, log what we have
                        console.log('🔍 [getPeerAddress] No direct address found for member:', {
                            inboxId: member.inboxId,
                            allProperties: Object.keys(member),
                            memberData: member
                        });
                    }
                }
            } catch (membersError) {
                console.error('🔍 [getPeerAddress] Error getting members:', membersError);
            }
        }

        // Try legacy approaches for backwards compatibility
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

        // Try alternative conversation properties
        if (conversation.peerAddress) {
            console.log('🔍 [getPeerAddress] Found conversation.peerAddress:', conversation.peerAddress);
            return conversation.peerAddress;
        }

        if (conversation.topic) {
            console.log('🔍 [getPeerAddress] Found conversation.topic:', conversation.topic);
            return conversation.topic;
        }

        // Try to extract from conversation metadata or other properties
        const metadataKeys = ['peer', 'recipientAddress', 'toAddress', 'with', 'peerInboxId'];
        for (const key of metadataKeys) {
            if (conversation[key]) {
                console.log('🔍 [getPeerAddress] Found metadata key', key, ':', conversation[key]);
                return conversation[key];
            }
        }

        console.warn('🔍 [getPeerAddress] Could not extract peer address from conversation:', conversation.id);
        console.warn('🔍 [getPeerAddress] Full conversation object:', conversation);
        return null;

    } catch (error) {
        console.error('🔍 [getPeerAddress] Error extracting peer address:', error);
        return null;
    }
}; 