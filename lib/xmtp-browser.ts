'use client';

// This file provides a browser-only interface to XMTP
// to prevent server-side rendering issues

import type { Client, Signer } from '@xmtp/browser-sdk';

let xmtpModule: typeof import('@xmtp/browser-sdk') | null = null;

// Client storage keys
const XMTP_CLIENT_DATA_KEY = 'xmtp_client_data';
const XMTP_INSTALLATION_KEY = 'xmtp_installation_id';

// Type definitions
interface ClientData {
    walletAddress: string;
    inboxId: string;
    installationId: string;
    timestamp: number;
}

interface CreateClientOptions {
    env?: 'local' | 'dev' | 'production';
    structuredLogging?: boolean;
    loggingLevel?: 'off' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
}

interface InstallationInfo {
    id: string;
    createdAt?: Date;
    lastActivity?: Date;
}

// Function to dynamically load the XMTP module
export async function loadXmtp(): Promise<typeof import('@xmtp/browser-sdk') | null> {
    if (typeof window === 'undefined') {
        return null;
    }

    if (!xmtpModule) {
        try {
            // Dynamically import the XMTP browser SDK
            xmtpModule = await import('@xmtp/browser-sdk');

            // Try to load WASM bindings, but don't fail if setWasmPath doesn't exist
            try {
                const wasmBindings = await import('@xmtp/wasm-bindings');
                // Use type assertion for optional WASM configuration
                const wasmBindingsAny = wasmBindings as any;
                if (wasmBindingsAny.setWasmPath && typeof wasmBindingsAny.setWasmPath === 'function') {
                    wasmBindingsAny.setWasmPath('/_next/static/media/');
                }
            } catch (wasmError) {
                console.warn('WASM bindings configuration skipped:', wasmError);
            }

            return xmtpModule;
        } catch (error) {
            console.error('Failed to load XMTP:', error);
            return null;
        }
    }

    return xmtpModule;
}

// Store client data in localStorage
function storeClientData(walletAddress: string, inboxId: string, installationId: string): void {
    if (typeof window === 'undefined') return;

    try {
        const clientData: ClientData = {
            walletAddress: walletAddress.toLowerCase(),
            inboxId,
            installationId,
            timestamp: Date.now()
        };
        localStorage.setItem(XMTP_CLIENT_DATA_KEY, JSON.stringify(clientData));
        console.log('✅ [XMTP] Client data stored in localStorage:', clientData);
    } catch (error) {
        console.warn('⚠️ [XMTP] Failed to store client data:', error);
    }
}

// Retrieve client data from localStorage
function getStoredClientData(walletAddress: string): ClientData | null {
    if (typeof window === 'undefined') return null;

    try {
        const stored = localStorage.getItem(XMTP_CLIENT_DATA_KEY);
        if (!stored) return null;

        const clientData: ClientData = JSON.parse(stored);

        // Check if the stored data is for the same wallet
        if (clientData.walletAddress !== walletAddress.toLowerCase()) {
            console.log('🔄 [XMTP] Stored client data is for different wallet, clearing...');
            localStorage.removeItem(XMTP_CLIENT_DATA_KEY);
            return null;
        }

        // Check if data is not too old (7 days)
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - clientData.timestamp > sevenDaysMs) {
            console.log('🔄 [XMTP] Stored client data is too old, clearing...');
            localStorage.removeItem(XMTP_CLIENT_DATA_KEY);
            return null;
        }

        return clientData;
    } catch (error) {
        console.warn('⚠️ [XMTP] Failed to retrieve client data:', error);
        return null;
    }
}

// Clear stored client data
function clearStoredClientData(): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.removeItem(XMTP_CLIENT_DATA_KEY);
        localStorage.removeItem(XMTP_INSTALLATION_KEY);
        console.log('🧹 [XMTP] Cleared stored client data');
    } catch (error) {
        console.warn('⚠️ [XMTP] Failed to clear client data:', error);
    }
}

