'use client';
import { loadStripe } from '@stripe/stripe-js';
import {
  deleteCartItem,
  updateCartQuantity,
} from '@/actions/addToCartActions';
import NftPaymentModal from '@/components/modal/NftPayment';
import AnimateButton from '@/components/ui/Button/AnimateButton';
import { useDisclosure } from '@nextui-org/react';
import { CircleMinus, CirclePlus, Loader } from 'lucide-react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { LiaTimesSolid } from 'react-icons/lia';
import { createPaymentIntent } from '@/lib/payment-actions';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
// Load your Stripe publishable key
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const CartContent = ({ data, accessToken }: any) => {
  const params = useParams();
  const name: any = params.username;
  const stripe = useStripe();
  const elements = useElements();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [clientSecret, setClientSecret] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);

  const [loadingStates, setLoadingStates] = useState<{
    [key: string]: boolean;
  }>({});
  const [deleteLoadingStates, setDeleteLoadingStates] = useState<{
    [key: string]: boolean;
  }>({});
  const [payLoading, setPayLoading] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(
    null
  );
  const [email, setEmail] = useState('');

  const calculateSubtotal = (cartItems: any) => {
    return cartItems.reduce((total: number, item: any) => {
      return total + item?.nftTemplate?.price * item.quantity;
    }, 0);
  };

  const subtotal =
    data.state === 'success'
      ? calculateSubtotal(data.data.cartItems)
      : 0;

  useEffect(() => {
    const initializePayment = async () => {
      try {
        setLoading(true);
        setError(null);
        const { clientSecret } = await createPaymentIntent(subtotal);
        setClientSecret(clientSecret);
      } catch (err) {
        console.error('Error initializing payment:', err);
        setError(
          'Could not initialize payment. Please try again later.'
        );
      } finally {
        setLoading(false);
      }
    };

    initializePayment();
  }, [subtotal]);

  const handleUpdateQuantity = async (data: any, type: string) => {
    try {
      setLoadingStates((prev) => ({ ...prev, [data._id]: true }));

      const newQuantity =
        type === 'inc' ? data.quantity + 1 : data.quantity - 1;
      const payload = {
        cartId: data._id,
        quantity: newQuantity,
      };

      if (name) {
        await updateCartQuantity(payload, accessToken, name);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setTimeout(() => {
        setLoadingStates((prev) => ({ ...prev, [data._id]: false }));
      }, 800);
    }
  };

  const handleRemoveItem = async (id: string) => {
    try {
      setDeleteLoadingStates((prev) => ({ ...prev, [id]: true }));
      await deleteCartItem(id, accessToken, name);
    } catch (error) {
      console.error(error);
    } finally {
      setTimeout(() => {
        setDeleteLoadingStates((prev) => ({ ...prev, [id]: false }));
      }, 800);
    }
  };

  const sellerAddress =
    data?.data?.cartItems[0]?.nftTemplate?.ownerAddress;

  const handleOpenModal = () => {
    onOpen();
  };

  const formatPrice = (price: number) => {
    return `$${(price / 100).toFixed(2)}`;
  };

  const handleOpenPaymentSheet = () => {
    if (!email) {
      setErrorMessage('Please enter your email address');
      return;
    }
    setIsPaymentSheetOpen(true);
  };

  // *** NEW: Stripe Checkout Handler ***
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // Confirm the payment with the card element
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
          payment_method_data: {
            billing_details: {
              email: email,
            },
          },
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(
          error.message || 'An error occurred with your payment'
        );
        setIsPaymentSheetOpen(false);
      }
    } catch (error) {
      setErrorMessage(
        'An error occurred while processing your payment'
      );
      console.error('Payment error:', error);
      setIsPaymentSheetOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-2 w-full">
        {data.state === 'success' ? (
          <>
            {data.data.cartItems.map((item: any, index: string) => {
              const isUpdating = loadingStates[item._id];
              const isDeleting = deleteLoadingStates[item._id];

              return (
                <div
                  key={index}
                  className="bg-white shadow-medium rounded-xl w-full flex items-center gap-6 justify-between p-3 relative"
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={item?.nftTemplate?.image}
                      alt="nft image"
                      width={320}
                      height={320}
                      className="w-32 h-auto"
                    />
                    <div>
                      <p className="text-lg font-semibold mb-1">
                        {item.nftTemplate?.name}
                      </p>
                      <p>{item.nftTemplate?.price} USDC</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-black">
                    <button
                      onClick={() =>
                        handleUpdateQuantity(item, 'dec')
                      }
                      disabled={isUpdating || item.quantity === 1}
                    >
                      <CircleMinus size={20} />
                    </button>
                    <span className="w-4 flex justify-center">
                      {isUpdating ? (
                        <Loader className="animate-spin" size={20} />
                      ) : item.quantity ? (
                        item.quantity
                      ) : (
                        1
                      )}
                    </span>
                    <button
                      onClick={() =>
                        handleUpdateQuantity(item, 'inc')
                      }
                      disabled={isUpdating}
                    >
                      <CirclePlus size={20} />
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(item._id)}
                    className="absolute top-1 right-1"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader className="animate-spin" size={20} />
                    ) : (
                      <LiaTimesSolid size={18} />
                    )}
                  </button>
                </div>
              );
            })}
          </>
        ) : (
          <div className="text-lg font-semibold py-10 text-center">
            <p>No Item Found!</p>
            <p className="font-medium text-gray-600">
              Please add an item to continue
            </p>
          </div>
        )}
      </div>
      {clientSecret ? (
        <div className="bg-white w-full shadow-medium rounded-t-lg mt-10 p-3 text-gray-600 font-medium flex flex-col gap-1">
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
              },
            }}
          >
            <div className="flex items-center gap-6 justify-between">
              <p>
                Subtotal (
                {data?.data?.cartItems?.length
                  ? data.data.cartItems.length
                  : 0}{' '}
                items)
              </p>
              <p>{subtotal} USDC</p>
            </div>
            <div className="flex items-center gap-6 justify-between">
              <p>Discount Rate</p>
              <p>0 USDC</p>
            </div>
            <div className="flex items-center gap-6 justify-between text-gray-800 font-bold">
              <p>Total Amount</p>
              <p>{subtotal} USDC</p>
            </div>
            <AnimateButton
              whiteLoading={true}
              onClick={handleOpenModal}
              isDisabled={data.state !== 'success'}
              type="button"
              className={`${
                data.state === 'success'
                  ? 'bg-black'
                  : 'bg-gray-400 hover:!bg-gray-400 cursor-not-allowed'
              } text-white py-2 !border-0 w-full mt-6`}
            >
              Pay With Wallet
            </AnimateButton>
            <AnimateButton
              whiteLoading={payLoading}
              onClick={handleOpenPaymentSheet}
              isDisabled={data.state !== 'success' || payLoading}
              type="button"
              className={`w-full mt-2 ${
                data.state !== 'success' && 'cursor-not-allowed'
              }`}
            >
              Pay With Card
            </AnimateButton>
          </Elements>
        </div>
      ) : (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
          <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
            <h2 className="text-red-500 text-xl font-semibold mb-4">
              Payment Error
            </h2>
            <p className="text-gray-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Payment Sheet */}
      <Sheet
        open={isPaymentSheetOpen}
        onOpenChange={setIsPaymentSheetOpen}
      >
        <SheetContent
          side="bottom"
          className="h-[80vh] sm:max-w-full"
        >
          <SheetHeader>
            <SheetTitle>Payment</SheetTitle>
            <SheetDescription>
              Complete your purchase securely with Stripe.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <PaymentElement />
            <Button
              onClick={handleSubmit}
              disabled={!stripe || loading}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading
                ? 'Processing...'
                : `Pay ${formatPrice(subtotal)} now`}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <NftPaymentModal
        subtotal={subtotal}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        sellerAddress={sellerAddress}
      />
    </div>
  );
};

export default CartContent;
