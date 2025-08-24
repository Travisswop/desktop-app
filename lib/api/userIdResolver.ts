'use client';

/**
 * This utility helps translate between different ID types in the system:
 * - Privy IDs (did:privy:...)
 * - ETH addresses (0x...)
 * - MongoDB ObjectIDs (24 character hex)
 * 
 * The socket server expects MongoDB ObjectIDs for message sending.
 */

// Mapping of known user IDs to MongoDB ObjectIds
const userIdMapping: Record<string, string> = {
  // Example mappings - update these with your actual user mappings
  'did:privy:cmcir277b01unic0mdmojfngx': '6542fc76a24cf65de5f6772c',
  'did:privy:cmciqnr8f00u1jr0mr2clbovb': '6542fce0a24cf65de5f6772e',
  
  // Map common ETH addresses too
  '0x5e8e6F84e5f77B95842F47A99561497CB3057047': '6542fc76a24cf65de5f6772c',
  '0x1f9754ded7CF110929A07253b5CB279ca6ff322b': '6542fce0a24cf65de5f6772e',
};

// Default IDs to use as fallback
const DEFAULT_SENDER_ID = '6542fc76a24cf65de5f6772c';
const DEFAULT_RECIPIENT_ID = '6542fce0a24cf65de5f6772e';

/**
 * Get the MongoDB ObjectId for a user identified by Privy ID or ETH address
 */
export function getMongoDbId(userId: string): string | null {
  // If this is already a valid MongoDB ObjectId (24 hex chars), return it directly
  if (userId && /^[0-9a-f]{24}$/i.test(userId)) {
    console.log(`ID ${userId} is already a MongoDB ObjectId`);
    return userId;
  }

  // Check our mapping for this user ID
  if (userIdMapping[userId]) {
    console.log(`Resolved ${userId} to MongoDB ID ${userIdMapping[userId]}`);
    return userIdMapping[userId];
  }

  // For ETH addresses, normalize to lowercase for case-insensitive matching
  if (userId && userId.startsWith('0x')) {
    const normalizedId = userId.toLowerCase();
    for (const [key, value] of Object.entries(userIdMapping)) {
      if (key.toLowerCase() === normalizedId) {
        console.log(`Resolved ETH address ${userId} to MongoDB ID ${value}`);
        return value;
      }
    }
  }

  // Special case for ETH addresses not in our mapping
  if (userId && userId.startsWith('0x')) {
    console.warn(`Unknown ETH address ${userId}, using default recipient ID ${DEFAULT_RECIPIENT_ID}`);
    return DEFAULT_RECIPIENT_ID;
  }

  // Special case for Privy IDs not in our mapping
  if (userId && userId.startsWith('did:privy:')) {
    console.warn(`Unknown Privy ID ${userId}, using default recipient ID ${DEFAULT_RECIPIENT_ID}`);
    return DEFAULT_RECIPIENT_ID;
  }

  console.warn(`Could not resolve ID ${userId} to MongoDB ObjectId, returning null`);
  return null;
}
