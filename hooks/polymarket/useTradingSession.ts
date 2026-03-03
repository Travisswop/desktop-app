import { useState, useCallback } from 'react';
import { ClobClient } from '@polymarket/clob-client';
import { usePolymarketWallet } from '@/providers/polymarket';

export type TradingSessionStep = 'connect' | 'initialize' | 'ready' | 'error';

export function useTradingSession() {
  const [currentStep, setCurrentStep] = useState<TradingSessionStep>('connect');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [clobClient, setClobClient] = useState<ClobClient | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const { eoaAddress, walletClient } = usePolymarketWallet();

  const initializeTradingSession = useCallback(async () => {
    if (!eoaAddress || !walletClient) {
      setSessionError('Wallet not connected');
      setCurrentStep('error');
      return;
    }

    setIsInitializing(true);
    setSessionError(null);
    setCurrentStep('initialize');

    try {
      // Create CLOB client instance
      const client = new ClobClient({
        host: 'https://clob.polymarket.com',
        chainId: 137, // Polygon
        feeRateBps: 0,
        signatureType: 1,
      });

      // Initialize with wallet
      await client.setCredentials({
        key: eoaAddress,
        secret: '', // Will be handled by wallet signing
        passphrase: '',
      });

      setClobClient(client);
      setCurrentStep('ready');
    } catch (error) {
      console.error('Failed to initialize trading session:', error);
      setSessionError(error instanceof Error ? error.message : 'Failed to initialize');
      setCurrentStep('error');
    } finally {
      setIsInitializing(false);
    }
  }, [eoaAddress, walletClient]);

  const endTradingSession = useCallback(() => {
    setClobClient(null);
    setCurrentStep('connect');
    setSessionError(null);
  }, []);

  const isTradingSessionComplete = currentStep === 'ready' && !!clobClient;

  return {
    currentStep,
    sessionError,
    clobClient,
    isInitializing,
    isTradingSessionComplete,
    initializeTradingSession,
    endTradingSession,
  };
}