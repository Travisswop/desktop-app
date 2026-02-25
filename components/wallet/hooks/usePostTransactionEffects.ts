/**
 * Custom hook for handling post-transaction side effects
 * Extracts points updates, feed posting, and socket notifications from main transaction handler
 */

import { useCallback } from 'react';
import { useUser } from '@/lib/UserContext';
import { useNewSocketChat } from '@/lib/context/NewSocketChatContext';
import { addSwopPoint } from '@/actions/addPoint';
import { postFeed } from '@/actions/postFeed';
import {
  getWalletNotificationService,
  formatUSDValue,
} from '@/lib/utils/walletNotifications';
import { createTransactionPayload } from '@/lib/utils/transactionUtils';
import { convertToAbsoluteUrl } from '@/lib/utils/urlUtils';
import { SendFlowState } from '@/types/wallet-types';
import { POINT_TYPES, ACTION_KEYS } from '../constants';

interface ReceiverData {
  address: string;
  ensName?: string;
  isEns?: boolean;
}

const capitalizeEnsName = (name: string) =>
  name
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('.');

export function usePostTransactionEffects() {
  const { user } = useUser();
  const { socket } = useNewSocketChat();

  /**
   * Update user points for using Swop.ID
   */
  const handlePointsUpdate = useCallback(
    async (recipient: ReceiverData) => {
      if (recipient.isEns && user?._id) {
        try {
          await addSwopPoint({
            userId: user._id,
            pointType: POINT_TYPES.USING_SWOP_ID,
            actionKey: ACTION_KEYS.LAUNCH_SWOP,
          });
        } catch (error) {
          console.error('Failed to update points:', error);
          // Don't throw - points are nice-to-have, shouldn't block transaction
        }
      }
    },
    [user]
  );

  /**
   * Post transaction to user's feed
   */
  const handleFeedPost = useCallback(
    async (
      hash: string,
      flowState: SendFlowState,
      amount: number,
      walletAddress: string,
      payload: any,
      accessToken: string
    ) => {
      try {
        const transactionPayload = createTransactionPayload({
          basePayload: payload,
          sendFlow: flowState,
          hash,
          amount,
          walletAddress,
        });
        await postFeed(transactionPayload, accessToken);
      } catch (error) {
        console.error('Failed to post feed:', error);
        // Don't throw - feed posting is nice-to-have
      }
    },
    []
  );

  /**
   * Send transaction notification via Socket.IO
   */
  const handleSocketNotification = useCallback(
    (
      hash: string,
      flowState: SendFlowState,
      calculateAmount: (flow: SendFlowState) => string
    ): boolean => {
      if (!socket) {
        console.warn('Socket not available for notification');
        return false;
      }

      try {
        const notificationService = getWalletNotificationService(socket);

        if (flowState.nft) {
          // NFT transfer notification
          const networkName = flowState.network?.toUpperCase() || 'SOLANA';
          const nftData = {
            nftName: flowState.nft.name || 'NFT',
            nftImage: convertToAbsoluteUrl(flowState.nft.image),
            recipientAddress: flowState.recipient!.address,
            recipientEnsName: flowState.recipient!.ensName
              ? capitalizeEnsName(flowState.recipient!.ensName)
              : flowState.recipient!.address,
            txSignature: hash,
            network: networkName,
            tokenId: flowState.nft.tokenId,
            collectionName: flowState.nft.collection?.collectionName,
          };
          notificationService.emitNFTSent(nftData);
        } else if (flowState.token) {
          // Token transfer notification
          const amount = calculateAmount(flowState);
          const networkName = flowState.token.chain?.toUpperCase() || 'SOLANA';
          const usdValue = flowState.token.marketData?.price
            ? formatUSDValue(amount, flowState.token.marketData.price)
            : undefined;

          const tokenData = {
            tokenSymbol: flowState.token.symbol,
            tokenName: flowState.token.name,
            amount: amount,
            recipientAddress: flowState.recipient!.address,
            recipientEnsName: flowState.recipient!.ensName
              ? capitalizeEnsName(flowState.recipient!.ensName)
              : flowState.recipient!.address,
            txSignature: hash,
            network: networkName,
            tokenLogo: convertToAbsoluteUrl(flowState.token.logoURI),
            usdValue: usdValue,
          };
          notificationService.emitTokenSent(tokenData);
        }

        return true;
      } catch (error) {
        console.error('Failed to send transfer notification:', error);
        return false;
      }
    },
    [socket]
  );

  return {
    handlePointsUpdate,
    handleFeedPost,
    handleSocketNotification,
  };
}
