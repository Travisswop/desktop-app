import CreateCollectible from '@/components/mint/collectible';
import CreateCouponPage from '@/components/mint/coupon';
import CreateMembershipPage from '@/components/mint/membership';
import CreateMenuPage from '@/components/mint/menu';
import CreatePhygitalPage from '@/components/mint/phygital';
import CreateSubscriptionPage from '@/components/mint/subscription';

const CreateCollectiblePage = async ({
  params,
}: {
  params: Promise<{ type: string; mint_address: string }>;
}) => {
  const collection = await params;
  const collectionType = collection.type;
  const collectionId = collection.mint_address;
  if (collectionType === 'collectible') {
    return <CreateCollectible collectionId={collectionId} />;
  }
  if (collectionType === 'coupon') {
    return <CreateCouponPage collectionId={collectionId} />;
  }
  if (collectionType === 'membership') {
    return <CreateMembershipPage collectionId={collectionId} />;
  }
  if (collectionType === 'menu') {
    return <CreateMenuPage collectionId={collectionId} />;
  }
  if (collectionType === 'phygital') {
    return <CreatePhygitalPage collectionId={collectionId} />;
  }
  if (collectionType === 'subscription') {
    return <CreateSubscriptionPage collectionId={collectionId} />;
  }
  return (
    <>
      Hello {collectionType} {collectionId}
    </>
  );
};

export default CreateCollectiblePage;
