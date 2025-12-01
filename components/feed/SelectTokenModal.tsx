import { useState, useEffect } from "react";
import Image from "next/image";
import CustomModal from "../modal/CustomModal";
import { Check } from "lucide-react";
import isUrl from "@/lib/isUrl";
import { toFixedTruncate } from "@/lib/fixedTruncateNumber";

interface Token {
  name: string;
  symbol: string;
  balance: string;
  logoURI?: string;
  marketData?: any;
}

interface SelectTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: Token) => void;
  tokens: Token[];
  selectedToken?: Token; // 👈 parent passes currently selected token
}

const SelectTokenModal: React.FC<SelectTokenModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  tokens,
  selectedToken,
}) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  console.log("tokens", tokens);

  // ✅ sync with parent’s selected token
  useEffect(() => {
    if (selectedToken) {
      setSelected(selectedToken.name);
    } else if (tokens.length > 0) {
      setSelected(tokens[0].name); // fallback if none selected yet
    }
  }, [selectedToken, tokens]);

  const filteredTokens = tokens.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <CustomModal isOpen={isOpen} onClose={onClose}>
      <div className="px-6 pb-6 pt-1">
        <h2 className="text-center text-lg font-semibold mb-4">Select Token</h2>

        {/* Search bar */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
        </div>

        {/* Token list */}
        <div className="space-y-3 max-h-[18rem] overflow-y-auto pr-2">
          {filteredTokens.map((token, i) => (
            <button
              key={i}
              onClick={() => {
                setSelected(token.name);
                onSelect(token);
                onClose();
              }}
              className="flex items-center justify-between w-full border-b border-gray-100 pb-2 last:border-0"
            >
              <div className="flex items-center space-x-3">
                {isUrl(token.marketData.iconUrl) ? (
                  <Image
                    src={
                      token.marketData?.iconUrl ||
                      token.logoURI ||
                      "/icons/default.png"
                    }
                    alt={token.name}
                    width={120}
                    height={120}
                    className="rounded-full w-9 h-9"
                  />
                ) : (
                  <Image
                    src={token.logoURI || "/icons/default.png"}
                    alt={token.name}
                    width={120}
                    height={120}
                    className="rounded-full w-9 h-9"
                  />
                )}

                <div className="text-left">
                  <p className="font-medium">{token.name}</p>
                  <p className="text-sm text-gray-500">
                    {/* {Number(token.balance).toFixed(5)} {token.symbol} */}
                    {Number(toFixedTruncate(Number(token.balance), 6))}
                  </p>
                </div>
              </div>
              <div className="w-4 h-4 flex items-center justify-center">
                {selected === token.name ? (
                  <Check className="text-black w-4 h-4" />
                ) : (
                  <div className="w-4 h-4 border border-gray-300 rounded-full" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </CustomModal>
  );
};

export default SelectTokenModal;
