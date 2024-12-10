'use client';
import { Skeleton } from '../ui/skeleton';
import BalanceChart from './balance-chart';
import TokenList from './token/token-list';
import NFTSlider from './nft/nft-list';
import TransactionList from './transaction/transaction-list';
import { useEffect, useState, useMemo } from 'react';
import TokenDetails from './token/token-details-view';
import NFTDetailView from './nft/nft-details-view';
import { NFT } from '@/types/nft';
import {
  usePrivy,
  useSolanaWallets,
  useWallets,
  WalletWithMetadata,
} from '@privy-io/react-auth';
import { WalletItem, ReceiverData } from '@/types/wallet';
import { useMultiChainTokenData } from '@/lib/hooks/useToken';
import { TokenData } from '@/types/token';

import NetworkDock from './network-dock';
import SendTokenModal from './token/send-modal';
import SendToModal from './token/send-to-modal';
import SendConfirmation from './token/send-confirmation';
import TransactionSuccess from './token/success-modal';
import { ethers } from 'ethers';
import {
  PublicKey,
  Transaction as SolanaTransaction,
  Connection,
  SystemProgram,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { useToast } from '@/hooks/use-toast';
import { Transaction as TransactionType } from '@/types/transaction';
import { Toaster } from '../ui/toaster';
import ProfileHeader from '../dashboard/profile-header';
import MessageBox from './message-interface';
import AssetSelector from './token/asset-selector';
import WalletQRModal from './wallet-qr-modal';
import WalletQRShare from './wallet-qr-share-modal';
import QRCodeShareModal from '../smartsite/socialShare/QRCodeShareModal';
import { useNFT } from '@/lib/hooks/useNFT';

export type Network = 'ETHEREUM' | 'POLYGON' | 'BASE' | 'SOLANA';

const CHAIN_ID = {
  ETHEREUM: 1,
  POLYGON: 137,
  BASE: 8453,
  SOLANA: 101,
} as const;

export default function WalletContent() {
  return <WalletContentInner />;
}

const WalletContentInner = () => {
  const [walletData, setWalletData] = useState<WalletItem[] | null>(
    null
  );
  const [network, setNetwork] = useState<Network>('ETHEREUM');

  const { authenticated, ready, user: PrivyUser } = usePrivy();

  const { wallets: ethWallets } = useWallets();
  const { createWallet, wallets: solanaWallets } = useSolanaWallets();
  const [selectedToken, setSelectedToken] =
    useState<TokenData | null>(null);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [isNFTModalOpen, setIsNFTModalOpen] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [walletQRModalOpen, setWalletQRModalOpen] = useState(false);
  const [walletQRShareModalOpen, setWalletQRShareModalOpen] =
    useState(false);
  const [walletShareAddress, setWalletShareAddress] = useState('');
  const [qrcodeShareUrl, setQrcodeShareUrl] = useState('');
  const [QRCodeShareModalOpen, setQRCodeShareModalOpen] =
    useState(false);
  const [newTransactions, setNewTransactions] = useState<
    TransactionType[]
  >([]);
  const [sendFlow, setSendFlow] = useState<{
    step:
      | 'amount'
      | 'recipient'
      | 'confirm'
      | 'success'
      | 'assets'
      | null;
    token: TokenData | null;
    amount: string;
    recipient: ReceiverData | null;
    nft: NFT | null;
    networkFee: string;
    network: Network;
    hash: string;
  }>({
    step: null,
    token: null,
    amount: '',
    recipient: null,
    nft: null,
    networkFee: '0',
    network: 'ETHEREUM',
    hash: '',
  });

  const { toast } = useToast();

  const currentWalletAddress = useMemo(() => {
    if (!walletData) return undefined;

    switch (network) {
      case 'SOLANA':
        return walletData.find((w) => !w.isEVM)?.address;
      case 'ETHEREUM':
      case 'POLYGON':
      case 'BASE':
        return walletData.find((w) => w.isEVM)?.address;
      default:
        return undefined;
    }
  }, [network, walletData]);

  const {
    tokens,
    loading: tokenLoading,
    error: tokenError,
  } = useMultiChainTokenData(currentWalletAddress, [network]);

  const {
    nfts,
    loading: nftLoading,
    error: nftError,
    refetch,
  } = useNFT(currentWalletAddress, [network]);

  const totalBalance = useMemo(() => {
    return tokens.reduce((total, token) => {
      const value =
        parseFloat(token.balance) *
        parseFloat(token.marketData.price);
      return total + value;
    }, 0);
  }, [tokens]);

  useEffect(() => {
    const linkWallet = PrivyUser?.linkedAccounts
      .map((item: any) => {
        if (item.chainType === 'ethereum') {
          return {
            address: item.address,
            isActive:
              item.walletClientType === 'privy' ||
              item.connectorType === 'embedded',
            isEVM: true,
            walletClientType: item.walletClientType,
          };
        } else if (item.chainType === 'solana') {
          return {
            address: item.address,
            isActive:
              item.walletClientType === 'privy' ||
              item.connectorType === 'embedded',
            isEVM: false,
            walletClientType: item.walletClientType,
          };
        }
        return null;
      })
      .filter(Boolean);

    setWalletData(linkWallet as WalletItem[]);
  }, [PrivyUser]);

  useEffect(() => {
    if (authenticated && ready && PrivyUser) {
      const hasExistingSolanaWallet = !!PrivyUser.linkedAccounts.find(
        (account: any): account is WalletWithMetadata =>
          account.type === 'wallet' &&
          account.walletClientType === 'privy' &&
          account.chainType === 'solana'
      );
      if (!hasExistingSolanaWallet) {
        createWallet();
      }
    }
  }, [authenticated, ready, PrivyUser, createWallet]);

  const handleTokenSelect = (token: TokenData) => {
    setSelectedToken(token);
  };

  const handleSelectNFT = (nft: NFT) => {
    setSelectedNFT(nft);
    setIsNFTModalOpen(true);
  };

  const handleCloseNFTModal = () => {
    setIsNFTModalOpen(false);
    setSelectedNFT(null);
  };

  const handleBack = () => {
    setSelectedToken(null);
  };

  // Handler for initiating send flow
  const handleSendClick = (token: TokenData) => {
    console.log('handleSendClick');
    setSendFlow({
      step: 'amount',
      token,
      amount: '',
      recipient: null,
      nft: null,
      networkFee: '0',
      network: network,
      hash: '',
    });
  };

  // Handler for amount confirmation
  const handleAmountConfirm = (amount: string) => {
    setSendFlow((prev) => ({
      ...prev,
      step: 'recipient',
      amount,
    }));
  };

  const handleNFTNext = (nft: NFT) => {
    let networkFee = '0';
    if (network === 'ETHEREUM') {
      networkFee = '0.0001'; // Approximate gas fee in ETH for NFT transfer
    }
    if (network === 'SOLANA') {
      networkFee = '0.000000001'; // Approximate SOL fee for NFT transfer
    }
    if (network === 'POLYGON') {
      networkFee = '0.0001'; // Approximate gas fee in MATIC for NFT transfer
    }
    if (network === 'BASE') {
      networkFee = '0.0001'; // Approximate gas fee in BASE for NFT transfer
    }
    handleCloseNFTModal();
    setSendFlow((prev) => ({
      ...prev,
      step: 'recipient',
      amount: '1',
      nft,
      networkFee: networkFee,
      network: network,
    }));
  };

  // Handler for recipient selection
  const handleRecipientSelect = (recipient: ReceiverData) => {
    setSendFlow((prev) => ({
      ...prev,
      step: 'confirm',
      recipient,
    }));
  };

  // Handler for final confirmation
  const handleSendConfirm = async () => {
    if (
      (!sendFlow.token && !sendFlow.nft) ||
      !sendFlow.recipient ||
      !sendFlow.amount
    )
      return;

    setSendLoading(true);

    const token = sendFlow.token;
    const nft = sendFlow.nft;
    const amount = sendFlow.amount;
    const recipient = sendFlow.recipient;
    const network = sendFlow.network;

    try {
      if (sendFlow.nft) {
        // Handle NFT transfer
        if (network === 'SOLANA') {
          const hash = await handleSolanaNFTTransfer();
          setSendFlow((prev) => ({
            ...prev,
            hash,
            nft,
            token,
            amount,
            recipient,
            network,
            step: 'success',
          }));
        } else {
          const hash = await handleNFTTransfer();
          setSendFlow((prev) => ({
            ...prev,
            hash,
            nft,
            token,
            amount,
            recipient,
            network,
            step: 'success',
          }));
        }

        refetch();
      } else {
        // Handle token transfer
        if (sendFlow.token?.chain === 'SOLANA') {
          const hash = await handleSolanaSend();
          setSendFlow((prev) => ({
            ...prev,
            hash,
            token,
            amount,
            recipient,
            network,
            step: 'success',
            nft: null,
          }));
        } else {
          const txHash = await handleEVMSend();
          setSendFlow((prev) => ({
            ...prev,
            hash: txHash,
            token,
            amount,
            recipient,
            network,
            step: 'success',
            nft: null,
          }));
        }
      }
      // Reset flow after successful send
      // setTimeout(() => {
      //   handleCloseModals();
      // }, 5000);
    } catch (error) {
      setSendLoading(false);
      console.error('Error sending token/NFT:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to send transaction',
      });
      setSendFlow((prev) => ({
        ...prev,
        token: null,
        nft: null,
        amount: '',
        recipient: null,
        step: null,
      }));
    } finally {
      setSendLoading(false);
    }
  };

  const handleSolanaNFTTransfer = async () => {
    const solanaWallet = solanaWallets.find(
      (w: any) => w.walletClientType === 'privy'
    );

    if (!solanaWallet) throw new Error('No Solana wallet found');

    const connection = new Connection(
      process.env.NEXT_PUBLIC_QUICKNODE_SOLANA_URL!,
      'confirmed'
    );

    try {
      const toWallet = new PublicKey(
        sendFlow.recipient?.address || ''
      );
      const mint = new PublicKey(sendFlow.nft?.contract || '');

      // Get source token account
      const sourceAccount = await getAssociatedTokenAddress(
        mint,
        new PublicKey(solanaWallet.address)
      );

      // Get or create destination token account
      const destinationAccount = await getAssociatedTokenAddress(
        mint,
        toWallet
      );

      const tx = new SolanaTransaction();

      // Create destination account if it doesn't exist
      if (!(await connection.getAccountInfo(destinationAccount))) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            new PublicKey(solanaWallet.address),
            destinationAccount,
            toWallet,
            mint
          )
        );
      }

      // Add transfer instruction
      tx.add(
        createTransferInstruction(
          sourceAccount,
          destinationAccount,
          new PublicKey(solanaWallet.address),
          1 // Amount is always 1 for NFTs
        )
      );

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = new PublicKey(solanaWallet.address);

      const signedTx = await solanaWallet.signTransaction(tx);
      const signature = await connection.sendRawTransaction(
        signedTx.serialize()
      );

      return signature;
    } catch (error) {
      console.error('Error in Solana NFT transfer:', error);
      throw error;
    }
  };

  const handleSolanaSend = async () => {
    const solanaWallet = solanaWallets.find(
      (w: any) => w.walletClientType === 'privy'
    );

    if (!solanaWallet) throw new Error('No Solana wallet found');

    const connection = new Connection(
      process.env.NEXT_PUBLIC_QUICKNODE_SOLANA_URL!,
      'confirmed'
    );

    if (sendFlow.token?.address === null) {
      // Native SOL
      const lamports = Math.floor(parseFloat(sendFlow.amount) * 1e9); // Convert SOL to lamports

      const tx = new SolanaTransaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(solanaWallet.address),
          toPubkey: new PublicKey(sendFlow.recipient?.address || ''),
          lamports,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = new PublicKey(solanaWallet.address);

      const signedTx = await solanaWallet.signTransaction(tx);
      const signature = await connection.sendRawTransaction(
        signedTx.serialize()
      );
      return signature;
    } else {
      // SPL Token
      const fromTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(sendFlow.token!.address),
        new PublicKey(solanaWallet.address)
      );

      // Get or create recipient token account
      const toTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(sendFlow.token!.address),
        new PublicKey(sendFlow.recipient?.address || '')
      );

      const tx = new SolanaTransaction();

      // Create recipient token account if it doesn't exist
      if (!(await connection.getAccountInfo(toTokenAccount))) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            new PublicKey(solanaWallet.address),
            toTokenAccount,
            new PublicKey(sendFlow.recipient?.address || ''),
            new PublicKey(sendFlow.token!.address)
          )
        );
      }

      // Calculate token amount with decimals
      const tokenAmount = Math.floor(
        parseFloat(sendFlow.amount) *
          Math.pow(10, sendFlow.token!.decimals)
      );

      // Add transfer instruction
      tx.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          new PublicKey(solanaWallet.address),
          tokenAmount
        )
      );

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = new PublicKey(solanaWallet.address);

      const signedTx = await solanaWallet.signTransaction(tx);
      const signature = await connection.sendRawTransaction(
        signedTx.serialize()
      );
      return signature;
    }
  };

  const handleEVMSend = async () => {
    const linkedEthereumWallet = PrivyUser?.linkedAccounts.find(
      (item: any) => item.chainType === 'ethereum' && item.address
    );

    const evmWallet = ethWallets.find(
      (w) =>
        w.address?.toLowerCase() ===
        (linkedEthereumWallet as any).address?.toLowerCase()
    );

    if (!evmWallet) throw new Error('No EVM wallet found');

    await evmWallet.switchChain(CHAIN_ID[network]);

    const provider = await evmWallet.getEthereumProvider();

    if (!sendFlow.token?.address) {
      // Native token (ETH/MATIC)
      const tx = {
        to: sendFlow.recipient?.address,
        value: ethers.parseEther(sendFlow.amount),
      };

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [tx],
      });

      const newTransaction = {
        hash: txHash,
        from: evmWallet.address,
        to: sendFlow.recipient?.address || '',
        value: sendFlow.amount,
        timeStamp: Math.floor(Date.now() / 1000).toString(),
        gas: '0',
        gasPrice: '0',
        networkFee: '0',
        status: 'pending',
        tokenName: sendFlow.token?.name || '',
        tokenSymbol: sendFlow.token?.symbol || '',
        tokenDecimal: 18,
        network: network,
        currentPrice: parseFloat(
          sendFlow.token?.marketData?.price || '0'
        ),
        nativeTokenPrice: parseFloat(
          sendFlow.token?.marketData?.price || '0'
        ),
        isSwapped: false,
        isNew: true,
      };

      setNewTransactions([newTransaction as TransactionType]);

      return txHash;
    } else {
      const erc20Abi = [
        'function transfer(address to, uint256 amount) returns (bool)',
        'function decimals() view returns (uint8)',
        'function balanceOf(address account) view returns (uint256)',
      ];

      const web3Provider = new ethers.BrowserProvider(provider);
      const signer = await web3Provider.getSigner();

      try {
        const contract = new ethers.Contract(
          sendFlow.token.address,
          erc20Abi,
          signer
        );

        const decimals =
          sendFlow.token.decimals || (await contract.decimals());

        const amountInWei = ethers.parseUnits(
          sendFlow.amount,
          decimals
        );

        let balance;
        try {
          balance = await contract.balanceOf(
            await signer.getAddress()
          );
          console.log('🚀 ~ handleEVMSend ~ balance:', balance);
        } catch (error) {
          console.error('Error fetching balance:', error);
          throw new Error(
            'Failed to fetch token balance. Please check the token address.'
          );
        }

        const balanceBigNumber = BigInt(balance);

        if (balanceBigNumber < amountInWei) {
          throw new Error('Insufficient balance');
        }

        const tx = await contract.transfer(
          sendFlow.recipient?.address,
          amountInWei
        );

        console.log('🚀 ~ handleEVMSend ~ tx:', tx);

        const receipt = await tx.wait();
        console.log('🚀 ~ handleEVMSend ~ receipt:', receipt);

        const newTransaction = {
          hash: tx.hash,
          from: evmWallet.address,
          to: sendFlow.recipient?.address || '',
          value: sendFlow.amount,
          status: tx.status,
          timeStamp: Date.now().toString(),
          gas: tx.gasUsed?.toString() || '0',
          gasPrice: tx.gasPrice?.toString() || '0',
          networkFee: '0',
          tokenName: sendFlow.token.name,
          tokenSymbol: sendFlow.token.symbol,
          tokenDecimal: decimals,
          network: sendFlow.token.chain,
          currentPrice: parseFloat(sendFlow.token.marketData.price),
          isSwapped: false,
          nativeTokenPrice: 0,
          isNew: true,
        };
        setNewTransactions([newTransaction]);
        return receipt.hash;
      } catch (error) {
        console.error('Error in EVM token transfer:', error);
        throw error;
      }
    }
  };

  const handleNFTTransfer = async () => {
    try {
      const linkedEthereumWallet = PrivyUser?.linkedAccounts.find(
        (item: any) => item.chainType === 'ethereum' && item.address
      );

      const evmWallet = ethWallets.find(
        (w) =>
          w.address?.toLowerCase() ===
          (linkedEthereumWallet as any).address?.toLowerCase()
      );

      if (!evmWallet) throw new Error('No EVM wallet found');

      await evmWallet.switchChain(CHAIN_ID[network]);
      const provider = await evmWallet.getEthereumProvider();

      const web3Provider = new ethers.BrowserProvider(provider);
      const signer = await web3Provider.getSigner();

      // Comprehensive ABI for ERC1155 and ERC721 compatibility
      const comprehensiveNftAbi = [
        // ERC721 methods
        'function transferFrom(address from, address to, uint256 tokenId) external',
        'function safeTransferFrom(address from, address to, uint256 tokenId) external',
        'function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory _data) external',
        'function ownerOf(uint256 tokenId) view returns (address)',

        // ERC1155 methods
        'function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes memory data) external',
        'function balanceOf(address account, uint256 id) view returns (uint256)',
        'function isApprovedForAll(address account, address operator) view returns (bool)',
      ];

      const contract = new ethers.Contract(
        sendFlow.nft?.contract || '',
        comprehensiveNftAbi,
        signer
      );

      // Check ownership and approval
      const senderAddress = await signer.getAddress();
      const balance = await contract.balanceOf(
        senderAddress,
        sendFlow.nft?.tokenId || 0
      );

      if (balance.toString() === '0') {
        throw new Error('Insufficient NFT balance');
      }

      try {
        const tx = await contract.safeTransferFrom(
          senderAddress,
          sendFlow.recipient?.address || '',
          sendFlow.nft?.tokenId || 0
        );

        const receipt = await tx.wait();
        console.log('Transfer Receipt:', receipt);

        return receipt.hash;
      } catch (transferError) {
        console.error('ERC1155 Transfer Failed:', transferError);

        // Fallback to ERC721 transfer methods
        try {
          const fallbackTx = await contract.safeTransferFrom(
            senderAddress,
            sendFlow.recipient?.address || '',
            sendFlow.nft?.tokenId || 0
          );

          const fallbackReceipt = await fallbackTx.wait();
          console.log('Fallback Transfer Receipt:', fallbackReceipt);

          return fallbackReceipt.hash;
        } catch (fallbackError) {
          console.error('Fallback Transfer Failed:', fallbackError);

          // Detailed error logging
          if (fallbackError instanceof Error) {
            console.log('Full Error Details:', {
              message: fallbackError.message,
              code: (fallbackError as any).code,
              data: (fallbackError as any).data,
            });
          }

          throw new Error('NFT Transfer Failed: Please try again.');
        }
      }
    } catch (error) {
      console.error('Comprehensive NFT Transfer Error:', error);
      throw error;
    }
  };

  // Handler for closing any modal
  const handleCloseModals = () => {
    setSendFlow({
      step: null,
      token: null,
      amount: '',
      recipient: null,
      nft: null,
      networkFee: '0',
      network: network,
      hash: '',
    });
  };

  const handleAssetSelect = () => {
    setSendFlow((prev) => ({
      ...prev,
      step: 'assets',
    }));
  };

  const handleNext = (token: TokenData) => {
    setSendFlow((prev) => ({
      ...prev,
      step: 'amount',
      token,
    }));
  };

  console.log('🚀 ~ WalletContent ~ sendFlow:', sendFlow);

  return (
    <div className="">
      <ProfileHeader />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-6">
        <BalanceChart
          walletData={walletData || []}
          totalBalance={totalBalance}
          onSelectAsset={handleAssetSelect}
          onQRClick={() => setWalletQRModalOpen(true)}
        />
        <MessageBox />
        {/* <MessageList /> */}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-6">
        {selectedToken ? (
          <TokenDetails
            token={selectedToken}
            onBack={handleBack}
            onSend={handleSendClick}
          />
        ) : (
          <TokenList
            tokens={tokens}
            loading={tokenLoading}
            error={tokenError!}
            onSelectToken={handleTokenSelect}
          />
        )}
        <div>
          <NFTSlider
            onSelectNft={handleSelectNFT}
            address={currentWalletAddress}
            network={network}
            nfts={nfts}
            loading={nftLoading}
            error={nftError}
          />
          {currentWalletAddress && (
            <TransactionList
              address={currentWalletAddress}
              network={network}
              newTransactions={newTransactions}
            />
          )}

          {selectedNFT && (
            <NFTDetailView
              isOpen={isNFTModalOpen}
              onClose={handleCloseNFTModal}
              nft={selectedNFT}
              onNext={() => handleNFTNext(selectedNFT)}
            />
          )}
        </div>
        <AssetSelector
          open={sendFlow.step === 'assets'}
          onOpenChange={(open) => !open && handleCloseModals()}
          assets={tokens}
          onNext={handleNext}
        />

        <SendTokenModal
          open={sendFlow.step === 'amount'}
          onOpenChange={(open) => !open && handleCloseModals()}
          token={sendFlow.token!}
          onNext={handleAmountConfirm}
        />
        <SendToModal
          open={sendFlow.step === 'recipient'}
          onOpenChange={(open) => !open && handleCloseModals()}
          onSelectReceiver={handleRecipientSelect}
          network={network}
          currentWalletAddress={currentWalletAddress || ''}
        />
        <SendConfirmation
          open={sendFlow.step === 'confirm'}
          onOpenChange={(open) => !open && handleCloseModals()}
          amount={sendFlow.amount}
          token={sendFlow.token!}
          recipient={sendFlow.recipient?.address || ''}
          onConfirm={handleSendConfirm}
          loading={sendLoading}
          nft={sendFlow.nft}
          recipientName={sendFlow.recipient?.ensName || ''}
          networkFee={sendFlow.networkFee || ''}
          network={sendFlow.network}
        />
        <TransactionSuccess
          open={sendFlow.step === 'success'}
          onOpenChange={(open) => !open && handleCloseModals()}
          amount={sendFlow.amount}
          nft={sendFlow.nft}
          token={sendFlow.token}
          network={sendFlow.network}
          hash={sendFlow.hash}
        />
        <WalletQRModal
          open={walletQRModalOpen}
          onOpenChange={setWalletQRModalOpen}
          walletData={walletData || []}
          setWalletShareAddress={setWalletShareAddress}
          setWalletQRShareModalOpen={setWalletQRShareModalOpen}
        />
        <WalletQRShare
          open={walletQRShareModalOpen}
          onOpenChange={setWalletQRShareModalOpen}
          walletAddress={walletShareAddress || ''}
          setQRCodeShareUrl={setQrcodeShareUrl}
          setQRCodeShareModalOpen={setQRCodeShareModalOpen}
        />
        <QRCodeShareModal
          isOpen={QRCodeShareModalOpen}
          onOpenChange={setQRCodeShareModalOpen}
          qrCodeUrl={qrcodeShareUrl}
        />
      </div>
      <NetworkDock network={network} setNetwork={setNetwork} />
      <Toaster />
    </div>
  );
};
