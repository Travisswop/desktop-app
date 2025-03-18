import DynamicPrimaryBtn from "@/components/ui/Button/DynamicPrimaryBtn";
import { Modal, ModalBody, ModalContent } from "@nextui-org/react";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { AiOutlineBank } from "react-icons/ai";
import { FaPlus } from "react-icons/fa";
import { v4 as uuidv4 } from "uuid";

const AddBankModal = ({ bankShow, setBankShow }: any) => {
  const [stepper, setStepper] = useState("bank-account");
  const [kycLoading, setKycLoading] = useState(false);
  const [kycUrl, setKycUrl] = useState<string | null>(null);
  const [agreementUrl, setAgreementUrl] = useState<string | null>(null);

  console.log("kyc url", kycUrl);
  console.log("agreementUrl url", agreementUrl);

  const handleAddBank = () => {
    setStepper("bank-account-details");
  };

  //   const handleKycLink = (e: any) => {
  //     e.preventDefault();
  //     const formData = new FormData(e.currentTarget);

  //     const firstName = formData.get("firstName");
  //     const lastName = formData.get("lastName");
  //     const email = formData.get("email");
  //     const accountType = formData.get("accountType");

  //     console.log("env", process.env.NEXT_PUBLIC_BRIDGE_SECRET);

  //     if (!firstName) {
  //       return toast.error("First Name is Required!");
  //     }
  //     if (!lastName) {
  //       return toast.error("Last Name is Required!");
  //     }
  //     if (!email) {
  //       return toast.error("Email is Required!");
  //     }
  //     if (!accountType) {
  //       return toast.error("Please select account type");
  //     } else {
  //       const options = {
  //         method: "POST",
  //         headers: {
  //           accept: "application/json",
  //           "Idempotency-Key": uuidv4(),
  //           "content-type": "application/json",
  //           "Api-Key": process.env.BRIDGE_SECRET,
  //         },
  //         body: JSON.stringify({
  //           type: accountType,
  //           full_name: firstName + " " + lastName,
  //           email: email,
  //           redirect_uri: "https://swopme.app",
  //         }),
  //       };

  //       console.log("options", options);

  //       setKycLoading(true);
  //         await fetch("https://api.bridge.xyz/v0/kyc_links", options)
  //           .then((res) => res.json())
  //           .then(async (res) => {
  //             if (res.code && res.code === "invalid_parameters") {
  //               toastify("Invalid data, Please submit valid information!");
  //             }
  //             if ((await res?.kyc_link) && (await res?.tos_link)) {
  //               await saveQycInfoToSwopDB(res);
  //               setKycUrl(res.kyc_link);
  //               setAgreementUrl(res.tos_link);
  //               setScreen(1);
  //             } else if (
  //               (await res?.existing_kyc_link) &&
  //               (await res?.existing_kyc_link?.kyc_link)
  //             ) {
  //               await saveQycInfoToSwopDB(res?.existing_kyc_link);
  //               await dispatch({
  //                 type: SEND_PARENT_PROFILE_INFO,
  //                 payload: { data: { ...user_Data.data, kyc: res } },
  //               });
  //               setKycUrl(await res?.existing_kyc_link?.kyc_link);
  //               setAgreementUrl(await res?.existing_kyc_link?.tos_link);
  //               setScreen(1);
  //             }
  //             return setKycLoading(false);
  //           })
  //           .catch((err) => {
  //             console.error("error iiiiii", err);
  //             setKycLoading(false);
  //           });
  //     }
  //   };

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
      const response = await fetch(
        "https://api.bridge.xyz/v0/kyc_links",
        options
      );
      const data = await response.json();

      if (data.code && data.code === "invalid_parameters") {
        toast.error("Invalid data, Please submit valid information!");
        return;
      }

      if (data?.kyc_link && data?.tos_link) {
        //await saveQycInfoToSwopDB(data); // Ensure this function is defined
        setKycUrl(data.kyc_link);
        setAgreementUrl(data.tos_link);
        setStepper("kyc-success"); // Add a new step for KYC success
      } else if (data?.existing_kyc_link?.kyc_link) {
        //await saveQycInfoToSwopDB(data.existing_kyc_link); // Ensure this function is defined
        // await dispatch({
        //   type: SEND_PARENT_PROFILE_INFO,
        //   payload: { data: { ...user_Data.data, kyc: data } },
        // });
        setKycUrl(data.existing_kyc_link.kyc_link);
        setAgreementUrl(data.existing_kyc_link.tos_link);
        setStepper("kyc-success"); // Add a new step for KYC success
      }
    } catch (err) {
      console.error("Error fetching KYC link:", err);
      toast.error("An error occurred while processing your request.");
    } finally {
      setKycLoading(false);
    }
  };

  return (
    <div>
      <Modal
        size={stepper === "bank-account-details" ? "2xl" : "md"}
        isOpen={bankShow}
        onOpenChange={setBankShow}
      >
        <ModalContent>
          <div className="w-full">
            <ModalBody className="text-center text-gray-700 py-6">
              {stepper === "bank-account" && (
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
