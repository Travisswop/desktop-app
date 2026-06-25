import { getJupiterSwapPreflight } from '@/lib/wallet/jupiterSwapPreflight';

const SWOP_MINT = 'GAehkgN1ZDNvavX81FmzCcwRnzekKMkSyUNq8WkMsjX1';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

describe('getJupiterSwapPreflight', () => {
  it('blocks the SWOP to USDC Jupiter route before signing when the selected Solana signer is unavailable', () => {
    expect(
      getJupiterSwapPreflight({
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
      error:
        'The Solana wallet with these balances (EADY...HSVwG) is not connected for signing. Connect that wallet or switch accounts, then try again.',
    });
  });

  it('builds the live SWOP to USDC Jupiter submit payload once the signing wallet is available', () => {
    expect(
      getJupiterSwapPreflight({
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
      inputMint: SWOP_MINT,
      outputMint: USDC_MINT,
      amountInSmallestUnit: '1250000000',
    });
  });
});
