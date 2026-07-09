"use client";
import React, { useEffect, useState } from "react";
import { Tooltip } from "@nextui-org/react";
import { MdInfoOutline } from "react-icons/md";
import { Loader } from "lucide-react";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import { useUser } from "@/lib/UserContext";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";
import { handleCreateWidget } from "@/actions/widget";

const AddVaultCard = ({ onCloseModal }: any) => {
  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    const token = Cookies.get("access-token");
    if (token) {
      setAccessToken(token);
    }
  }, []);

  const state: any = useSmartSiteApiDataStore((state) => state);
  const { user } = useUser();

  const [ensName, setEnsName] = useState("");
  const [headline, setHeadline] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const placeholder = `agent-${(user as any)?.username || "yourname"}.swop.id`;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const trimmed = ensName.trim();
    if (!trimmed) {
      toast.error("Enter your vault's ENS name");
      return;
    }

    setIsLoading(true);
    try {
      const data = await handleCreateWidget(
        {
          micrositeId: state._id,
          widgetType: "vaultCard",
          config: {
            ensName: trimmed,
            headline: headline.trim() || undefined,
          },
        },
        accessToken,
      );

      if (data?.state === "success") {
        toast.success("Agent Vault added");
        onCloseModal();
      } else {
        toast.error(
          "Couldn't add vault — make sure the ENS name is your own vault",
        );
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
          Agent Vault
        </h2>
        <div className="translate-y-0.5">
          <Tooltip
            size="sm"
            content={
              <span className="font-medium">
                Show your trading agent&apos;s vault — live PnL, trade count,
                and a copyable vault address. Only your own vault can be
                pinned.
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <p className="font-medium mb-1">Vault ENS Name</p>
            <input
              type="text"
              value={ensName}
              onChange={(e) => setEnsName(e.target.value)}
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
              placeholder={placeholder}
              required
            />
          </div>
          <div>
            <p className="font-medium mb-1">
              Headline{" "}
              <span className="text-xs font-normal text-gray-400">
                (optional)
              </span>
            </p>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
              placeholder="My agent trades so I don't have to"
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

export default AddVaultCard;
