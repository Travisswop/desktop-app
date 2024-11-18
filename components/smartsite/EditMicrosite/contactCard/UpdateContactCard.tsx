import React, { useState, useRef } from "react";
import { LiaFileMedicalSolid } from "react-icons/lia";
import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
import { toast } from "react-toastify";
import { FaTimes } from "react-icons/fa";
import AnimateButton from "@/components/Button/AnimateButton";
import { handleDeleteAppIcon } from "@/actions/appIcon";
import {
  handleDeleteContactCard,
  updateContactCard,
} from "@/actions/contactCard";
import { MdDelete } from "react-icons/md";

const UpdateContactCard = ({ iconDataObj, isOn, setOff }: any) => {
  const sesstionState = useLoggedInUserStore((state) => state.state.user); //get session value

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>({});

  const modalRef = useRef<HTMLDivElement>(null);

  const handleContactCard = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const contactCardInfo = {
      _id: iconDataObj.data._id,
      micrositeId: iconDataObj.data.micrositeId,
      name: formData.get("name"),
      mobileNo: formData.get("phone"),
      email: formData.get("email"),
      address: formData.get("address"),
      websiteUrl: formData.get("website"),
    };

    let errors = {};

    if (!contactCardInfo.name) {
      errors = { ...errors, name: "Name is required" };
    }
    if (!contactCardInfo.mobileNo) {
      errors = { ...errors, mobileNo: "Mobile number is required" };
    }
    if (!contactCardInfo.email) {
      errors = { ...errors, email: "Email is required" };
    }

    if (Object.keys(errors).length > 0) {
      setError(errors);
      setIsLoading(false);
    } else {
      setError("");
      // console.log("contactCardInfo", contactCardInfo);

      try {
        const data = await updateContactCard(
          contactCardInfo,
          sesstionState.accessToken
        );
        if (data.state === "success") {
          setOff();
          toast.success("Contact card updated successfully");
        } else {
          toast.error("Something went wrong");
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const closeModal = () => {
    setOff();
  };

  const handleBackdropClick = (e: any) => {
    if (
      e.target.classList.contains("backdrop") &&
      !e.target.closest(".modal-content")
    ) {
      closeModal();
    }
  };

  const handleDeleteIcon = async () => {
    setIsDeleteLoading(true);
    const submitData = {
      _id: iconDataObj.data._id,
      micrositeId: iconDataObj.data.micrositeId,
    };
    try {
      const data: any = await handleDeleteContactCard(
        submitData,
        sesstionState.accessToken
      );

      if (data && data?.state === "success") {
        toast.success("Contact card deleted successfully");
        setOff();
      } else {
        toast.error("Something went wrong");
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
            className="modal-content h-max w-96 lg:w-[40rem] bg-white relative rounded-xl"
          >
            <button
              className="btn btn-sm btn-circle absolute right-4 top-[12px]"
              onClick={closeModal}
            >
              <FaTimes color="gray" />
            </button>
            <div className="bg-white rounded-xl shadow-small p-7 flex flex-col gap-4">
              <h1 className="text-lg font-semibold">Contact Card</h1>
              <div>
                <form
                  onSubmit={handleContactCard}
                  className="flex flex-col gap-2.5"
                >
                  <div className="flex flex-col gap-[2px]">
                    <label
                      htmlFor="name"
                      className="font-semibold text-gray-700"
                    >
                      Name<span className="text-red-600 font-medium">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      defaultValue={iconDataObj.data.name}
                      className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
                      placeholder="Example Name"
                    />
                    {error.name && (
                      <p className="text-sm text-red-600">{error.name}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-[2px]">
                    <label
                      htmlFor="phone"
                      className="font-semibold text-gray-700"
                    >
                      Phone Number
                      <span className="text-red-600 font-medium">*</span>
                    </label>
                    <input
                      type="text"
                      name="phone"
                      id="phone"
                      defaultValue={iconDataObj.data.mobileNo}
                      className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
                      placeholder="+0135 678 90"
                    />
                    {error.mobileNo && (
                      <p className="text-sm text-red-600">{error.mobileNo}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-[2px]">
                    <label
                      htmlFor="email"
                      className="font-semibold text-gray-700"
                    >
                      Email<span className="text-red-600 font-medium">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      defaultValue={iconDataObj.data.email}
                      className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
                      placeholder="email@swop.com"
                    />
                    {error.email && (
                      <p className="text-sm text-red-600">{error.email}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-[2px]">
                    <label
                      htmlFor="address"
                      className="font-semibold text-gray-700"
                    >
                      Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      id="address"
                      defaultValue={iconDataObj.data.address}
                      className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
                      placeholder="email@swop.com"
                    />
                  </div>
                  <div className="flex flex-col gap-[2px]">
                    <label
                      htmlFor="website"
                      className="font-semibold text-gray-700"
                    >
                      Website
                    </label>
                    <input
                      type="text"
                      name="website"
                      id="website"
                      defaultValue={iconDataObj.data.websiteUrl}
                      className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
                      placeholder="email@swop.com"
                    />
                  </div>
                  <div className="flex justify-between mt-6">
                    <AnimateButton isLoading={isLoading} width={"w-52"}>
                      <LiaFileMedicalSolid size={20} />
                      Update Changes
                    </AnimateButton>

                    <AnimateButton
                      type="button"
                      onClick={handleDeleteIcon}
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
        </div>
      )}
    </>
  );
};

export default UpdateContactCard;
