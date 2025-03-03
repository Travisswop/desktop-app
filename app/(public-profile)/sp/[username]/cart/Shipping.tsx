import AnimateButton from "@/components/ui/Button/AnimateButton";
import { useUser } from "@/lib/UserContext";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { LiaFileMedicalSolid } from "react-icons/lia";
import { MdDelete } from "react-icons/md";

const PaymentShipping = ({ selectedToken, subtotal }: any) => {
  const { user } = useUser();
  const [address, setAddress] = useState("");
  console.log("usersss", user);

  useEffect(() => {
    if (user && user.address) {
      setAddress(user.address);
    }
  }, [user]);

  return (
    <div className="flex flex-col gap-2 py-4">
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Image
            src={"/astro-agent.png"}
            alt="astro"
            width={120}
            height={90}
            className="w-12 h-auto"
          />
          <div className="flex flex-col items-start">
            <p className="font-medium">Review</p>
            <p className="text-gray-500 font-medium">
              Request from{" "}
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
        <p className="text-gray-500 font-medium">Asset Change (estimate)</p>
        <p className="font-semibold">
          -USDC <span className="text-red-500">{subtotal}</span>
        </p>
      </div>
      <div className="flex items-center gap-2 justify-between">
        <p className="font-medium">Shipping Address</p>
        <input
          className="text-gray-500 font-medium border border-gray-300 rounded px-1 focus:outline-gray-200"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2 justify-between">
        <p className="font-medium">Wallet Used</p>
        <p className="text-gray-500 font-medium">N/A</p>
      </div>
      <div className="flex items-center gap-2 justify-between">
        <p className="font-medium">Network</p>
        <p className="text-gray-500 font-medium">{selectedToken.chain}</p>
      </div>
      <div className="flex items-center gap-2 justify-between">
        <p className="font-medium">Network Fee</p>
        <p className="text-gray-500 font-medium">N/A</p>
      </div>
      <div className="flex items-center gap-2 justify-between">
        <p className="font-medium">Shipping Cost</p>
        <p className="text-gray-500 font-medium">$0</p>
      </div>
      <div className="flex items-center gap-2 justify-between">
        <p className="font-medium">Total Cost</p>
        <p className="text-gray-500 font-medium">${subtotal}</p>
      </div>
      <div className="flex justify-between mt-4 gap-3">
        <AnimateButton
          whiteLoading={true}
          className="w-full"
          // isLoading={isLoading}
          //   width={"w-52"}
        >
          Cancel
        </AnimateButton>

        <AnimateButton
          whiteLoading={true}
          type="button"
          // onClick={handleDeleteIcon}
          // isLoading={isDeleteLoading}
          //   width={"w-28"}
          className="bg-black text-white py-2 !border-0 w-full"
        >
          Confirm
        </AnimateButton>
      </div>
    </div>
  );
};

export default PaymentShipping;
