"use client";
import { deleteCartItem, updateCartQuantity } from "@/actions/addToCartActions";
import NftPaymentModal from "@/components/modal/NftPayment";
import AnimateButton from "@/components/ui/Button/AnimateButton";
import { useDisclosure } from "@nextui-org/react";
// import { usePrivy } from "@privy-io/react-auth";
import { CircleMinus, CirclePlus, Loader } from "lucide-react"; // Import Loader2 for a spinner
import Image from "next/image";
import { useParams } from "next/navigation";
import React, { useState } from "react";
import { LiaTimesSolid } from "react-icons/lia";

const CartContent = ({ data, accessToken }: any) => {
  // const { authenticated } = usePrivy();
  const params = useParams();
  const name: any = params.username; // This will be "testh63s"
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  // const router = useRouter();

  // State to track loading for each item (for quantity updates)
  const [loadingStates, setLoadingStates] = useState<{
    [key: string]: boolean;
  }>({});

  // State to track loading for each item (for delete actions)
  const [deleteLoadingStates, setDeleteLoadingStates] = useState<{
    [key: string]: boolean;
  }>({});

  // console.log("authendndndnd", authenticated);

  // if (!authenticated) {
  //   router.push("/login");
  // }

  // useEffect(() => {
  //   if (!authenticated) {
  //     router.push("/login");
  //   }
  // }, [authenticated, router]);

  // Function to calculate subtotal
  const calculateSubtotal = (cartItems: any) => {
    return cartItems.reduce((total: number, item: any) => {
      return total + item.nftTemplate.price * item.quantity;
    }, 0);
  };

  const handleUpdateQuantity = async (data: any, type: string) => {
    try {
      // Set loading state for this item
      setLoadingStates((prev) => ({ ...prev, [data._id]: true }));

      const newQuantity =
        type === "inc" ? data.quantity + 1 : data.quantity - 1;
      const payload = {
        cartId: data._id,
        quantity: newQuantity,
      };

      if (name) {
        const response = await updateCartQuantity(payload, accessToken, name);
        console.log("response for update", response);

        // Handle success (e.g., update the UI or state)
      }
    } catch (error) {
      console.log(error, "error is");
    } finally {
      // Reset loading state for this item
      setTimeout(() => {
        setLoadingStates((prev) => ({ ...prev, [data._id]: false }));
      }, 800);
    }
  };

  const handleRemoveItem = async (id: string) => {
    try {
      // Set loading state for this item
      setDeleteLoadingStates((prev) => ({ ...prev, [id]: true }));

      await deleteCartItem(id, accessToken, name);

      // Handle success (e.g., remove the item from the UI or state)
    } catch (error) {
      console.log(error);
    } finally {
      setTimeout(() => {
        setDeleteLoadingStates((prev) => ({ ...prev, [id]: false }));
      }, 800);
    }
  };

  // Calculate subtotal
  const subtotal =
    data.state === "success" ? calculateSubtotal(data.data.cartItems) : 0;

  // const sendWalletTransaction = async () => {
  //   const recipientWallet = '4VoKLfzZNKQfmvitteM6ywtNNrdcikGuevkaTY1REhmN';
  //   const totalPriceinSol =
  //     Number(productData?.totalCost) / Number(sol_price_usd);
  //   const txHash = await sendSol(
  //     recipientWallet,
  //     totalPriceinSol,
  //     solWallet?.publicKey,
  //     solWallet,
  //   );
  //   return txHash;
  // };

  const handleOpenModal = () => {
    onOpen();
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-2 w-full">
        {data.state === "success" ? (
          <>
            {data.data.cartItems.map((data: any, index: string) => {
              const isUpdating = loadingStates[data._id]; // Loading state for quantity updates
              const isDeleting = deleteLoadingStates[data._id]; // Loading state for delete action

              return (
                <div
                  key={index}
                  className="bg-white shadow-medium rounded-xl w-full flex items-center gap-6 justify-between p-3 relative"
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={data.nftTemplate.image}
                      alt="nft image"
                      width={320}
                      height={320}
                      className="w-32 h-auto"
                    />
                    <div>
                      <p className="text-lg font-semibold mb-1">
                        {data.nftTemplate.name}
                      </p>
                      <p>{data.nftTemplate.price} USDC</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-black">
                    {/* Minus Button */}
                    <button
                      onClick={() => handleUpdateQuantity(data, "dec")}
                      disabled={isUpdating || data.quantity == 1} // Disable button when updating or quantity is 1
                    >
                      <CircleMinus size={20} />
                    </button>

                    {/* Quantity Display */}
                    <span className="w-4 flex justify-center">
                      {isUpdating ? (
                        <Loader className="animate-spin" size={20} />
                      ) : data.quantity ? (
                        data.quantity
                      ) : (
                        1
                      )}
                    </span>

                    {/* Plus Button */}
                    <button
                      onClick={() => handleUpdateQuantity(data, "inc")}
                      disabled={isUpdating} // Disable button when updating
                    >
                      <CirclePlus size={20} />
                    </button>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleRemoveItem(data._id)}
                    className="absolute top-1 right-1"
                    disabled={isDeleting} // Disable button when deleting
                  >
                    {isDeleting ? (
                      <Loader className="animate-spin" size={20} /> // Show spinner when deleting
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
            <p> No Item Found!</p>
            <p className="font-medium text-gray-600">
              Please add a item to continue
            </p>
          </div>
        )}
      </div>
      <div className="bg-white w-full shadow-medium rounded-t-lg mt-10 p-3 text-gray-600 font-medium flex flex-col gap-1">
        <div className="flex items-center gap-6 justify-between">
          <p>
            Subtotal (
            {data?.data?.cartItems?.length ? data?.data?.cartItems?.length : 0}{" "}
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
          isDisabled={data.state !== "success"}
          type="button"
          className={`${
            data.state === "success"
              ? "bg-black"
              : "bg-gray-400 hover:!bg-gray-400 cursor-not-allowed"
          } text-white py-2 !border-0 w-full mt-6`}
        >
          Pay With Wallet
        </AnimateButton>
        <AnimateButton
          whiteLoading={true}
          isDisabled={data.state !== "success"}
          type="button"
          className={`${
            data.state !== "success" && "cursor-not-allowed"
          } w-full mt-2`}
        >
          Pay With Card
        </AnimateButton>
      </div>
      {/* modal here */}
      <NftPaymentModal
        subtotal={subtotal}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
      />
    </div>
  );
};

export default CartContent;
