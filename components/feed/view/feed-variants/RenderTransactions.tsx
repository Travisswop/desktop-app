import Image from 'next/image';
import TokenTransferFeedCard from '../../TokenTransferFeedCard';

const RenderTransactionContent = (feed: any) => {
  const {
    transaction_type,
    receiver_ens,
    receiver_wallet_address,
    amount,
    image,
    name,
    currency,
  } = feed?.feed?.content;

  // Use receiver ENS if available; otherwise, show a truncated wallet address.
  const recipientDisplay = receiver_ens
    ? receiver_ens
    : receiver_wallet_address &&
      `${receiver_wallet_address.slice(
        0,
        5,
      )}...${receiver_wallet_address.slice(-5)}`;

  if (transaction_type === 'nft') {
    return (
      <div>
        <p className="text-gray-600 text-sm">
          Sent NFT{' '}
          <span className="font-medium text-base">
            {name || 'item'}
          </span>{' '}
          to{' '}
          <span className="font-medium text-base">
            {recipientDisplay}
          </span>
          .
        </p>
        {image && (
          <div className="w-52">
            <Image
              src={image}
              alt="NFT"
              width={300}
              height={300}
              className="w-full h-auto"
            />
            <p className="text-sm text-gray-600 font-medium mt-0.5 text-center">
              {amount} {currency || 'NFT'}
            </p>
          </div>
        )}
      </div>
    );
  } else if (transaction_type === 'token') {
    return <TokenTransferFeedCard feed={feed?.feed} />;
  } else {
    return (
      <p className="text-gray-600 text-sm">
        Executed a {transaction_type} transaction involving {amount}{' '}
        {currency}.
      </p>
    );
  }
};

export default RenderTransactionContent;
