'use client';

/**
 * Resolves an ENS name to a user ID by querying the API
 * @param ensName The ENS name to resolve (e.g., rayhan.swop.id)
 * @returns The resolved user ID or null if not found
 */
export async function resolveEnsToUserId(ensName: string): Promise<string | null> {
  try {
    console.log(`[ENS Resolver] Attempting to resolve: ${ensName}`);
    
    // Basic validation
    if (!ensName || typeof ensName !== 'string') {
      console.log(`[ENS Resolver] Invalid input: ${ensName}`);
      return null;
    }
    
    // If this is already a user ID, return it as is
    if (ensName.startsWith('did:privy:')) {
      console.log(`[ENS Resolver] Already a Privy ID: ${ensName}`);
      return ensName;
    }
    
    // If it's an Ethereum address, return it as is
    if (ensName.startsWith('0x') && ensName.length >= 40) {
      console.log(`[ENS Resolver] Already an ETH address: ${ensName}`);
      return ensName;
    }

    // Otherwise, try to resolve the ENS name
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/v4/wallet/getEnsAddress/${ensName}`;
    console.log(`[ENS Resolver] Making API call to: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`[ENS Resolver] API Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ENS Resolver] API Error ${response.status}: ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log('[ENS Resolver] API Response data:', data);
    
    // Extract user ID from the response
    // This depends on your API response structure - adjust accordingly
    // Assuming the user ID is in owner field
    if (data.owner) {
      console.log(`[ENS Resolver] Found owner: ${data.owner}`);
      return data.owner;
    }
    
    if (data.userId) {
      console.log(`[ENS Resolver] Found userId: ${data.userId}`);
      return data.userId;
    }
    
    if (data.ethAddress) {
      console.log(`[ENS Resolver] Found ethAddress: ${data.ethAddress}`);
      return data.ethAddress;
    }
    
    if (data.address) {
      console.log(`[ENS Resolver] Found address: ${data.address}`);
      return data.address;
    }
    
    // If we couldn't find a userId field, return the ENS name as fallback
    console.log(`[ENS Resolver] No valid user ID found, using ENS name as fallback: ${ensName}`);
    return ensName;
  } catch (error) {
    console.error('[ENS Resolver] Error resolving ENS name:', error);
    return null;
  }
}
