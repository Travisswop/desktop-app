import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export function generateWalletFromPrivateKey(privateKeyString: string): string {
  try {
    // Convert private key from base58 string to Uint8Array
    const privateKeyBytes = bs58.decode(privateKeyString);
    
    // Create keypair from private key bytes
    const keypair = Keypair.fromSecretKey(privateKeyBytes);
    
    // Get public key (wallet address)
    return keypair.publicKey.toString();
  } catch (error) {
    console.error('Error generating wallet:', error);
    throw new Error('Invalid private key');
  }
}

export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
} 