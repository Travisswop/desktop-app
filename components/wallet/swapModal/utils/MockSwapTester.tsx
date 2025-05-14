import React, { useEffect, useState } from 'react';
import { mockSwapTransaction } from './mockSwapTest';
import {
  mockTokenTransfer,
  mockNftTransfer,
} from './mockTransferTest';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import Cookies from 'js-cookie';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface TestResult {
  success: boolean;
  signature?: string;
  pair?: string;
  tokenSymbol?: string;
  nftName?: string;
  collectionName?: string;
  recipientAddress?: string;
  error?: string;
  data?: any;
  type?: 'SWAP' | 'TOKEN_TRANSFER' | 'NFT_TRANSFER';
}

const MockSwapTester = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [activeTab, setActiveTab] = useState('swaps');

  // Get the access token from cookies once on mount.
  useEffect(() => {
    const token = Cookies.get('access-token');
    if (token) {
      setAccessToken(token);
    }
  }, []);

  // Reset results when changing tabs
  useEffect(() => {
    setResults([]);
    setSummary(null);
  }, [activeTab]);

  // Swap transaction tests
  const handleSingleSwapTest = async () => {
    setIsLoading(true);
    setResults([]);
    setSummary(null);

    try {
      const result = await mockSwapTransaction(
        accessToken,
        walletAddress
      );
      setResults([{ ...result, type: 'SWAP' }]);
      setSummary(
        result.success
          ? '✅ Mock swap transaction saved successfully!'
          : '❌ Failed to save mock swap transaction.'
      );
    } catch (error) {
      setResults([
        {
          success: false,
          error:
            error instanceof Error ? error.message : String(error),
          type: 'SWAP',
        },
      ]);
      setSummary('❌ Test failed with an exception.');
    } finally {
      setIsLoading(false);
    }
  };

  // Token transfer tests
  const handleSingleTokenTransferTest = async () => {
    setIsLoading(true);
    setResults([]);
    setSummary(null);

    try {
      const result = await mockTokenTransfer(
        accessToken,
        walletAddress,
        recipientAddress || undefined
      );
      setResults([result]);
      setSummary(
        result.success
          ? '✅ Mock token transfer transaction saved successfully!'
          : '❌ Failed to save mock token transfer transaction.'
      );
    } catch (error) {
      setResults([
        {
          success: false,
          error:
            error instanceof Error ? error.message : String(error),
          type: 'TOKEN_TRANSFER',
        },
      ]);
      setSummary('❌ Test failed with an exception.');
    } finally {
      setIsLoading(false);
    }
  };

  // NFT transfer tests
  const handleSingleNftTransferTest = async () => {
    setIsLoading(true);
    setResults([]);
    setSummary(null);

    try {
      const result = await mockNftTransfer(
        accessToken,
        walletAddress,
        recipientAddress || undefined
      );
      setResults([result]);
      setSummary(
        result.success
          ? '✅ Mock NFT transfer transaction saved successfully!'
          : '❌ Failed to save mock NFT transfer transaction.'
      );
    } catch (error) {
      setResults([
        {
          success: false,
          error:
            error instanceof Error ? error.message : String(error),
          type: 'NFT_TRANSFER',
        },
      ]);
      setSummary('❌ Test failed with an exception.');
    } finally {
      setIsLoading(false);
    }
  };

  // Render the appropriate icon based on transaction type
  const renderResultIcon = (result: TestResult) => {
    if (result.success) {
      return (
        <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
      );
    } else {
      return <XCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />;
    }
  };

  // Render the appropriate title based on transaction type
  const renderResultTitle = (result: TestResult) => {
    if (result.type === 'SWAP') {
      return `${result.pair || 'Swap'} ${
        result.success ? 'Successful' : 'Failed'
      }`;
    } else if (result.type === 'TOKEN_TRANSFER') {
      return `${result.tokenSymbol || 'Token'} Transfer ${
        result.success ? 'Successful' : 'Failed'
      }`;
    } else if (result.type === 'NFT_TRANSFER') {
      return `NFT Transfer ${
        result.nftName ? `(${result.nftName})` : ''
      } ${result.success ? 'Successful' : 'Failed'}`;
    } else {
      return `Transaction ${
        result.success ? 'Successful' : 'Failed'
      }`;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Mock Transaction Tester</CardTitle>
        <CardDescription>
          Test backend integration by generating mock transactions
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="mb-6 space-y-4">
          <div>
            <Label htmlFor="wallet-address" className="mb-2 block">
              Wallet Address (optional)
            </Label>
            <Input
              id="wallet-address"
              placeholder="Enter Solana wallet address for testing"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="mb-2"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use a default mock address
            </p>
          </div>

          {(activeTab === 'token-transfers' ||
            activeTab === 'nft-transfers') && (
            <div>
              <Label
                htmlFor="recipient-address"
                className="mb-2 block"
              >
                Recipient Address (optional)
              </Label>
              <Input
                id="recipient-address"
                placeholder="Enter recipient wallet address"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="mb-2"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use a randomized recipient address
              </p>
            </div>
          )}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="mb-6"
        >
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="swaps">Swaps</TabsTrigger>
            <TabsTrigger value="token-transfers">
              Token Transfers
            </TabsTrigger>
            <TabsTrigger value="nft-transfers">
              NFT Transfers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="swaps">
            <Button
              onClick={handleSingleSwapTest}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Test Swap
            </Button>
          </TabsContent>

          <TabsContent value="token-transfers">
            <Button
              onClick={handleSingleTokenTransferTest}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Test Transfer
            </Button>
          </TabsContent>

          <TabsContent value="nft-transfers">
            <Button
              onClick={handleSingleNftTransferTest}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Test NFT Transfer
            </Button>
          </TabsContent>
        </Tabs>

        {summary && (
          <div className="mb-4 p-3 border rounded-md bg-muted/30 text-center">
            {summary}
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-3 border rounded-md ${
                  result.success
                    ? 'border-green-500 bg-green-50'
                    : 'border-red-500 bg-red-50'
                }`}
              >
                <div className="flex items-start">
                  {renderResultIcon(result)}
                  <div className="flex-1">
                    <p className="font-medium">
                      {renderResultTitle(result)}
                    </p>
                    {result.signature && (
                      <p className="text-sm text-muted-foreground truncate">
                        Signature: {result.signature}
                      </p>
                    )}
                    {result.recipientAddress && (
                      <p className="text-sm text-muted-foreground truncate">
                        Recipient: {result.recipientAddress}
                      </p>
                    )}
                    {result.error && (
                      <p className="text-sm text-red-600 mt-1">
                        Error: {result.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="text-sm text-muted-foreground">
        These mock transactions are only saved to the backend and do
        not affect any blockchain state.
      </CardFooter>
    </Card>
  );
};

export default MockSwapTester;
