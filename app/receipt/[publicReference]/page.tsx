'use client';

import {
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react';
import { useConnectWallet, usePrivy } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import { CheckCircle2, Download, FileText, LockKeyhole, WalletCards } from 'lucide-react';
import {
  downloadMarketplaceDigitalAssetWithReceiptNft,
  getMarketplaceReceiptUnlockMessage,
  getPublicMarketplaceReceipt,
  type MarketplaceReceiptDownload,
  type PublicMarketplaceReceipt,
} from '@/lib/marketplace-api';

interface Props {
  params: Promise<{ publicReference: string }>;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function signatureToBase64(signature: unknown) {
  if (signature instanceof Uint8Array) return bytesToBase64(signature);
  if (Array.isArray(signature)) return bytesToBase64(Uint8Array.from(signature));
  if (
    signature &&
    typeof signature === 'object' &&
    Array.isArray((signature as { data?: number[] }).data)
  ) {
    return bytesToBase64(Uint8Array.from((signature as { data: number[] }).data));
  }
  return String(signature || '');
}

function shortAddress(address?: string | null) {
  if (!address) return '';
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function formatMoney(value?: number, currency = 'USDC') {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${value.toFixed(2)} ${currency}`
    : `0.00 ${currency}`;
}

function fileSize(bytes?: number) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return '0 KB';
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName || 'swop-digital-download';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

type SolanaMessageSigner = {
  signMessage?: (input: { message: Uint8Array }) => Promise<{ signature: unknown }>;
};

export default function ReceiptUnlockPage({ params }: Props) {
  const { publicReference } = use(params);
  const { ready, authenticated, login } = usePrivy();
  const { connectWallet } = useConnectWallet();
  const { ready: solanaReady, wallets: solanaWallets } = useSolanaWallets();
  const [receipt, setReceipt] = useState<PublicMarketplaceReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const wallet = useMemo(
    () =>
      solanaWallets.find((item) => item.address) ||
      solanaWallets[0] ||
      null,
    [solanaWallets]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPublicMarketplaceReceipt(publicReference)
      .then((data) => {
        if (!cancelled) setReceipt(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Receipt not found.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [publicReference]);

  const connect = useCallback(async () => {
    if (!ready) return;
    if (!authenticated) {
      login();
      return;
    }
    await connectWallet();
  }, [authenticated, connectWallet, login, ready]);

  const download = useCallback(
    async (item: MarketplaceReceiptDownload) => {
      if (!wallet?.address || !item.productId) {
        await connect();
        return;
      }
      const signer = wallet as SolanaMessageSigner;
      if (typeof signer.signMessage !== 'function') {
        setError('Connected Solana wallet cannot sign unlock messages.');
        return;
      }

      setError(null);
      setDownloadingId(item.productId);
      try {
        const unlock = await getMarketplaceReceiptUnlockMessage(
          publicReference,
          wallet.address
        );
        const signed = await signer.signMessage({
          message: new TextEncoder().encode(unlock.message),
        });
        const result = await downloadMarketplaceDigitalAssetWithReceiptNft(
          publicReference,
          item.productId,
          {
            walletAddress: wallet.address,
            issuedAt: unlock.issuedAt,
            message: unlock.message,
            signature: signatureToBase64(signed.signature),
          }
        );
        saveBlob(result.blob, result.fileName || item.fileName || item.name);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to unlock this digital file.'
        );
      } finally {
        setDownloadingId(null);
      }
    },
    [connect, publicReference, wallet]
  );

  const total = receipt?.order.financial?.totalCost;
  const currency = receipt?.order.financial?.currency || 'USDC';
  const isReady = ready && solanaReady;
  const hasWallet = Boolean(wallet?.address);

  return (
    <main style={pageStyle}>
      <section style={receiptStyle}>
        <div style={receiptWaveStyle} />
        <div style={headerStyle}>
          <div style={brandLockupStyle}>
            <div>
              <div style={brandMarkStyle}>SWOP</div>
              <div style={brandSubStyle}>Global Asset Layer</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={eyebrowStyle}>Digital Receipt</div>
            <div style={referenceStyle}>{publicReference}</div>
          </div>
        </div>

        <div style={brandRailStyle}>
          <span>Self-custody</span>
          <span>Swop.ID</span>
          <span>Receipt NFT</span>
          <span>Built on-chain</span>
        </div>

        {loading ? (
          <div style={messageStyle}>Loading receipt...</div>
        ) : error && !receipt ? (
          <div style={errorStyle}>{error}</div>
        ) : receipt ? (
          <>
            <div style={summaryGridStyle}>
              <Summary label="Merchant" value={receipt.order.merchant?.name || 'Swop merchant'} />
              <Summary label="Buyer" value={receipt.order.buyer?.name || 'Swop buyer'} />
              <Summary label="Total" value={formatMoney(total, currency)} />
              <Summary
                label="Receipt NFT"
                value={shortAddress(receipt.receipt.mintAddress) || 'Pending'}
              />
            </div>

            <div style={accessBoxStyle}>
              <div style={accessIconStyle}>
                {hasWallet ? <CheckCircle2 size={20} /> : <LockKeyhole size={20} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={accessTitleStyle}>
                  {hasWallet ? shortAddress(wallet?.address) : 'Connect Solana wallet'}
                </div>
                <div style={accessTextStyle}>
                  {hasWallet
                    ? 'Sign once per download to prove receipt ownership.'
                    : 'The connected wallet must hold this receipt NFT.'}
                </div>
              </div>
              {!hasWallet ? (
                <button
                  type="button"
                  onClick={connect}
                  disabled={!isReady}
                  style={secondaryButtonStyle}
                >
                  <WalletCards size={16} />
                  Connect
                </button>
              ) : null}
            </div>

            {error ? <div style={errorStyle}>{error}</div> : null}

            <div style={downloadsStyle}>
              <div style={sectionTitleStyle}>Secret Files</div>
              {receipt.downloads.length ? (
                receipt.downloads.map((item) => {
                  const busy = downloadingId === item.productId;
                  return (
                    <div key={item.productId} style={downloadRowStyle}>
                      <div style={fileIconStyle}>
                        <FileText size={18} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={fileNameStyle}>{item.fileName || item.name}</div>
                        <div style={fileMetaStyle}>
                          {item.name} | {fileSize(item.size)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void download(item)}
                        disabled={busy || !isReady}
                        style={primaryButtonStyle}
                      >
                        <Download size={16} />
                        {busy ? 'Unlocking' : 'Download'}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div style={messageStyle}>No digital files on this receipt.</div>
              )}
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={summaryLabelStyle}>{label}</div>
      <div style={summaryValueStyle}>{value}</div>
    </div>
  );
}

const pageStyle = {
  minHeight: '100vh',
  background:
    'radial-gradient(circle at 18% 6%, rgba(63,224,143,0.24), transparent 28%), radial-gradient(circle at 82% 12%, rgba(124,58,237,0.26), transparent 26%), linear-gradient(135deg, #050505 0%, #111318 48%, #050505 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '32px 16px',
} satisfies CSSProperties;

const receiptStyle = {
  position: 'relative',
  overflow: 'hidden',
  width: 'min(860px, 100%)',
  borderRadius: 28,
  border: '1px solid rgba(255,255,255,0.16)',
  background: '#fffdf8',
  boxShadow: '0 34px 100px rgba(0, 0, 0, 0.38)',
  padding: '34px',
} satisfies CSSProperties;

const receiptWaveStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 170,
  background:
    'linear-gradient(90deg, rgba(63,224,143,0.94) 0%, rgba(53,183,255,0.94) 24%, rgba(124,58,237,0.92) 52%, rgba(255,77,141,0.9) 76%, rgba(245,197,66,0.94) 100%)',
  clipPath: 'polygon(0 0, 100% 0, 100% 64%, 82% 74%, 63% 58%, 44% 76%, 24% 60%, 0 78%)',
  opacity: 0.95,
  pointerEvents: 'none',
} satisfies CSSProperties;

const headerStyle = {
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 18,
  minHeight: 136,
  borderBottom: '1px solid rgba(23, 23, 23, 0.12)',
  paddingBottom: 20,
  marginBottom: 24,
} satisfies CSSProperties;

const brandLockupStyle = {
  display: 'flex',
  alignItems: 'center',
} satisfies CSSProperties;

const brandMarkStyle = {
  fontSize: 38,
  fontWeight: 900,
  letterSpacing: 7,
  color: '#fffdf8',
  textShadow: '0 12px 32px rgba(0,0,0,0.22)',
} satisfies CSSProperties;

const brandSubStyle = {
  marginTop: 3,
  fontSize: 11,
  fontWeight: 850,
  textTransform: 'uppercase',
  letterSpacing: 4,
  color: 'rgba(255,253,248,0.82)',
} satisfies CSSProperties;

const eyebrowStyle = {
  fontSize: 12,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: 4,
  color: 'rgba(255,253,248,0.84)',
} satisfies CSSProperties;

const referenceStyle = {
  marginTop: 8,
  fontFamily: 'var(--font-jetbrains-mono)',
  fontSize: 13,
  color: '#fffdf8',
  textShadow: '0 8px 22px rgba(0,0,0,0.22)',
} satisfies CSSProperties;

const brandRailStyle = {
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  borderRadius: 999,
  background: '#111111',
  color: '#fffdf8',
  padding: '10px 12px',
  margin: '-8px 0 24px',
  boxShadow: '0 14px 32px rgba(0,0,0,0.12)',
  fontSize: 11,
  fontWeight: 850,
  textTransform: 'uppercase',
  letterSpacing: 2,
} satisfies CSSProperties;

const summaryLayerStyle = {
  position: 'relative',
  zIndex: 1,
} satisfies CSSProperties;

const summaryGridStyle = {
  ...summaryLayerStyle,
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
  gap: 18,
  marginBottom: 24,
} satisfies CSSProperties;

const summaryLabelStyle = {
  fontSize: 11,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: 2,
  color: '#9b9287',
  marginBottom: 8,
} satisfies CSSProperties;

const summaryValueStyle = {
  fontSize: 15,
  fontWeight: 750,
  color: '#171717',
  wordBreak: 'break-word',
} satisfies CSSProperties;

const accessBoxStyle = {
  ...summaryLayerStyle,
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 14,
  borderRadius: 16,
  background:
    'linear-gradient(#fffdf8, #fffdf8) padding-box, linear-gradient(90deg, #3fe08f, #35b7ff, #7c3aed, #ff4d8d, #f5c542) border-box',
  border: '1px solid transparent',
  padding: 14,
  marginBottom: 20,
} satisfies CSSProperties;

const accessIconStyle = {
  width: 42,
  height: 42,
  borderRadius: 12,
  background: 'linear-gradient(135deg, #111111 0%, #2b2d34 100%)',
  color: '#fffdf8',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: '0 0 auto',
} satisfies CSSProperties;

const accessTitleStyle = {
  fontSize: 14,
  fontWeight: 800,
  color: '#171717',
} satisfies CSSProperties;

const accessTextStyle = {
  marginTop: 2,
  fontSize: 12,
  color: '#6f675d',
} satisfies CSSProperties;

const downloadsStyle = {
  ...summaryLayerStyle,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
} satisfies CSSProperties;

const sectionTitleStyle = {
  fontSize: 12,
  fontWeight: 850,
  textTransform: 'uppercase',
  letterSpacing: 3,
  color: '#8a8173',
  marginBottom: 2,
} satisfies CSSProperties;

const downloadRowStyle = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 14,
  borderRadius: 16,
  border: '1px solid #e3dccf',
  background: '#ffffff',
  padding: 14,
} satisfies CSSProperties;

const fileIconStyle = {
  width: 42,
  height: 42,
  borderRadius: 12,
  background: '#f3efe7',
  border: '1px solid #ded6c9',
  color: '#171717',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: '0 0 auto',
} satisfies CSSProperties;

const fileNameStyle = {
  fontSize: 14,
  fontWeight: 800,
  color: '#171717',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} satisfies CSSProperties;

const fileMetaStyle = {
  marginTop: 3,
  fontFamily: 'var(--font-jetbrains-mono)',
  fontSize: 11,
  color: '#8a8173',
} satisfies CSSProperties;

const primaryButtonStyle = {
  border: 0,
  borderRadius: 12,
  background: '#050505',
  color: '#fffdf8',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '11px 16px',
  fontSize: 13,
  fontWeight: 800,
  cursor: 'pointer',
} satisfies CSSProperties;

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  background: 'linear-gradient(90deg, #3fe08f, #35b7ff, #7c3aed)',
  color: '#171717',
  border: '1px solid rgba(0,0,0,0.12)',
} satisfies CSSProperties;

const errorStyle = {
  ...summaryLayerStyle,
  border: '1px solid rgba(185,28,28,0.18)',
  background: 'rgba(185,28,28,0.06)',
  color: '#b91c1c',
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 16,
} satisfies CSSProperties;

const messageStyle = {
  ...summaryLayerStyle,
  borderRadius: 14,
  background: '#f3efe7',
  color: '#6f675d',
  padding: 18,
  fontSize: 14,
  fontWeight: 650,
} satisfies CSSProperties;