// Try to build an existing client
async function tryBuildExistingClient(
    xmtp: typeof import('@xmtp/browser-sdk'),
    walletAddress: string
): Promise<Client | null> {
    const storedData = getStoredClientData(walletAddress);
    if (!storedData || !storedData.inboxId) {
        console.log('📭 [XMTP] No stored client data found for wallet:', walletAddress);
        return null;
    }

    try {
        console.log('🔄 [XMTP] Attempting to build existing client with inbox ID:', storedData.inboxId);

        const identifier = {
            identifier: walletAddress.toLowerCase(),
            identifierKind: 'Ethereum' as const
        };

        const client = await xmtp.Client.build(identifier, {
            env: 'dev',
            structuredLogging: true,
            loggingLevel: 'info'
        } as CreateClientOptions);

        console.log('✅ [XMTP] Successfully built existing client:', {
            inboxId: client.inboxId,
            walletAddress: walletAddress
        });

        return client;
    } catch (error) {
        console.warn('⚠️ [XMTP] Failed to build existing client:', error);

        // Check for database corruption
        if (isDatabaseCorruptionError(error)) {
            console.error('🚨 [XMTP] Database corruption detected while building existing client');
            clearStoredClientData();
            throw createDatabaseCorruptionError();
        }

        // Clear invalid stored data for other errors
        clearStoredClientData();
        return null;
    }
}

// Revoke installations using static revocation (for users who can't log in)
async function revokeInstallationsStatic(
    xmtp: typeof import('@xmtp/browser-sdk'),
    wallet: Signer,
    walletAddress: string,
    errorMessage?: string
): Promise<void> {
    try {
        console.log('🔄 [XMTP] Starting static installation revocation for wallet:', walletAddress);

        let inboxId: string | null = null;

        // First, try to extract inbox ID from error message if provided
        if (errorMessage && errorMessage.includes('InboxID')) {
            const inboxIdMatch = errorMessage.match(/InboxID\s+([a-f0-9]+)/i);
            if (inboxIdMatch && inboxIdMatch[1]) {
                inboxId = inboxIdMatch[1];
                console.log('✅ [XMTP] Extracted inbox ID from error:', inboxId);
            }
        }

        // If no inbox ID from error, try other methods
        if (!inboxId) {
            try {
                // Try to get inbox ID through canMessage (this doesn't create a client)
                const identifier = {
                    identifier: walletAddress.toLowerCase(),
                    identifierKind: 'Ethereum' as const
                };

                console.log('🔍 [XMTP] Attempting to find inbox ID through network lookup...');

                // This approach uses static methods that don't require a client
                // Check if there's a way to get inbox state without building client
                const canMessageResult = await xmtp.Client.canMessage([identifier]);
                const addressInfo = canMessageResult.get(walletAddress.toLowerCase());

                if (addressInfo) {
                    console.log('✅ [XMTP] Found existing identity on network');
                    // Unfortunately, canMessage doesn't give us the inbox ID directly
                    // We need to use a different approach
                }
            } catch (lookupError) {
                console.warn('⚠️ [XMTP] Network lookup failed:', lookupError);
            }
        }

        // If we have an inbox ID, proceed with static revocation
        if (inboxId) {
            try {
                console.log('🔄 [XMTP] Attempting static revocation for inbox ID:', inboxId);

                // Use the proper static revocation API from XMTP docs
                const inboxStates = await (xmtp.Client as any).inboxStateFromInboxIds([inboxId], 'dev');

                if (inboxStates && inboxStates.length > 0 && inboxStates[0].installations) {
                    const installations = inboxStates[0].installations;
                    console.log('📋 [XMTP] Found installations to potentially revoke:', installations.length);

                    if (installations.length >= 5) {
                        // Map installations to bytes for revocation (revoke all but keep 2)
                        const toRevokeInstallationBytes = installations
                            .slice(0, installations.length - 2) // Keep 2, revoke the rest
                            .map((installation: any) => installation.bytes);

                        console.log('🔄 [XMTP] Revoking', toRevokeInstallationBytes.length, 'installations via static method...');

                        // Perform static revocation using the exact API from docs
                        await (xmtp.Client as any).revokeInstallations(
                            wallet,
                            inboxId,
                            toRevokeInstallationBytes,
                            'dev' // environment
                        );

                        console.log('✅ [XMTP] Static revocation completed successfully');

                        // Wait longer for network propagation
                        console.log('⏳ [XMTP] Waiting for revocation to propagate on network...');
                        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds

                        return;
                    } else {
                        console.log('ℹ️ [XMTP] Installation count is already acceptable:', installations.length);
                        return;
                    }
                } else {
                    console.warn('⚠️ [XMTP] No installations found in inbox state or invalid response');
                }
            } catch (staticError: any) {
                console.error('❌ [XMTP] Static revocation failed:', staticError);

                // Check if it's a database/WASM error
                if (isDatabaseCorruptionError(staticError)) {
                    console.error('🚨 [XMTP] Database corruption detected during static revocation');
                    throw createDatabaseCorruptionError();
                }
                throw staticError;
            }
        }

        // If we reach here, we couldn't get the inbox ID or revocation failed
        console.error('❌ [XMTP] Could not perform static revocation - inbox ID not found');
        throw new Error(
            'Unable to automatically resolve installation limit. Please:\n' +
            '1. Clear your browser data completely (Settings > Privacy > Clear browsing data)\n' +
            '2. Select "All time" and include cookies, storage, and cache\n' +
            '3. Restart your browser and try connecting again\n' +
            '4. If the issue persists, contact support with your wallet address'
        );

    } catch (error: any) {
        console.error('❌ [XMTP] Error during static installation revocation:', error);

        // Always clear local storage as final fallback
        clearStoredClientData();
        throw error;
    }
}

