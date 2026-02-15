"use client";
import { Switch } from "../ui/switch";
import { Eye, EyeOff, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Input } from "../ui/input";
import Image from "next/image";
import { chainIcons } from "@/utils/staticData/tokenChainIcon";
import { MdKeyboardBackspace } from "react-icons/md";
import Cookies from "js-cookie";
import { useWalletHideBalanceStore } from "@/zustandStore/useWalletHideBalanceToggle";
import { useRouter } from "next/navigation";
import { useBalanceVisibilityStore } from "@/zustandStore/useBalanceVisibilityStore";

const WalletAssetsSettings = ({ tokens }: any) => {
  const [isManageTokenOpen, setIsManageTokenOpen] = useState(false);
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { showBalance, toggleBalance } = useBalanceVisibilityStore();

  const [selectedTokens, setSelectedTokens] = useState<string[]>(() => {
    // Initialize state from cookie
    const cookie = Cookies.get("selected_tokens");
    if (!cookie) return [];
    try {
      return JSON.parse(cookie);
    } catch (e) {
      return [];
    }
  });

  const COOKIE_NAME = "selected_tokens";

  // Toggle token address - add if not exists, remove if exists
  const toggleTokenAddress = (address: string) => {
    if (!address) return;

    setSelectedTokens((prev) => {
      let updated;
      if (prev.includes(address)) {
        // Remove if exists
        updated = prev.filter((addr: string) => addr !== address);
      } else {
        // Add if not exists
        updated = [...prev, address];
      }

      // Save to cookie
      Cookies.set(COOKIE_NAME, JSON.stringify(updated), { expires: 30 });
      return updated;
    });
  };

  const filteredTokens = useMemo(() => {
    if (!searchTerm.trim()) return tokens;

    return tokens.filter((token: any) =>
      token.symbol.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [tokens, searchTerm]);

  // Load the cookie value on mount
  useEffect(() => {
    const savedPreference = Cookies.get("hideBalance");
    setIsBalanceHidden(savedPreference === "true");
  }, []);

  return (
    <div>
      {!isManageTokenOpen && (
        <div className="p-4 space-y-4">
          <button
            onClick={() => setIsManageTokenOpen(true)}
            className="w-full flex items-center justify-between"
          >
            <span className="text-lg font-semibold text-gray-800">
              Manage Token
            </span>
            <Switch
              checked={true}
              className="data-[state=checked]:bg-gray-900"
            />
          </button>

          {/* Hide Balance Setting */}
          <button
            onClick={toggleBalance}
            className="w-full flex items-center justify-between"
          >
            <span className="text-lg font-semibold text-gray-800">
              {showBalance ? "Hide Balance" : "Show Balance"}
            </span>

            {showBalance ? (
              <EyeOff className="w-8 h-8 text-gray-800" strokeWidth={2} />
            ) : (
              <Eye className="w-8 h-8 text-gray-800" strokeWidth={2} />
            )}
          </button>
        </div>
      )}
      {isManageTokenOpen && (
        <section className="p-4 w-full">
          <button
            onClick={() => setIsManageTokenOpen(false)}
            className="absolute left-4 top-2"
          >
            <MdKeyboardBackspace size={24} />
          </button>
          {/* Header */}
          <h1 className="text-2xl font-bold text-center mb-8 text-gray-900">
            Manage token list
          </h1>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search by symbol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-2 pl-12 pr-4 py-6 w-full bg-white border border-gray-200 rounded-2xl text-base placeholder:text-gray-400"
            />
          </div>

          {/* Token List */}
          <div className="space-y-1">
            {filteredTokens.map((token: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 px-2 border-b"
              >
                <div className="flex items-center gap-4">
                  {/* Token Icon */}
                  <div className="relative">
                    <Image
                      src={token.marketData.image}
                      alt="token.symbol"
                      width={120}
                      height={120}
                      className="w-10 h-10 rounded-full border"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-black rounded-full flex items-center justify-center border-2 border-white">
                      <Image
                        src={chainIcons[token.chain]}
                        alt="token.symbol"
                        width={120}
                        height={120}
                      />
                    </div>
                  </div>

                  {/* Token Info */}
                  <div>
                    <div className="font-semibold text-gray-900 text-lg mb-0.5">
                      {token.symbol}
                    </div>
                    <div className="text-gray-400 text-sm">{token.balance}</div>
                  </div>
                </div>

                {/* Toggle Switch */}
                <Switch
                  checked={!selectedTokens.includes(token.address)}
                  onCheckedChange={() => toggleTokenAddress(token.address)}
                  className="data-[state=checked]:bg-gray-900"
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default WalletAssetsSettings;
