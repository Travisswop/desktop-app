import React, { useRef, useState } from "react";
import { LiaFileMedicalSolid } from "react-icons/lia";
import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
import { toast } from "react-toastify";
import { FaTimes } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import AnimateButton from "@/components/Button/AnimateButton";
import { deleteReferral, updateReferral } from "@/actions/referral";

const UpdateReferral = ({ iconDataObj, isOn, setOff }: any) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>({});
  const [isDeleteLoading, setIsDeleteLoading] = useState<boolean>(false);

  const sesstionState = useLoggedInUserStore((state) => state.state.user); //get session value

  //   console.log("error", error);

  const handleFormSubmit = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const submitInfo = {
      _id: iconDataObj.data._id,
      micrositeId: iconDataObj.data.micrositeId,
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
        const data = await updateReferral(
          submitInfo,
          sesstionState.accessToken
        );
        if ((data.state = "success")) {
          setOff();
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

  // Function to close the modal
  const closeModal = () => {
    setOff();
  };
  // Function to handle click on the backdrop
  const handleBackdropClick = (e: any) => {
    if (
      e.target.classList.contains("backdrop") &&
      !e.target.closest(".modal-content")
    ) {
      closeModal();
    }
  };

  const handleDelete = async () => {
    setIsDeleteLoading(true);
    const submitData = {
      _id: iconDataObj.data._id,
      micrositeId: iconDataObj.data.micrositeId,
    };
    try {
      const data: any = await deleteReferral(
        submitData,
        sesstionState.accessToken
      );
      // console.log("data,", data);

      if (data && data?.state === "success") {
        setOff();
        toast.success("referral deleted successfully");
      } else {
        toast.error("something went wrong");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleteLoading(false);
    }
  };

  return (
    <>
      {isOn && (
        <div
          className="fixed z-50 left-0 top-0 h-full w-full overflow-auto flex items-center justify-center bg-overlay/50 backdrop"
          onMouseDown={handleBackdropClick}
        >
          <div
            ref={modalRef}
            className="modal-content h-max w-96 lg:w-[40rem] bg-white relative rounded-xl p-7"
          >
            <button
              className="btn btn-sm btn-circle absolute right-4 top-[12px]"
              onClick={closeModal}
            >
              <FaTimes color="gray" />
            </button>
            <h1 className="text-lg font-semibold mb-2">Referral</h1>
            <div>
              <form
                onSubmit={handleFormSubmit}
                className="flex flex-col gap-2.5"
              >
                <div className="flex flex-col gap-[2px]">
                  <label
                    htmlFor="buttonName"
                    className="font-semibold text-gray-700"
                  >
                    Button Name
                    <span className="text-red-600 font-medium">*</span>
                  </label>
                  <input
                    type="text"
                    id="buttonName"
                    name="buttonName"
                    defaultValue={iconDataObj.data.buttonName}
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
                    defaultValue={iconDataObj.data.referralCode}
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
                    Description
                    <span className="text-red-600 font-medium">*</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    defaultValue={iconDataObj.data.description}
                    className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
                    placeholder="Enter description"
                    //   required
                  />
                  {error.description && (
                    <p className="text-sm text-red-600">{error.description}</p>
                  )}
                </div>
                <div className="flex justify-between mt-3">
                  <AnimateButton isLoading={isLoading} width={"w-52"}>
                    <LiaFileMedicalSolid size={20} />
                    Update Changes
                  </AnimateButton>
                  <AnimateButton
                    type="button"
                    onClick={handleDelete}
                    isLoading={isDeleteLoading}
                    width={"w-28"}
                  >
                    <MdDelete size={20} /> Delete
                  </AnimateButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UpdateReferral;