// Helper function to detect and handle database corruption
function isDatabaseCorruptionError(error: any): boolean {
    if (!error || !error.message) return false;

    const errorMessage = error.message.toLowerCase();
    return errorMessage.includes('createsyncaccesshandle') ||
        errorMessage.includes('nomodificationallowederror') ||
        errorMessage.includes('wasm') ||
        errorMessage.includes('database') ||
        errorMessage.includes('access handle') ||
        errorMessage.includes('file system');
}

function createDatabaseCorruptionError(): Error {
    return new Error(
        '🚨 XMTP Database Corruption Detected\n\n' +
        'Your browser\'s XMTP database is corrupted and must be cleared.\n\n' +
        'SOLUTION:\n' +
        '1. Open your browser settings\n' +
        '2. Go to Privacy/Clear browsing data\n' +
        '3. Select "All time" as the time range\n' +
        '4. Check ALL boxes (cookies, storage, cache, etc.)\n' +
        '5. Click "Clear data"\n' +
        '6. Restart your browser completely\n' +
        '7. Reconnect your wallet\n\n' +
        'This will reset your XMTP client and resolve installation limits.'
    );
}

// Helper function to extract wallet address from signer
async function extractWalletAddress(wallet: Signer): Promise<string | null> {
    try {
        if (wallet.getIdentifier) {
            const identifier = await wallet.getIdentifier();
            return identifier.identifier;
        }

        // Fallback for other signer types
        const walletAny = wallet as any;
        return walletAny.identifier?.identifier || walletAny.address || null;
    } catch (error) {
        console.warn('⚠️ [XMTP] Error extracting wallet address:', error);
        return null;
    }
}

