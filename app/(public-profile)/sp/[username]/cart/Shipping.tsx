import AnimateButton from '@/components/ui/Button/AnimateButton';
import { toast } from '@/components/ui/use-toast';
import { truncateWalletAddress } from '@/lib/tranacateWalletAddress';
import { useUser } from '@/lib/UserContext';
import { TransactionService } from '@/services/transaction-service';
import { useSolanaWallets } from '@privy-io/react-auth';
import { clusterApiUrl, Connection } from '@solana/web3.js';
// import { AlertCircle } from "lucide-react";
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
// import { LiaFileMedicalSolid } from "react-icons/lia";
// import { MdDelete } from "react-icons/md";

const PaymentShipping = ({
  selectedToken,
  setSelectedToken,
  subtotal,
  amontOfToken,
  walletData,
}: any) => {
  const { user } = useUser();
  const [address, setAddress] = useState('');
  console.log('usersss', user);
  const { createWallet, wallets: solanaWallets } = useSolanaWallets();

  useEffect(() => {
    if (user && user.address) {
      setAddress(user.address);
    }
  }, [user]);

  const handleSendConfirm = async () => {
    try {
      let hash = '';
      let newTransaction;
      const recipientWallet = {
        address: '4VoKLfzZNKQfmvitteM6ywtNNrdcikGuevkaTY1REhmN',
      };
      const sendFlow: any = {
        token: selectedToken,
        amount: amontOfToken,
        recipient: recipientWallet,
      };

      console.log('sendFlow', sendFlow);

      // const connection = new Connection(
      //   process.env.NEXT_PUBLIC_QUICKNODE_SOLANA_URL!,
      //   "confirmed"
      // );

      const connection = new Connection(clusterApiUrl('devnet'));

      console.log('connection', connection);

      const solanaWallet = solanaWallets.find(
        (w: any) => w.walletClientType === 'privy'
      );

      hash = await TransactionService.handleSolanaSend(
        solanaWallet,
        sendFlow,
        connection
      );
      await connection.confirmTransaction(hash);

      console.log('hash', hash);
      console.log('newTransaction', newTransaction);
    } catch (error) {
      console.error('Error sending token/NFT:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to send transaction',
      });
      // resetSendFlow();
    }
  };

  return (
    <div className="flex flex-col gap-2 py-4">
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Image
            src={'/astro-agent.png'}
            alt="astro"
            width={120}
            height={90}
            className="w-12 h-auto"
          />
          <div className="flex flex-col items-start">
            <p className="font-medium">Review</p>
            <p className="text-gray-500 font-medium">
              Request from{' '}
              <a
                href="http://swopme.co"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600"
              >
                swopme.co
              </a>
            </p>
          </div>
        </div>
        <h4 className="font-semibold text-gray-700">SWOP</h4>
      </div>
      <div className="bg-gray-200 p-3 flex flex-col items-start rounded">
        <p className="text-gray-500 font-medium">
          Asset Change (estimate)
        </p>
        <p className="font-semibold">
          - <span className="text-red-500">{amontOfToken} </span>
          {selectedToken.symbol ? selectedToken.symbol : 'SOL'}
        </p>
      </div>
      <div className="flex items-center gap-2 justify-between">
        <p className="font-medium">Shipping Address</p>
        <input
          className="text-gray-500 font-medium border border-gray-300 rounded px-1 focus:outline-gray-200 text-end"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2 justify-between">
        <p className="font-medium">Wallet Used</p>
        <p className="text-gray-500 font-medium">
          {truncateWalletAddress(walletData[1]?.address)}
        </p>
      </div>
      <div className="flex items-center gap-2 justify-between">
        <p className="font-medium">Network</p>
        <p className="text-gray-500 font-medium">
          {selectedToken.chain}
        </p>
      </div>
      <div className="flex items-center gap-2 justify-between">
        <p className="font-medium">Network Fee</p>
        <p className="text-gray-500 font-medium">0.000005 SOL</p>
      </div>
      <div className="flex items-center gap-2 justify-between">
        <p className="font-medium">Shipping Cost</p>
        <p className="text-gray-500 font-medium">$0</p>
      </div>
      <div className="flex items-center gap-2 justify-between">
        <p className="font-medium">Total Cost</p>
        <p className="text-gray-500 font-medium">${subtotal}</p>
      </div>
      {/* Warning/Info Box */}
      {/* <div className="bg-yellow-50 p-4 rounded-xl flex items-start gap-3 text-start">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-700">
          Transactions cannot be reversed after confirmation. Please ensure the
          recipient address is correct.
        </div>
      </div> */}
      <div className="flex justify-between mt-4 gap-3">
        <AnimateButton
          whiteLoading={true}
          className="w-full"
          onClick={() => setSelectedToken('')}
        >
          Cancel
        </AnimateButton>

        <AnimateButton
          whiteLoading={true}
          type="button"
          onClick={handleSendConfirm}
          // isLoading={isDeleteLoading}
          className="bg-black text-white py-2 !border-0 w-full"
        >
          Confirm
        </AnimateButton>
      </div>
    </div>
  );
};

export default PaymentShipping;
