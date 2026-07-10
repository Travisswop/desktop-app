"use client";
import React, { useEffect, useState } from "react";
import { Tooltip } from "@nextui-org/react";
import { MdInfoOutline } from "react-icons/md";
import { Loader } from "lucide-react";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";
import { handleCreateWidget } from "@/actions/widget";
import LeadFormCard, {
  LEAD_FORM_FIELD_ORDER,
  LEAD_FORM_FIELD_META,
  LeadFormFieldKey,
} from "@/components/publicProfile/widgets/LeadFormCard";

const AddLeadForm = ({ onCloseModal }: any) => {
  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    const token = Cookies.get("access-token");
    if (token) {
      setAccessToken(token);
    }
  }, []);

  const state: any = useSmartSiteApiDataStore((state) => state);

  const [title, setTitle] = useState("Leads Form");
  const [description, setDescription] = useState("");
  const [buttonText, setButtonText] = useState("Submit");
  const [successMessage, setSuccessMessage] = useState("Thanks!");
  const [fieldFlags, setFieldFlags] = useState<
    Record<LeadFormFieldKey, boolean>
  >({
    email: true,
    mobileNo: false,
    jobTitle: false,
    website: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const fields = LEAD_FORM_FIELD_ORDER.filter((key) => fieldFlags[key]);

  const toggleField = (key: LeadFormFieldKey) =>
    setFieldFlags((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    setIsLoading(true);
    try {
      const data = await handleCreateWidget(
        {
          micrositeId: state._id,
          widgetType: "leadForm",
          config: {
            title: title.trim() || undefined,
            description: description.trim() || undefined,
            buttonText: buttonText.trim() || undefined,
            successMessage: successMessage.trim() || undefined,
            fields,
          },
        },
        accessToken,
      );

      if (data?.state === "success") {
        toast.success("Leads Form added");
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
  };

  return (
    <div className="relative flex flex-col gap-4">
      <div className="flex items-end gap-1 justify-center">
        <h2 className="font-semibold text-gray-700 text-xl text-center">
          Leads Form
        </h2>
        <div className="translate-y-0.5">
          <Tooltip
            size="sm"
            content={
              <span className="font-medium">
                Collect leads right on your page — visitors leave their name
                and contact details, straight into your leads.
              </span>
            }
            className="max-w-40 h-auto"
          >
            <button>
              <MdInfoOutline />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:px-10 2xl:px-[10%]">
        <div className="w-full rounded-xl bg-gray-200 p-3">
          <LeadFormCard
            mode="builder"
            config={{
              title,
              description,
              buttonText,
              successMessage,
              fields,
            }}
          />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <p className="font-medium mb-1">Title</p>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
              placeholder="Leads Form"
            />
          </div>
          <div>
            <p className="font-medium mb-1">Description</p>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
              placeholder="Get in touch with me"
            />
          </div>
          <div>
            <p className="font-medium mb-1">Button Text</p>
            <input
              type="text"
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
              placeholder="Submit"
            />
          </div>
          <div>
            <p className="font-medium mb-1">Success Message</p>
            <input
              type="text"
              value={successMessage}
              onChange={(e) => setSuccessMessage(e.target.value)}
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
              placeholder="Thanks!"
            />
          </div>
          <div>
            <p className="font-medium mb-1">
              Ask For{" "}
              <span className="text-xs font-normal text-gray-400">
                (name is always collected)
              </span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {LEAD_FORM_FIELD_ORDER.map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-2 font-medium"
                >
                  <input
                    type="checkbox"
                    checked={fieldFlags[key]}
                    onChange={() => toggleField(key)}
                    className="h-4 w-4 accent-black"
                  />
                  {LEAD_FORM_FIELD_META[key].label}
                </label>
              ))}
            </div>
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

export default AddLeadForm;
