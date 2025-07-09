'use client';

// This file provides a browser-only interface to XMTP
// to prevent server-side rendering issues

let xmtpModule = null;

// Function to dynamically load the XMTP module
export async function loadXmtp() {
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
                // Only call setWasmPath if it exists
                if (wasmBindings.setWasmPath && typeof wasmBindings.setWasmPath === 'function') {
                    wasmBindings.setWasmPath('/_next/static/media/');
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

// Create a client using a wallet
export async function createClient(wallet) {
    const xmtp = await loadXmtp();
    if (!xmtp) return null;

    try {
        return await xmtp.Client.create(wallet, { env: 'dev' });
    } catch (error) {
        console.error('Error creating XMTP client:', error);
        return null;
    }
} 