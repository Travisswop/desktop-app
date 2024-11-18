import React, { useState } from "react";
import { LiaFileMedicalSolid } from "react-icons/lia";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
import { toast } from "react-toastify";
import AnimateButton from "@/components/Button/AnimateButton";
import { postReferral } from "@/actions/referral";
import { FaTimes } from "react-icons/fa";

const AddReferral = ({ handleRemoveIcon }: any) => {
  const state: any = useSmartSiteApiDataStore((state) => state); //get small icon store value
  const sesstionState = useLoggedInUserStore((state) => state.state.user); //get session value

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>({});

  //   console.log("error", error);

  const handleFormSubmit = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const submitInfo = {
      micrositeId: state.data._id,
      buttonName: formData.get("buttonName"),
      referralCode: formData.get("referralCode"),
      description: formData.get("description"),
    };

    let errors = {};

    if (!submitInfo.buttonName) {
      errors = { ...errors, buttonName: "Button name is required" };
    }
    if (!submitInfo.referralCode) {
      errors = { ...errors, referralCode: "Referral code is required" };
    }
    if (!submitInfo.description) {
      errors = { ...errors, description: "Description is required" };
    }

    if (Object.keys(errors).length > 0) {
      setError(errors);
      setIsLoading(false);
    } else {
      setError("");
      // console.log("contactCardInfo", submitInfo);

      try {
        const data = await postReferral(submitInfo, sesstionState.accessToken);
        if ((data.state = "success")) {
          toast.success("referral created successfully");
        } else {
          toast.error("something went wrong");
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // console.log("smartSiteData", state);
  // console.log("sesstionState", sesstionState);

  return (
    <div className="bg-white rounded-xl shadow-small p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Referral</h1>
        <button type="button" onClick={() => handleRemoveIcon("Referral")}>
          <FaTimes size={20} />
        </button>
      </div>

      <div>
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-[2px]">
            <label htmlFor="buttonName" className="font-semibold text-gray-700">
              Button Name<span className="text-red-600 font-medium">*</span>
            </label>
            <input
              type="text"
              id="buttonName"
              name="buttonName"
              defaultValue={"My Referral"}
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
              placeholder="Enter button name"
              //   required
            />
            {error.buttonName && (
              <p className="text-sm text-red-600">{error.buttonName}</p>
            )}
          </div>
          <div className="flex flex-col gap-[2px]">
            <label
              htmlFor="referralCode"
              className="font-semibold text-gray-700"
            >
              Your Referral Code
              <span className="text-red-600 font-medium">*</span>
            </label>
            <input
              type="text"
              id="referralCode"
              name="referralCode"
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
              placeholder="Enter referral code"
              //   required
            />
            {error.referralCode && (
              <p className="text-sm text-red-600">{error.referralCode}</p>
            )}
          </div>
          <div className="flex flex-col gap-[2px]">
            <label
              htmlFor="description"
              className="font-semibold text-gray-700"
            >
              Description<span className="text-red-600 font-medium">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
              placeholder="Enter description"
              //   required
            />
            {error.description && (
              <p className="text-sm text-red-600">{error.description}</p>
            )}
          </div>
          <div className="flex justify-end mt-3">
            <AnimateButton isLoading={isLoading} width={"w-52"}>
              <LiaFileMedicalSolid size={20} />
              Save Changes
            </AnimateButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddReferral;
