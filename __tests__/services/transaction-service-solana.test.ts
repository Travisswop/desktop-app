jest.mock('@solana/web3.js', () => {
  const makePublicKey = (value: unknown) => ({
    value:
      typeof value === 'object' && value && 'value' in value
        ? (value as { value: string }).value
        : String(value),
    equals(other: { value?: string }): boolean {
      return (
        (typeof value === 'object' && value && 'value' in value
          ? (value as { value: string }).value
          : String(value)) === other?.value
      );
    },
    toString(): string {
      return typeof value === 'object' && value && 'value' in value
        ? (value as { value: string }).value
        : String(value);
    },
  });

  class MockTransaction {
    instructions: unknown[] = [];
    recentBlockhash?: string;
    feePayer?: unknown;

    add(instruction: unknown) {
      this.instructions.push(instruction);
      return this;
    }
  }

  return {
    PublicKey: jest.fn().mockImplementation(makePublicKey),
    Transaction: MockTransaction,
    Connection: jest.fn(),
    SystemProgram: {
      transfer: jest.fn((instruction) => ({ type: 'system-transfer', instruction })),
    },
    TransactionMessage: jest.fn(),
    VersionedTransaction: jest.fn(),
  };
});

jest.mock('@solana/spl-token', () => {
  const tokenProgram = {
    value: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    equals(other: { value?: string }) {
      return this.value === other?.value;
    },
    toString() {
      return this.value;
    },
  };
  const token2022Program = {
    value: 'TokenzQdBNbLqP5VEhdkAS6EPF5NnJ3uBvf9Ss623VQ5DA',
    equals(other: { value?: string }) {
      return this.value === other?.value;
    },
    toString() {
      return this.value;
    },
  };

  return {
    getAssociatedTokenAddress: jest.fn(
      async (mint: { value: string }, owner: { value: string }) => {
        const value = `${owner.value}-${mint.value}-ata`;
        return {
          value,
          equals(other: { value?: string }): boolean {
            return value === other?.value;
          },
          toString(): string {
            return value;
          },
        };
      },
    ),
    createTransferInstruction: jest.fn(() => ({ type: 'transfer' })),
    createTransferCheckedInstruction: jest.fn(() => ({ type: 'transfer-checked' })),
    createAssociatedTokenAccountInstruction: jest.fn(() => ({ type: 'create-ata' })),
    getAccount: jest.fn(),
    TOKEN_PROGRAM_ID: tokenProgram,
    TOKEN_2022_PROGRAM_ID: token2022Program,
    ASSOCIATED_TOKEN_PROGRAM_ID: { value: 'associated-token-program' },
  };
});

import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
} from '@solana/spl-token';
import { TransactionService } from '@/services/transaction-service';
import type { SendFlowState } from '@/types/wallet-types';

const connection = {
  getParsedAccountInfo: jest.fn(),
  getLatestBlockhash: jest.fn(),
};

const makeAccount = (mint: string, owner: string) => ({
  mint: {
    value: mint,
    equals(other: { value?: string }) {
      return this.value === other?.value;
    },
  },
  owner: {
    value: owner,
    equals(other: { value?: string }) {
      return this.value === other?.value;
    },
  },
});

const sendFlow: SendFlowState = {
  step: 'confirm',
  token: {
    name: 'Swop',
    symbol: 'SWOP',
    balance: '10',
    decimals: 9,
    walletAddress: 'sender-wallet',
    address: 'swop-mint',
    logoURI: '',
    chain: 'SOLANA',
    marketData: null,
    timeSeriesData: { '1H': [], '1D': [], '1W': [], '1M': [], '1Y': [] },
  },
  amount: '1',
  isUSD: false,
  recipient: { address: 'recipient-wallet' },
  nft: null,
  network: 'SOLANA',
  hash: '',
};

describe('TransactionService.buildSolanaTokenTransfer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    connection.getParsedAccountInfo.mockResolvedValue({
      value: { owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
    });
    connection.getLatestBlockhash.mockResolvedValue({ blockhash: 'blockhash' });
  });

  it('fails with a short app error when the selected wallet has no source token account', async () => {
    (getAccount as jest.Mock).mockRejectedValueOnce(new Error('not found'));

    await expect(
      TransactionService.buildSolanaTokenTransfer(
        { address: 'sender-wallet' },
        sendFlow,
        connection as never,
      ),
    ).rejects.toThrow(
      'SWOP is not available in the selected Solana wallet. Refresh your wallet and try again.',
    );

    expect(createTransferInstruction).not.toHaveBeenCalled();
  });

  it('stops when recipient token account was not prepared', async () => {
    (getAccount as jest.Mock)
      .mockResolvedValueOnce(makeAccount('swop-mint', 'sender-wallet'))
      .mockRejectedValueOnce(new Error('not found'));

    await expect(
      TransactionService.buildSolanaTokenTransfer(
        { address: 'sender-wallet' },
        sendFlow,
        connection as never,
        { createRecipientTokenAccount: false },
      ),
    ).rejects.toThrow('Recipient token account is not ready. Please try again.');

    expect(createAssociatedTokenAccountInstruction).not.toHaveBeenCalled();
    expect(createTransferInstruction).not.toHaveBeenCalled();
  });
});
