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
        // Cast conversation to match working version structure
        const dm = conversation as unknown as { peerAddress?: string; topic?: string };

        // First try direct peerAddress property (like working version)
        const peerAddress: string = dm.peerAddress || "";
        const topic: string = dm.topic || "";

        // Use peerAddress first, then fallback to topic (matching working version logic)
        const extractedAddress = peerAddress || topic;

        if (extractedAddress) {
            console.log('🔍 [getPeerAddress] Extracted from direct property:', extractedAddress);
            return extractedAddress;
        }

        // Try alternative conversation properties first
        if (conversation.peerAddress) {
            console.log('🔍 [getPeerAddress] Extracted from conversation.peerAddress:', conversation.peerAddress);
            return conversation.peerAddress;
        }

        if (conversation.topic) {
            console.log('🔍 [getPeerAddress] Extracted from conversation.topic:', conversation.topic);
            return conversation.topic;
        }

        // Try to get members and extract peer address (enhanced approach)
        if (conversation.members && typeof conversation.members === 'function') {
            try {
                const members = await conversation.members();
                if (Array.isArray(members) && members.length > 0) {
                    // Find the member that's not the current client
                    const client = conversation.client;
                    const currentInboxId = client?.inboxId;
                    const currentAddress = client?.address;

                    for (const member of members) {
                        // Skip if this is the current user
                        if (member.inboxId === currentInboxId) continue;
                        if (member.address === currentAddress) continue;

                        // Try various ways to get the peer address
                        const possibleAddresses = [
                            member.accountAddresses?.[0],
                            member.addresses?.[0],
                            member.address,
                            member.ethAddress,
                            member.walletAddress
                        ].filter(Boolean);

                        if (possibleAddresses.length > 0) {
                            const peerAddr = possibleAddresses[0];
                            console.log('🔍 [getPeerAddress] Extracted from member:', peerAddr);
                            return peerAddr;
                        }
                    }
                }
            } catch (membersError) {
                console.warn('🔍 [getPeerAddress] Error getting members:', membersError);
            }
        }

        // Try to extract from conversation metadata or other properties
        const metadataKeys = ['peer', 'peerAddress', 'recipientAddress', 'toAddress', 'with'];
        for (const key of metadataKeys) {
            if (conversation[key]) {
                console.log('🔍 [getPeerAddress] Extracted from metadata key', key, ':', conversation[key]);
                return conversation[key];
            }
        }

        console.warn('🔍 [getPeerAddress] Could not extract peer address from conversation:', conversation.id);
        return null;

    } catch (error) {
        console.error('🔍 [getPeerAddress] Error extracting peer address:', error);
        return null;
    }
}; 