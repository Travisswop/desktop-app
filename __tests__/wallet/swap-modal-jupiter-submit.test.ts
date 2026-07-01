import { resolveSwapModalJupiterSubmit } from '@/components/wallet/swapModalJupiterSubmit';
import { resolveSwapSelectedSolanaWallet } from '@/lib/wallet/swapSelectedSolanaWallet';
import {
  resolveSwapBalanceSolanaWalletAddress,
  resolveSwapModalSolanaWalletAddress,
} from '@/lib/wallet/swapWalletSelection';

const SWOP_MINT = 'GAehkgN1ZDNvavX81FmzCcwRnzekKMkSyUNq8WkMsjX1';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

describe('resolveSwapModalJupiterSubmit', () => {
  it('keeps the modal on an error state and never enters the Jupiter path when the SWOP signer is unavailable', () => {
    expect(
      resolveSwapModalJupiterSubmit({
        solanaReady: true,
        selectedSolanaWalletAddress: '',
        solanaWalletMismatchError:
          'The Solana wallet with these balances (EADY...HSVwG) is not connected for signing. Connect that wallet or switch accounts, then try again.',
        payToken: {
          symbol: 'SWOP',
          address: SWOP_MINT,
          decimals: 9,
        },
        receiveToken: {
          symbol: 'USDC',
          address: USDC_MINT,
          decimals: 6,
        },
        payAmount: '1',
      }),
    ).toEqual({
      ok: false,
      clearSwapStatus: true,
      error:
        'The Solana wallet with these balances (EADY...HSVwG) is not connected for signing. Connect that wallet or switch accounts, then try again.',
    });
  });

  it('enters the real Jupiter submit path only after the selected SWOP signer is available', () => {
    expect(
      resolveSwapModalJupiterSubmit({
        solanaReady: true,
        selectedSolanaWalletAddress:
          'EADYPsxfWJyRarDYjXrLymm5dQxKEBdoSH3UAP3HSVwG',
        payToken: {
          symbol: 'SWOP',
          address: SWOP_MINT,
          decimals: 9,
        },
        receiveToken: {
          symbol: 'USDC',
          address: USDC_MINT,
          decimals: 6,
        },
        payAmount: '1.25',
      }),
    ).toEqual({
      ok: true,
      preflight: {
        ok: true,
        inputMint: SWOP_MINT,
        outputMint: USDC_MINT,
        amountInSmallestUnit: '1250000000',
      },
    });
  });

  it('blocks the Jupiter path when a token-driven modal entry keeps only a stale-cased wallet address', () => {
    const preferredSolanaWalletAddress =
      resolveSwapBalanceSolanaWalletAddress({
        selectedWalletAddress:
          'EADYPSXFWJYRARDYJXRLYMM5DQXKEBDOSH3UAP3HSVWG',
        signableWalletAddress:
          'EADYPsxfWJyRarDYjXrLymm5dQxKEBdoSH3UAP3HSVwG',
      });
    const selectedSolanaWalletAddress =
      resolveSwapModalSolanaWalletAddress({
        preferredSolanaWalletAddress,
        payTokenWalletAddress:
          'EADYPSXFWJYRARDYJXRLYMM5DQXKEBDOSH3UAP3HSVWG',
      });
    const selectedSolanaWallet = resolveSwapSelectedSolanaWallet({
      preferredAddress: selectedSolanaWalletAddress,
      connectedWallets: [],
      standardWallets: [
        {
          name: 'Privy',
          accounts: [
            {
              address:
                'EADYPsxfWJyRarDYjXrLymm5dQxKEBdoSH3UAP3HSVwG',
            },
          ],
        },
      ],
    });

    expect(selectedSolanaWalletAddress).toBe(
      'EADYPSXFWJYRARDYJXRLYMM5DQXKEBDOSH3UAP3HSVWG',
    );
    expect(
      resolveSwapModalJupiterSubmit({
        solanaReady: true,
        selectedSolanaWalletAddress: selectedSolanaWallet?.address ?? '',
        solanaWalletMismatchError:
          'The Solana wallet with these balances (EADY...HSVwG) is not connected for signing. Connect that wallet or switch accounts, then try again.',
        payToken: {
          symbol: 'SWOP',
          address: SWOP_MINT,
          decimals: 9,
        },
        receiveToken: {
          symbol: 'USDC',
          address: USDC_MINT,
          decimals: 6,
        },
        payAmount: '1.25',
      }),
    ).toEqual({
      ok: false,
      clearSwapStatus: true,
      error:
        'The Solana wallet with these balances (EADY...HSVwG) is not connected for signing. Connect that wallet or switch accounts, then try again.',
    });
  });
});
