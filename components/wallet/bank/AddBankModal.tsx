import {
  getKycInfo,
  getKycInfoFromBridge,
  postKycInBridge,
  saveQycInfoToSwopDB,
} from "@/actions/bank";
import DynamicPrimaryBtn from "@/components/ui/Button/DynamicPrimaryBtn";
import { Modal, ModalBody, ModalContent, Spinner } from "@nextui-org/react";
import { Loader } from "lucide-react";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AiOutlineBank } from "react-icons/ai";
import { FaPlus } from "react-icons/fa";
import { FaArrowRightLong } from "react-icons/fa6";
import { v4 as uuidv4 } from "uuid";

const AddBankModal = ({ bankShow, setBankShow }: any) => {
  const [stepper, setStepper] = useState("bank-account");
  const [kycLoading, setKycLoading] = useState(false);
  const [externalKycLoading, setExternalKycLoading] = useState(false);
  const [kycUrl, setKycUrl] = useState<string | null>(null);
  const [agreementUrl, setAgreementUrl] = useState<string | null>(null);
  const [kycData, setKycData] = useState<any>(null);
  const [kycDataFetchLoading, setKycDataFetchLoading] =
    useState<boolean>(false);

  console.log(
    "kyc url with agreement122222:",
    agreementUrl + "&redirect-uri=" + kycUrl
  );

  const handleAddBank = () => {
    setStepper("bank-account-details");
  };

  // const handleRedirectKyc = () => {

  // };

  useEffect(() => {
    const getKycData = async () => {
      try {
        setKycDataFetchLoading(true);
        const info = await getKycInfo();
        console.log("info ", info);
        if (info.success && info.message === "KYC information available") {
          setKycData(info.data);
          if (info.data.kyc_status !== "approved") {
            const options = {
              method: "GET",
              headers: {
                accept: "application/json",
                "content-type": "application/json",
                "Api-Key": process.env.NEXT_PUBLIC_BRIDGE_SECRET,
              },
            };

            const bridgeInfo = await getKycInfoFromBridge(
              options,
              info.data.id
            );

            console.log("bridgeInfo123", bridgeInfo);

            if (info.data.kyc_status !== bridgeInfo.kyc_status) {
              console.log("hiittt");

              await saveQycInfoToSwopDB(bridgeInfo);
              setKycData(bridgeInfo);
            }
          }
        }
      } catch (error) {
        console.log("kyc db data fetching error", error);
      } finally {
        setKycDataFetchLoading(false);
      }
    };
    getKycData();
  }, []);

  const handleKycLink = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const email = formData.get("email") as string;
    const accountType = formData.get("accountType") as string;

    if (!firstName) {
      return toast.error("First Name is Required!");
    }
    if (!lastName) {
      return toast.error("Last Name is Required!");
    }
    if (!email) {
      return toast.error("Email is Required!");
    }
    if (!accountType) {
      return toast.error("Please select account type");
    }

    const options = {
      method: "POST",
      headers: {
        accept: "application/json",
        "Idempotency-Key": uuidv4(),
        "Content-Type": "application/json",
        "Api-Key": process.env.NEXT_PUBLIC_BRIDGE_SECRET || "", // Ensure the environment variable is correctly named
      },
      body: JSON.stringify({
        type: accountType,
        full_name: `${firstName} ${lastName}`,
        email: email,
        redirect_uri: "https://swopme.app",
      }),
    };

    setKycLoading(true);

    try {
      const data = await postKycInBridge(options);
      console.log("data for kyc", data);

      if (data.code && data.code === "invalid_parameters") {
        toast.error("Invalid data, Please submit valid information!");
        return;
      }

      if (data?.kyc_link && data?.tos_link) {
        await saveQycInfoToSwopDB(data); // Ensure this function is defined
        setKycUrl(data.kyc_link);
        setAgreementUrl(data.tos_link);
        setStepper("kyc-success"); // Add a new step for KYC success
        window.open(data.tos_link + "&redirect_uri=" + data.kyc_link, "_blank");

        // router.push(data.kyc_link + "&redirect-uri=" + data.tos_link);
      } else if (data?.existing_kyc_link?.kyc_link) {
        await saveQycInfoToSwopDB(data.existing_kyc_link); // Ensure this function is defined
        // await dispatch({
        //   type: SEND_PARENT_PROFILE_INFO,
        //   payload: { data: { ...user_Data.data, kyc: data } },
        // });
        setKycUrl(data.existing_kyc_link.kyc_link);
        setAgreementUrl(data.existing_kyc_link.tos_link);
        setStepper("kyc-success"); // Add a new step for KYC success
        window.open(
          data.existing_kyc_link.tos_link +
            "&redirect_uri=" +
            data.existing_kyc_link.kyc_link,
          "_blank"
        );
      }
    } catch (err) {
      console.error("Error fetching KYC link:", err);
      toast.error("An error occurred while processing your request.");
    } finally {
      setKycLoading(false);
    }
  };

  const handleExternalKycLink = () => {
    console.log("external kyc link");
  };

  return (
    <div>
      <Modal
        size={
          stepper === "bank-account-details" ||
          stepper === "external-account-details"
            ? "2xl"
            : "md"
        }
        isOpen={bankShow}
        onOpenChange={setBankShow}
      >
        <ModalContent>
          <div className="w-full">
            <ModalBody className="text-center text-gray-700 py-6">
              {stepper === "bank-account" && (
                <div>
                  {kycDataFetchLoading ? (
                    <div className="h-[14.5rem] flex items-center justify-center">
                      <Spinner />
                    </div>
                  ) : (
                    <div>
                      {kycData ? (
                        <div className="text-center">
                          <h2 className="text-start text-lg font-semibold mb-2">
                            Bank Account
                          </h2>
                          <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center gap-3">
                            <div className="w-11 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                              <AiOutlineBank size={20} />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <p className="font-semibold">
                                Status:{" "}
                                <span
                                  className={`capitalize ${
                                    kycData?.kyc_status === "not_started" ||
                                    kycData?.kyc_status === "rejected"
                                      ? "text-red-600"
                                      : kycData?.kyc_status === "approved"
                                      ? "text-green-600"
                                      : "text-yellow-600"
                                  }`}
                                >
                                  {kycData?.kyc_status}
                                </span>
                              </p>

                              <p className="text-gray-400">
                                {kycData.kyc_status === "rejected"
                                  ? kycData?.rejection_reasons[0]?.reason
                                  : "KYC verification is required to proceed."}
                              </p>
                            </div>
                          </div>
                          <a
                            href={`${kycData?.tos_link}&redirect_uri=${kycData?.kyc_link}`}
                            target="_blank"
                          >
                            <DynamicPrimaryBtn
                              // onClick={handleRedirectKyc}
                              className="mx-auto mt-3"
                            >
                              {kycData.kyc_status === "rejected"
                                ? "Resubmit"
                                : "Complete KYC"}
                              {/* <Loader className="animate-spin" /> */}
                              <FaArrowRightLong className="ml-1" />
                            </DynamicPrimaryBtn>
                          </a>
                        </div>
                      ) : (
                        <div className="text-center">
                          <h2 className="text-start text-lg font-semibold mb-2">
                            Bank Account
                          </h2>
                          <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center gap-3">
                            <div className="w-11 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                              <AiOutlineBank size={20} />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <p className="font-semibold">Add bank account</p>
                              <p className="text-gray-400">
                                You have no added bank account yet
                              </p>
                            </div>
                          </div>
                          <DynamicPrimaryBtn
                            onClick={handleAddBank}
                            className="mx-auto mt-3"
                          >
                            <FaPlus className="mr-1" />
                            Add Bank Account
                          </DynamicPrimaryBtn>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {stepper === "bank-account-details" && (
                <div className="flex flex-col items-center gap-6">
                  <h2 className="text-center text-lg font-semibold">
                    Enter Your Bank Account Details
                  </h2>

                  <form onSubmit={handleKycLink} className="w-full">
                    <div className="flex items-start gap-5">
                      <div className="w-full flex flex-col gap-2">
                        <div className="flex flex-col items-start gap-1">
                          <label htmlFor="firstName">
                            First Name<span className="text-red-600">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            id="firstName"
                            name="firstName"
                            placeholder="Enter First Name"
                            className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                          />
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <label htmlFor="email">
                            Email<span className="text-red-600">*</span>
                          </label>
                          <input
                            type="email"
                            required
                            id="email"
                            name="email"
                            placeholder="Enter Email"
                            className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                          />
                        </div>
                      </div>
                      <div className="w-full flex flex-col gap-2">
                        <div className="flex flex-col items-start gap-1">
                          <label htmlFor="lastName">
                            Last Name<span className="text-red-600">*</span>
                          </label>
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
                          <label htmlFor="accountType">
                            Select Account Type
                            <span className="text-red-600">*</span>
                          </label>
                          <select
                            required
                            id="accountType"
                            name="accountType"
                            className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl py-2.5 px-3 bg-gray-100"
                          >
                            <option value="" disabled>
                              Select Account Type
                            </option>
                            <option value="individual">
                              Individual Account
                            </option>
                            <option value="business">Business Account</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <DynamicPrimaryBtn
                      type={"submit"}
                      className="mx-auto px-9 mt-6"
                    >
                      Next Step
                      {kycLoading ? (
                        <Loader className="animate-spin" />
                      ) : (
                        <FaArrowRightLong className="ml-1" />
                      )}
                    </DynamicPrimaryBtn>
                  </form>
                </div>
              )}
              {stepper === "external-account-details" && (
                <div className="flex flex-col items-center gap-6">
                  <h2 className="text-center text-lg font-semibold">
                    Enter Your Bank Account Details
                  </h2>

                  <form onSubmit={handleExternalKycLink} className="w-full">
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
                    <DynamicPrimaryBtn
                      type={"submit"}
                      className="mx-auto px-5 mt-6"
                    >
                      Submit
                      {externalKycLoading ? (
                        <Loader className="animate-spin" />
                      ) : (
                        <FaArrowRightLong className="ml-1" />
                      )}
                    </DynamicPrimaryBtn>
                  </form>
                </div>
              )}
            </ModalBody>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default AddBankModal;
