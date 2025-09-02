'use client';

/**
 * Resolves an address/user ID back to an ENS name by querying the API
 * @param address The address or user ID to resolve 
 * @returns The ENS name if found, or a formatted address if not
 */
export async function resolveAddressToEns(address: string): Promise<string> {
  try {
    console.log(`[Reverse ENS Resolver] Attempting to resolve: ${address}`);
    
    // Basic validation
    if (!address || typeof address !== 'string') {
      console.log(`[Reverse ENS Resolver] Invalid input: ${address}`);
      return address;
    }
    
    // If this is already an ENS name, return it as is
    if (address.includes('.eth') || address.includes('.swop.id')) {
      console.log(`[Reverse ENS Resolver] Already an ENS name: ${address}`);
      return address;
    }
    
    // Try multiple API endpoints to find ENS name
    const apiEndpoints = [
      `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/seller/${address}`,
      `${process.env.NEXT_PUBLIC_API_URL}/api/v4/wallet/getEnsAddress/${address}` // Try reverse lookup
    ];

    for (const apiUrl of apiEndpoints) {
      try {
        console.log(`[Reverse ENS Resolver] Making API call to: ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store'
        });

        if (response.ok) {
          const result = await response.json();
          console.log('[Reverse ENS Resolver] API Response data:', result);
          
          // Check for ENS name in various response fields
          const ensFields = [
            result?.data?.ens,
            result?.data?.ensName,
            result?.ens,
            result?.ensName,
            result?.data?.username,
            result?.data?.name,
            result?.username,
            result?.name
          ];

          for (const field of ensFields) {
            if (field && (field.includes('.eth') || field.includes('.swop.id'))) {
              console.log(`[Reverse ENS Resolver] Found ENS: ${field}`);
              return field;
            }
          }

          // Also check for displayName that might be an ENS
          if (result?.data?.displayName && (result.data.displayName.includes('.eth') || result.data.displayName.includes('.swop.id'))) {
            console.log(`[Reverse ENS Resolver] Found displayName as ENS: ${result.data.displayName}`);
            return result.data.displayName;
          }
        }
      } catch (error) {
        console.warn(`[Reverse ENS Resolver] API call to ${apiUrl} failed:`, error);
      }
    }
    
    // If we couldn't resolve to ENS, return a formatted version of the address
    if (address.startsWith('did:privy:')) {
      // For Privy IDs, show a shortened version
      const shortId = address.replace('did:privy:', '').substring(0, 8) + '...';
      console.log(`[Reverse ENS Resolver] Formatted Privy ID: ${shortId}`);
      return shortId;
    } else if (address.startsWith('0x') && address.length >= 40) {
      // For Ethereum addresses, show shortened version
      const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
      console.log(`[Reverse ENS Resolver] Formatted ETH address: ${shortAddress}`);
      return shortAddress;
    }
    
    // Return original address as fallback
    console.log(`[Reverse ENS Resolver] Using original address as fallback: ${address}`);
    return address;
  } catch (error) {
    console.error('[Reverse ENS Resolver] Error resolving address:', error);
    // Return formatted address on error
    if (address.startsWith('did:privy:')) {
      return address.replace('did:privy:', '').substring(0, 8) + '...';
    } else if (address.startsWith('0x') && address.length >= 40) {
      return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }
    return address;
  }
}

/**
 * Cache for resolved ENS names to avoid repeated API calls
 */
const ensCache = new Map<string, { ensName: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Cached version of resolveAddressToEns with 5-minute cache
 */
export async function resolveAddressToEnsCached(address: string): Promise<string> {
  const now = Date.now();
  const cached = ensCache.get(address);
  
  // Return cached result if it's still valid
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    console.log(`[Reverse ENS Resolver] Using cached result for ${address}: ${cached.ensName}`);
    return cached.ensName;
  }
  
  // Resolve and cache the result
  const ensName = await resolveAddressToEns(address);
  ensCache.set(address, { ensName, timestamp: now });
  
  return ensName;
}