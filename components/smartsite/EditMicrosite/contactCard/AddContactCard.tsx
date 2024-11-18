import React, { useState } from "react";
import { LiaFileMedicalSolid } from "react-icons/lia";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
import { toast } from "react-toastify";
import { postAppIcon } from "@/actions/appIcon";
import AnimateButton from "@/components/Button/AnimateButton";
import { postContactCard } from "@/actions/contactCard";
import { FaTimes } from "react-icons/fa";

const AddContactCard = ({ handleRemoveIcon }: any) => {
  const state: any = useSmartSiteApiDataStore((state) => state); //get small icon store value
  const sesstionState = useLoggedInUserStore((state) => state.state.user); //get session value

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>({});

  //   console.log("error", error);

  const handleContactFormData = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const contactCardInfo = {
      micrositeId: state.data._id,
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
        const data = await postContactCard(
          contactCardInfo,
          sesstionState.accessToken
        );
        if ((data.state = "success")) {
          toast.success("contact card created successfully");
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
        <h1 className="text-lg font-semibold">Contact Card</h1>
        <button type="button" onClick={() => handleRemoveIcon("Contact Card")}>
          <FaTimes size={20} />
        </button>
      </div>

      <div>
        <form
          onSubmit={handleContactFormData}
          className="flex flex-col gap-2.5"
        >
          <div className="flex flex-col gap-[2px]">
            <label htmlFor="name" className="font-semibold text-gray-700">
              Name<span className="text-red-600 font-medium">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
              placeholder="Example Name"
              //   required
            />
            {error.name && <p className="text-sm text-red-600">{error.name}</p>}
          </div>
          <div className="flex flex-col gap-[2px]">
            <label htmlFor="phone" className="font-semibold text-gray-700">
              Phone Number<span className="text-red-600 font-medium">*</span>
            </label>
            <input
              type="text"
              name="phone"
              id="phone"
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
              placeholder="+0135 678 90"
              //   required
            />
            {error.mobileNo && (
              <p className="text-sm text-red-600">{error.mobileNo}</p>
            )}
          </div>
          <div className="flex flex-col gap-[2px]">
            <label htmlFor="email" className="font-semibold text-gray-700">
              Email<span className="text-red-600 font-medium">*</span>
            </label>
            <input
              type="email"
              name="email"
              id="email"
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
              placeholder="email@swop.com"
              //   required
            />
            {error.email && (
              <p className="text-sm text-red-600">{error.email}</p>
            )}
          </div>
          <div className="flex flex-col gap-[2px]">
            <label htmlFor="address" className="font-semibold text-gray-700">
              Address
            </label>
            <input
              type="text"
              name="address"
              id="address"
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
              placeholder="email@swop.com"
              //   required
            />
          </div>
          <div className="flex flex-col gap-[2px]">
            <label htmlFor="website" className="font-semibold text-gray-700">
              Website
            </label>
            <input
              type="text"
              name="website"
              id="website"
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
              placeholder="email@swop.com"
              //   required
            />
          </div>
          <div className="flex justify-end mt-3">
            <AnimateButton isLoading={isLoading} width={"w-40"}>
              <LiaFileMedicalSolid size={20} />
              Save
            </AnimateButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddContactCard;
