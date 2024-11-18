import React, { useState } from "react";
import { LiaFileMedicalSolid } from "react-icons/lia";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
import { toast } from "react-toastify";
import AnimateButton from "@/components/Button/AnimateButton";
import { isENSAvailable, postMessage } from "@/actions/message";
import { FaTimes } from "react-icons/fa";

const AddMessage = ({ handleRemoveIcon }: any) => {
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

    let errors = {};

    if (!submitInfo.domain) {
      errors = { ...errors, domain: "ENS domain is required" };
    }

    if (Object.keys(errors).length > 0) {
      setError(errors);
      setIsLoading(false);
    } else {
      setError("");
      try {
        const isAvailable = await isENSAvailable(
          submitInfo.domain,
          sesstionState.accessToken
        );
        // console.log("isAvailable", isAvailable);

        if (isAvailable?.message === "Name not found") {
          return toast.error("ENS name not found");
        }

        const data = await postMessage(submitInfo, sesstionState.accessToken);
        if ((data.state = "success")) {
          toast.success("Successfully created");
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

  return (
    <div className="bg-white rounded-xl shadow-small p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Message</h1>
        <button type="button" onClick={() => handleRemoveIcon("Message")}>
          <FaTimes size={20} />
        </button>
      </div>

      <div>
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-2.5">
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
        </form>
      </div>
    </div>
  );
};

export default AddMessage;
