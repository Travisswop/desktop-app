import React, { useEffect, useState } from "react";
import { LiaFileMedicalSolid } from "react-icons/lia";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
// import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
// import { toast } from "react-toastify";
// import { postAppIcon } from "@/actions/appIcon";
// import AnimateButton from "@/components/Button/AnimateButton";
import { postContactCard } from "@/actions/contactCard";
import { FaTimes } from "react-icons/fa";
import AnimateButton from "@/components/ui/Button/AnimateButton";
import { MdInfoOutline } from "react-icons/md";
import { Tooltip } from "@nextui-org/react";
import contactCardImg from "@/public/images/IconShop/appIconContactCard.png";
import Image from "next/image";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";
import { Loader } from "lucide-react";

const AddContactCard = ({ onCloseModal }: any) => {
  const state: any = useSmartSiteApiDataStore((state) => state); //get small icon store value
  const [token, setToken] = useState("");

  useEffect(() => {
    const getAccessToken = async () => {
      const token = Cookies.get("access-token");
      setToken(token || "");
    };
    getAccessToken();
  }, []);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>({});

  const handleContactFormData = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const contactCardInfo = {
      micrositeId: state._id,
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
        const data = await postContactCard(contactCardInfo, token);
        if ((data.state = "success")) {
          toast.success("Contact card created successfully");
          onCloseModal();
        } else {
          toast.error("Something went wrong");
        }
      } catch (error) {
        console.error(error);
        toast.error("Something went wrong");
      } finally {
        setIsLoading(false);
      }
    }
  };

  // useEffect(() => {
  //   handleRemoveIcon("Info Bar");
  // }, []); // don't add any dependencies here

  // console.log("smartSiteData", state);
  // console.log("sesstionState", sesstionState);

  return (
    <div className="relative flex flex-col gap-4">
      <div className="flex items-end gap-1 justify-center">
        <h2 className="font-semibold text-gray-700 text-xl text-center">
          Contact Card
        </h2>
        <div className="translate-y-0.5">
          <Tooltip
            size="sm"
            content={
              <span className="font-medium">
                {`Let's people download your contact card to their phone in a click`}
              </span>
            }
            className={`max-w-40 h-auto`}
          >
            <button>
              <MdInfoOutline />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="flex justify-center">
        <Image src={contactCardImg} alt="contact card" className="w-16" />
      </div>

      <div>
        <form
          onSubmit={handleContactFormData}
          className="flex flex-col gap-2.5"
        >
          <div className="flex flex-col gap-[2px]">
            <label htmlFor="name" className="font-medium">
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
            <label htmlFor="phone" className="font-medium">
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
            <label htmlFor="email" className="font-medium">
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
            <label htmlFor="address" className="font-medium">
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
            <label htmlFor="website" className="font-medium">
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
          <PrimaryButton className="w-full py-3">
            {isLoading ? (
              <Loader className="w-8 h-8 animate-spin mx-auto" />
            ) : (
              "Save"
            )}
          </PrimaryButton>
        </form>
      </div>
    </div>
  );
};

export default AddContactCard;
