'use client';
import Image from 'next/image';
import ensImg from '@/public/images/ens.png';
import { useUser } from '@/lib/UserContext';
import { useMemo, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import { Download, Share2 } from 'lucide-react';
import { selectPreferredWallet } from '../hooks/useWalletData';
import { BentoCard, Chip } from '@/components/ui/bento';
import { useToast } from '@/hooks/use-toast';

type ChainKey = 'sol' | 'eth' | 'pol' | 'base';

const CHAIN_LABELS: Record<ChainKey, string> = {
  sol: 'Solana',
  eth: 'Ethereum',
  pol: 'Polygon',
  base: 'Base',
};

const CHAIN_ICONS: Record<ChainKey, string> = {
  sol: '/assets/icons/solana.png',
  eth: '/assets/icons/ETH.png',
  pol: '/assets/icons/POL.png',
  base: '/assets/icons/base.png',
};

// Native render resolution of the hidden QR used for the Save export — high
// enough that the downloaded PNG is crisp instead of an upscaled 200px capture.
const EXPORT_QR_SIZE = 1000;

const GetQrCodeUsingWalletAddress = ({
  walletName,
}: {
  walletName: ChainKey;
}) => {
  const { user } = useUser();
  const { user: privyUser } = usePrivy();
  const { toast } = useToast();
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // The active chain is derived directly from the prop — no mirrored state.
  const chainKey = walletName;

  const { wallets: solWallets } = useSolanaWallets();
  const { wallets: ethWallets } = useWallets();

  const solWalletAddress = useMemo(() => {
    return selectPreferredWallet(solWallets)?.address;
  }, [solWallets]);

  const evmWalletAddress = useMemo(() => {
    return selectPreferredWallet(
      ethWallets,
      privyUser?.wallet?.address,
    )?.address;
  }, [ethWallets, privyUser?.wallet?.address]);

  const chainLabel = CHAIN_LABELS[chainKey];
  const activeAddress =
    chainKey === 'sol' ? solWalletAddress : evmWalletAddress;
  const chainIcon = CHAIN_ICONS[chainKey];

  const handleSaveQR = () => {
    const source = qrCanvasRef.current;
    if (!source || !activeAddress) return;

    try {
      // Compose the download directly from the hidden high-res QR canvas.
      // (html2canvas re-rasterized the on-screen 200px canvas, which produced a
      // soft, low-res PNG.)
      const QR_SIZE = EXPORT_QR_SIZE; // exported QR resolution in px
      const PADDING = 80; // white quiet-zone around the QR (needed by scanners)
      const CAPTION_HEIGHT = 130;

      const output = document.createElement('canvas');
      output.width = QR_SIZE + PADDING * 2;
      output.height = QR_SIZE + PADDING * 2 + CAPTION_HEIGHT;
      const ctx = output.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, output.width, output.height);

      // Source is rendered natively at high resolution, so a smoothed draw keeps
      // the modules crisp and the center logo clean.
      ctx.drawImage(source, PADDING, PADDING, QR_SIZE, QR_SIZE);

      ctx.fillStyle = '#6b7280';
      ctx.font =
        '600 44px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        'Powered By Swop',
        output.width / 2,
        QR_SIZE + PADDING * 2 + CAPTION_HEIGHT / 2,
      );

      const link = document.createElement('a');
      link.download = `${activeAddress}.png`;
      link.href = output.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error saving QR code:', error);
      toast({
        variant: 'destructive',
        title: 'Could not save QR code',
        description: 'Please try again.',
      });
    }
  };

  const handleShareQR = async () => {
    if (!activeAddress) {
      toast({
        variant: 'destructive',
        title: 'No wallet address',
        description: `Your ${chainLabel} wallet is still loading. Please try again.`,
      });
      return;
    }

    const shareData = {
      title: `My ${chainLabel} wallet address`,
      text: `Send tokens or NFTs to my ${chainLabel} wallet:\n${activeAddress}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(activeAddress);
        toast({
          title: 'Address copied',
          description: 'Wallet address copied to clipboard.',
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <div className="relative bg-white mx-auto p-8">
      <div className="flex items-center mb-5 justify-center gap-2">
        <div className="w-12 h-12 flex items-center justify-center">
          <Image src={ensImg} alt="ens image" />
        </div>
        <h2 className="text-[22px] leading-tight font-semibold tracking-[-0.02em] text-gray-900">
          {user && (user.ens || user.ensName)}
        </h2>
      </div>

      <div className="flex justify-center mb-4">
        <Chip asLabel className="gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {chainLabel}
        </Chip>
      </div>

      <div className="flex flex-col items-center mb-6">
        <BentoCard padding="p-2" className="inline-block">
          <div className="bg-white p-4">
            {activeAddress ? (
              <>
                <QRCodeCanvas
                  value={activeAddress}
                  size={200}
                  level="H"
                  marginSize={0}
                  imageSettings={{
                    src: chainIcon,
                    height: 40,
                    width: 40,
                    excavate: true, // ensures clear background behind logo
                  }}
                />
                {/* Hidden high-res copy rendered natively at EXPORT_QR_SIZE —
                    used only as the source for the Save export. */}
                <QRCodeCanvas
                  ref={qrCanvasRef}
                  value={activeAddress}
                  size={EXPORT_QR_SIZE}
                  level="H"
                  marginSize={0}
                  imageSettings={{
                    src: chainIcon,
                    height: EXPORT_QR_SIZE * 0.2,
                    width: EXPORT_QR_SIZE * 0.2,
                    excavate: true,
                  }}
                  style={{ display: 'none' }}
                />
              </>
            ) : (
              <div className="w-[200px] h-[200px] rounded-xl bg-gray-100 animate-pulse" />
            )}
          </div>

          <div className="text-center">
            <p className="text-[12px] font-medium text-gray-500">
              Powered By Swop
            </p>
          </div>
        </BentoCard>
      </div>

      <p className="text-center text-[13px] text-gray-500 max-w-md mx-auto mb-6 leading-relaxed">
        {`Use this only to receive tokens or NFTs on the ${chainLabel} blockchain`}
      </p>

      <div className="flex justify-center gap-3">
        <button
          onClick={handleSaveQR}
          disabled={!activeAddress}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gray-950 px-5 text-[13px] font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
        >
          <Download size={16} />
          Save
        </button>
        <button
          onClick={handleShareQR}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/[0.06] bg-white px-5 text-[13px] font-semibold text-gray-900 transition hover:border-black/[0.15]"
        >
          <Share2 size={16} />
          Share
        </button>
      </div>
    </div>
  );
};

export default GetQrCodeUsingWalletAddress;
