"use client";

import {
  getDBExternalAccountInfo,
  getKycInfo,
  postExternalAccountInBridge,
  postExternalAccountInSwopDB,
} from "@/actions/bank";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { PiWalletBold } from "react-icons/pi";
import Cookies from "js-cookie";
import { v4 as uuidv4 } from "uuid";
import DynamicPrimaryBtn from "@/components/ui/Button/DynamicPrimaryBtn";
import { Loader } from "lucide-react";
import { FaArrowRightLong } from "react-icons/fa6";
import logger from "@/utils/logger";
import CustomModal from "@/components/modal/CustomModal";

interface AssetSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setSendFlow: any;
}

export default function MethodSelector({
  open,
  onOpenChange,
  setSendFlow,
}: AssetSelectorProps) {
  const [externalKycLoading, setExternalKycLoading] = useState(false);
  const [userId, setUserId] = useState("67c428364fe6a38a65a0420b");
  const [stepper, setStepper] = useState("");
  const [kycData, setKycData] = useState<any>(null);
  const [accessToken, setAccessToken] = useState("");

  //! need to on useEffect
  useEffect(() => {
    const getUserId = async () => {
      const userId = Cookies.get("user-id");
      if (userId) {
        setUserId(userId);
      }
    };
    if (window !== undefined) {
      getUserId();
    }
  }, []);

  useEffect(() => {
    const getAccessToken = async () => {
      const token = Cookies.get("access-token");
      if (token) {
        setAccessToken(token);
      }
    };
    if (window !== undefined) {
      getAccessToken();
    }
  }, []);

  const handleSelectBank = async () => {
    // if (isBankCanProceed && !loading) {
    //   setSendFlow((prev: any) => ({ ...prev, step: "bank-assets" }));
    // } else {
    //   toast.error("Please add bank account to continue.");
    // }

    try {
      if (userId) {
        const info = await getKycInfo(userId, accessToken);
        logger.log("kyc info", info);

        setKycData(info.data);
        if (info.data.kyc_status === "approved") {
          const externalDBInfo = await getDBExternalAccountInfo(
            userId,
            accessToken
          );

          logger.log("externalDBInfo", externalDBInfo);

          if (!externalDBInfo || !externalDBInfo.success) {
            return setStepper("external-not-available");
          }

          if (
            externalDBInfo &&
            externalDBInfo.success &&
            externalDBInfo.message === "Existing account information available"
          ) {
            setSendFlow((prev: any) => ({
              ...prev,
              step: "bank-assets",
            }));
          } else {
            const options = {
              method: "GET",
              headers: {
                accept: "application/json",
                "Api-Key": process.env.NEXT_PUBLIC_BRIDGE_SECRET,
              },
            };
            const response = await postExternalAccountInBridge(
              info.data.customer_id,
              options
            );
            await postExternalAccountInSwopDB(userId, response);
            setSendFlow((prev: any) => ({
              ...prev,
              step: "bank-assets",
            }));
            // setExternalAccountInfo(response);
            // setStepper("virtual-bank-account");
            // if any external account exist
            logger.log("response for external account", response);
          }
        } else {
          toast.error("First Complete kyc to continue");
        }
      }
    } catch (error) {
      logger.error("kyc db data fetching error", error);
    } finally {
    }
  };

  const handleAddExternalAccount = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setExternalKycLoading(true);
    const formData = new FormData(e.currentTarget);
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const bankName = formData.get("bankName") as string;
    const accountNumber = formData.get("accountNumber") as string;
    const routingNumber = formData.get("routingNumber") as string;
    const checkingOrSavings = formData.get("checkingOrSavings") as string;
    const accountType = formData.get("accountType") as string;
    const streetLine1 = formData.get("streetLine1") as string;
    const streetLine2 = formData.get("streetLine2") as string;
    const city = formData.get("city") as string;
    const state = formData.get("state") as string;
    const postalCode = formData.get("postalCode") as string;
    const countryCode = formData.get("countryCode") as string;
    if (!firstName) {
      return toast.error("First Name is Required!");
    }
    if (!lastName) {
      return toast.error("Last Name is Required!");
    }
    if (kycData && kycData.customer_id) {
      const options = {
        method: "POST",
        headers: {
          accept: "application/json",
          "Idempotency-Key": uuidv4(),
          "content-type": "application/json",
          "Api-Key": process.env.NEXT_PUBLIC_BRIDGE_SECRET || "",
        },
        body: JSON.stringify({
          account: {
            account_number: accountNumber,
            routing_number: routingNumber,
            checking_or_savings: checkingOrSavings,
          },
          address: {
            street_line_1: streetLine1,
            //street_line_2: streetLine2,
            city: city,
            state: state,
            postal_code: postalCode,
            country: countryCode,
          },
          currency: "usd",
          bank_name: bankName,
          account_owner_name: firstName + " " + lastName,
          account_type: "us",
          account_owner_type: accountType,
          first_name: firstName,
          last_name: lastName,
        }),
      };
      logger.log("options", options);

      try {
        const response = await postExternalAccountInBridge(
          kycData.customer_id,
          options
        );
        if (response?.code) {
          return toast.error(response?.code || "Invalid Value");
        }
        await postExternalAccountInSwopDB(userId, response);
        logger.log("respnse", response);
      } catch (error) {
        logger.error("Error in handleAddExternalAccount:", error);
      } finally {
        setExternalKycLoading(false);
      }
    }
  };

  return (
    <CustomModal width="max-w-sm" isOpen={open} onCloseModal={onOpenChange}>
      <div
        className={`p-6 pt-0 rounded-3xl ${
          stepper === "external-not-available" ? "max-w-xl" : "max-w-sm"
        }`}
      >
        {stepper === "external-not-available" ? (
          <div className="flex flex-col items-center gap-6">
            <h2 className="text-center text-lg font-semibold">
              Enter Your Bank Account Details
            </h2>

            <form onSubmit={handleAddExternalAccount} className="w-full">
              <div className="flex items-start gap-5">
                <div className="w-full flex flex-col gap-2">
                  <div className="flex flex-col items-start gap-1">
                    <label htmlFor="bankName">Bank Name</label>
                    <input
                      type="text"
                      required
                      id="bankName"
                      name="bankName"
                      placeholder="Enter Bank Name"
                      className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                    />
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <label htmlFor="firstName">First Name</label>
                    <input
                      type="text"
                      required
                      id="firstName"
                      name="firstName"
                      placeholder="Enter Last Name"
                      className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                    />
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <label htmlFor="lastName">Last Name</label>
                    <input
                      type="text"
                      required
                      id="lastName"
                      name="lastName"
                      placeholder="Enter Last Name"
                      className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                    />
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <label htmlFor="accountNumber">Account Number</label>
                    <input
                      type="text"
                      required
                      id="accountNumber"
                      name="accountNumber"
                      placeholder="Enter Account Number"
                      className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                    />
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <label htmlFor="routingNumber">Routing Number</label>
                    <input
                      type="text"
                      required
                      id="routingNumber"
                      name="routingNumber"
                      placeholder="Enter Routing Number"
                      className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                    />
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <label htmlFor="checkingOrSavings">
                      Checking or Savings
                    </label>
                    <select
                      required
                      id="checkingOrSavings"
                      name="checkingOrSavings"
                      className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl py-2.5 px-3 bg-gray-100"
                    >
                      <option value="" disabled>
                        Select Checking or Savings
                      </option>
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                    </select>
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <label htmlFor="accountType">Account Type</label>
                    <select
                      required
                      id="accountType"
                      name="accountType"
                      className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl py-2.5 px-3 bg-gray-100"
                    >
                      <option value="" disabled>
                        Select Account Type
                      </option>
                      <option value="individual">Individual</option>
                      <option value="business">Business</option>
                    </select>
                  </div>
                </div>
                <div className="w-full flex flex-col gap-2">
                  <div className="flex flex-col items-start gap-1">
                    <label htmlFor="streetLine1">Street Line 1</label>
                    <input
                      type="text"
                      required
                      id="streetLine1"
                      name="streetLine1"
                      placeholder="Enter Street Line 1"
                      className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                    />
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <label htmlFor="streetLine2">Street Line 2</label>
                    <input
                      type="text"
                      required
                      id="streetLine2"
                      name="streetLine2"
                      placeholder="Enter Street Line 2"
                      className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                    />
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <label htmlFor="city">City</label>
                    <input
                      type="text"
                      required
                      id="city"
                      name="city"
                      placeholder="Enter City"
                      className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                    />
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <label htmlFor="state">State</label>
                    <input
                      type="text"
                      required
                      id="state"
                      name="state"
                      placeholder="Enter State"
                      className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                    />
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <label htmlFor="postalCode">Postal Code</label>
                    <input
                      type="text"
                      required
                      id="postalCode"
                      name="postalCode"
                      placeholder="Enter Postal Code"
                      className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                    />
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <label htmlFor="countryCode">Country Code</label>
                    <input
                      type="text"
                      required
                      id="countryCode"
                      name="countryCode"
                      placeholder="Enter Country Code"
                      className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                    />
                  </div>
                </div>
              </div>
              <DynamicPrimaryBtn type={"submit"} className="mx-auto px-5 mt-6">
                Submit
                {externalKycLoading ? (
                  <Loader className="animate-spin" />
                ) : (
                  <FaArrowRightLong className="ml-1" />
                )}
              </DynamicPrimaryBtn>
            </form>
          </div>
        ) : (
          <div>
            <h3 className="text-xl font-semibold mb-2">Send</h3>
            <div className="flex flex-col gap-3">
              <button
                onClick={() =>
                  setSendFlow((prev: any) => ({
                    ...prev,
                    step: "assets",
                  }))
                }
                className="p-2 rounded-xl shadow-medium flex items-center gap-3 text-start"
              >
                <span className="p-3 bg-gray-200 rounded-lg">
                  <PiWalletBold />
                </span>
                <div>
                  <h2 className="font-medium">To Wallet</h2>
                  <p className="text-sm text-gray-400">
                    Send assets to crypto wallet
                  </p>
                </div>
              </button>
              <button
                onClick={handleSelectBank}
                // onClick={() =>
                //   setSendFlow((prev: any) => ({ ...prev, step: "bank-assets" }))
                // }
                className="p-2 rounded-xl shadow-medium flex items-center gap-3 text-start"
              >
                <span className="p-3 bg-gray-200 rounded-lg">
                  <PiWalletBold />
                </span>
                <div>
                  <h2 className="font-medium">To Bank</h2>
                  <p className="text-sm text-gray-400">
                    Send solana USDC to your bank
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </CustomModal>
  );
}
