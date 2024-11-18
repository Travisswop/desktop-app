import React, { useState } from "react";
import { LiaFileMedicalSolid } from "react-icons/lia";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
import { toast } from "react-toastify";
import AnimateButton from "@/components/Button/AnimateButton";
import { isENSAvailable, postMessage } from "@/actions/message";
import { FaTimes } from "react-icons/fa";
import Image from "next/image";

const AddFeed = ({ handleRemoveIcon }: any) => {
  const state: any = useSmartSiteApiDataStore((state) => state); //get small icon store value
  const sesstionState = useLoggedInUserStore((state) => state.state.user); //get session value

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>({});

  const handleFormSubmit = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const submitInfo = {
      micrositeId: state.data._id,
      domain: formData.get("ensName"),
    };
  };

  return (
    <div className="bg-white rounded-xl shadow-small p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <h1 className="text-lg font-semibold">Feed Embed</h1>
          <Image
            src={"/images/feed.png"}
            alt="feed"
            width={60}
            height={60}
            className="w-6 h-auto"
          />
        </div>
        <button type="button" onClick={() => handleRemoveIcon("Feed")}>
          <FaTimes size={20} />
        </button>
      </div>

      <div className="flex items-center justify-center ">
        <p>Coming Soon..</p>
        {/* <form onSubmit={handleFormSubmit} className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-[2px]">
            <label htmlFor="ensName" className="font-semibold text-gray-700">
              ENS Name<span className="text-red-600 font-medium">*</span>
            </label>
            <input
              type="text"
              id="ensName"
              name="ensName"
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
              placeholder="example.swop.id"
              //   required
            />
            {error.ensName && (
              <p className="text-sm text-red-600">{error.ensName}</p>
            )}
          </div>
          <div className="flex justify-end mt-3">
            <AnimateButton isLoading={isLoading} width={"w-52"}>
              <LiaFileMedicalSolid size={20} />
              Save Changes
            </AnimateButton>
          </div>
        </form> */}
      </div>
    </div>
  );
};

export default AddFeed;
