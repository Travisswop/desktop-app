'use client';

/**
 * Resolves an ENS name to a user ID by querying the API
 * @param ensName The ENS name to resolve (e.g., rayhan.swop.id)
 * @returns The resolved user ID or null if not found
 */
export async function resolveEnsToUserId(ensName: string): Promise<string | null> {
  try {
    // Basic validation
    if (!ensName || typeof ensName !== 'string') {
      return null;
    }
    
    // If this is already a user ID, return it as is
    if (ensName.startsWith('did:privy:')) {
      return ensName;
    }
    
    // If it's an Ethereum address, return it as is
    if (ensName.startsWith('0x') && ensName.length >= 40) {
      return ensName;
    }

    // Otherwise, try to resolve the ENS name
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/wallet/getEnsAddress/${ensName}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`Error resolving ENS name ${ensName}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log('Resolved ENS data:', data);
    
    // Extract user ID from the response
    // This depends on your API response structure - adjust accordingly
    // Assuming the user ID is in owner field
    if (data.owner) {
      return data.owner;
    }
    
    if (data.userId) {
      return data.userId;
    }
    
    // If we couldn't find a userId field, return the ENS name as fallback
    return ensName;
  } catch (error) {
    console.error('Error resolving ENS name:', error);
    return null;
  }
}