// Create a client using a wallet with proper lifecycle management
export async function createClient(wallet: Signer): Promise<Client | null> {
    const xmtp = await loadXmtp();
    if (!xmtp) return null;

    try {
        // Extract wallet address with proper async handling
        const walletAddress = await extractWalletAddress(wallet);

        if (!walletAddress) {
            console.error('❌ [XMTP] Could not extract wallet address');
            return null;
        }

        console.log('🔄 [XMTP] Creating/building client for wallet:', walletAddress);

        // First, try to build an existing client
        const existingClient = await tryBuildExistingClient(xmtp, walletAddress);
        if (existingClient) {
            return existingClient;
        }

        // If building failed, create a new client
        console.log('🆕 [XMTP] Creating new XMTP client...');

        try {
            const client = await xmtp.Client.create(wallet, {
                env: 'dev',
                structuredLogging: true,
                loggingLevel: 'info'
            } as CreateClientOptions);

            // Ensure we have required properties before storing
            const inboxId = client.inboxId;
            const installationId = (client as any).installationId;

            if (!inboxId) {
                console.warn('⚠️ [XMTP] Client created but missing inboxId');
                return client; // Return client even if we can't store data
            }

            // Store the new client data with fallback for installationId
            storeClientData(walletAddress, inboxId, installationId || 'unknown');

            console.log('✅ [XMTP] New client created successfully:', {
                inboxId: inboxId,
                installationId: installationId || 'unknown',
                walletAddress: walletAddress
            });

            return client;
        } catch (createError: any) {
            // Check for database corruption first
            if (isDatabaseCorruptionError(createError)) {
                console.error('🚨 [XMTP] Database corruption detected during initial client creation');
                clearStoredClientData();
                throw createDatabaseCorruptionError();
            }

            // Check if it's the installation limit error
            if (createError.message && createError.message.includes('has already registered 5/5 installations')) {
                console.log('🚨 [XMTP] Installation limit reached, attempting comprehensive revocation...');

                // Use the new static revocation method designed for this scenario
                await revokeInstallationsStatic(xmtp, wallet, walletAddress, createError.message);

                // Wait a moment for the revocation to propagate
                console.log('⏳ [XMTP] Waiting for revocation to propagate...');
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Now try to create the client again
                console.log('🔄 [XMTP] Retrying client creation after static revocation...');
                try {
                    const client = await xmtp.Client.create(wallet, {
                        env: 'dev',
                        structuredLogging: true,
                        loggingLevel: 'info'
                    } as CreateClientOptions);

                    // Ensure we have required properties before storing
                    const inboxId = client.inboxId;
                    const installationId = (client as any).installationId;

                    if (inboxId) {
                        // Store the new client data with fallback for installationId
                        storeClientData(walletAddress, inboxId, installationId || 'unknown');
                    }

                    console.log('✅ [XMTP] Client created successfully after static revocation');
                    return client;
                } catch (retryError: any) {
                    console.error('❌ [XMTP] Failed to create client even after static revocation:', retryError);

                    // Check if it's still the same installation limit error
                    if (retryError.message && retryError.message.includes('has already registered 5/5 installations')) {
                        console.error('🚨 [XMTP] Installation limit persists after revocation - this may indicate network delay or insufficient revocation');

                        // Clear stored data and provide specific guidance
                        clearStoredClientData();

                        throw new Error(
                            'Installation limit persists after attempted revocation. This usually indicates:\n' +
                            '1. Network propagation delay (wait 5-10 minutes and try again)\n' +
                            '2. Browser database corruption\n' +
                            '3. Insufficient installations were revoked\n\n' +
                            'Immediate solution: Clear your browser data completely:\n' +
                            '• Go to Settings > Privacy > Clear browsing data\n' +
                            '• Select "All time" and include cookies, storage, and cache\n' +
                            '• Restart browser and reconnect wallet\n\n' +
                            'If issue persists, contact support with wallet: ' + walletAddress
                        );
                    }

                    // Check for database/WASM errors
                    if (isDatabaseCorruptionError(retryError)) {
                        console.error('🚨 [XMTP] Database corruption detected during retry');
                        clearStoredClientData();
                        throw createDatabaseCorruptionError();
                    }

                    // For other errors, provide general guidance
                    clearStoredClientData();
                    throw new Error(
                        'Failed to create XMTP client after revocation attempt.\n' +
                        'Please clear your browser data and try again.\n' +
                        'Original error: ' + retryError.message
                    );
                }
            } else {
                throw createError;
            }
        }
    } catch (error) {
        console.error('❌ [XMTP] Error creating XMTP client:', error);
        return null;
    }
}

// Export utility function to clear client data (for logout)
export function clearXmtpClientData(): void {
    clearStoredClientData();
    console.log('🧹 [XMTP] Client data cleared for logout');
} 