"use client";
import { ChevronDown, Loader2, Trash2, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { useState, ChangeEvent, useMemo, useEffect } from "react";
import { useSolanaWallets, useWallets } from "@privy-io/react-auth";
import { useMultiChainTokenData } from "@/lib/hooks/useToken";
import { useNFT } from "@/lib/hooks/useNFT";
import { useToast } from "@/hooks/use-toast";
import Cookies from "js-cookie";
import { sendCloudinaryImage } from "@/lib/SendCloudinaryImage";
import {
  getTokenGating,
  updateTokenGating,
  deleteTokenGating,
} from "@/actions/tokenGating";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TokenType = "NFT" | "Token";

interface TokenGatedContentProps {
  micrositeId: string;
}

const TokenGatedContent = ({ micrositeId }: TokenGatedContentProps) => {
  const { toast } = useToast();
  // Wallet hooks
  const { wallets: solanaWallets } = useSolanaWallets();
  const { wallets: ethWallets } = useWallets();

  // Get wallet addresses
  const solWalletAddress = useMemo(() => {
    return solanaWallets?.find(
      (w) => w.walletClientType === "privy" || w.connectorType === "embedded"
    )?.address;
  }, [solanaWallets]);

  const evmWalletAddress = useMemo(() => {
    return ethWallets?.find(
      (w) => w.walletClientType === "privy" || w.connectorType === "embedded"
    )?.address;
  }, [ethWallets]);

  // Fetch tokens from Solana wallet
  const { tokens, loading: tokensLoading } = useMultiChainTokenData(
    solWalletAddress,
    evmWalletAddress,
    ["SOLANA"]
  );

  // Fetch NFTs from Solana wallet
  const { nfts, loading: nftsLoading } = useNFT(
    solWalletAddress,
    evmWalletAddress,
    ["SOLANA"]
  );

  // Component state
  const [token, setToken] = useState<string>("");
  const [isOn, setIsOn] = useState<boolean>(false);
  const [tokenType, setTokenType] = useState<TokenType>("NFT");
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [forwardLink, setForwardLink] = useState<string>("");
  const [minRequired, setMinRequired] = useState<string>("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(
    null
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetching, setFetching] = useState<boolean>(true);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);

  // Get access token from cookies on mount
  useEffect(() => {
    const accessToken = Cookies.get("access-token");
    setToken(accessToken || "");
  }, []);

  // Filter tokens and NFTs for Solana only
  const solanaTokens = useMemo(() => {
    return tokens.filter((token) => token.chain === "SOLANA");
  }, [tokens]);

  const solanaNFTs = useMemo(() => {
    return nfts.filter((nft) => nft.network === "solana");
  }, [nfts]);

  // Get current items based on token type
  const currentItems = useMemo(() => {
    if (tokenType === "NFT") {
      return solanaNFTs.map((nft) => ({
        value: nft.contract,
        label: nft.name,
        image: nft.image,
      }));
    } else {
      return solanaTokens.map((token) => ({
        value: token.address || token.symbol,
        label: `${token.name} (${token.symbol})`,
        image: token.logoURI,
      }));
    }
  }, [tokenType, solanaNFTs, solanaTokens]);

  // Set default selected token when items change
  useMemo(() => {
    if (currentItems.length > 0 && !selectedToken) {
      setSelectedToken(currentItems[0].value);
    }
  }, [currentItems, selectedToken]);

  // Handle token type change
  const handleTokenTypeChange = (type: TokenType) => {
    setTokenType(type);
    setSelectedToken(""); // Reset selected token when switching types
    if (type === "NFT") {
      setMinRequired(""); // Clear min required for NFTs (not applicable)
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Store the file for later Cloudinary upload
      setImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Fetch existing token gating configuration on mount
  useEffect(() => {
    const fetchTokenGatingConfig = async () => {
      try {
        setFetching(true);
        if (!token) {
          setFetching(false);
          return;
        }

        const response = await getTokenGating(micrositeId, token);

        if (response.state === "success" && response.data?.gatedInfo) {
          const { gatedInfo } = response.data;
          setIsOn(gatedInfo.isOn || false);
          setTokenType(gatedInfo.tokenType || "NFT");
          setSelectedToken(gatedInfo.selectedToken || "");
          setForwardLink(gatedInfo.forwardLink || "");
          setMinRequired(gatedInfo.minRequired?.toString() || "");

          // Set both the Cloudinary URL and preview
          if (gatedInfo.coverImage) {
            setCoverImage(gatedInfo.coverImage);
            setCoverImagePreview(gatedInfo.coverImage);
          }
        }
      } catch (error) {
        console.error("Error fetching token gating configuration:", error);
        toast({
          title: "❌ Loading Failed",
          description:
            "Failed to load token gating configuration. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setFetching(false);
      }
    };

    if (micrositeId && token) {
      fetchTokenGatingConfig();
    }
  }, [micrositeId, token, toast]);

  // Show save confirmation modal
  const handleSaveClick = () => {
    setShowSaveModal(true);
  };

  // Handle save/update token gating configuration
  const handleSave = async () => {
    // Close the modal
    setShowSaveModal(false);

    // Small delay to ensure modal closes before processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      setLoading(true);

      // Validation
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in to continue",
          variant: "destructive",
        });
        return;
      }

      if (!selectedToken && isOn) {
        toast({
          title: "Validation Error",
          description: "Please select a token or NFT",
          variant: "destructive",
        });
        return;
      }

      if (
        tokenType === "Token" &&
        isOn &&
        (!minRequired || Number(minRequired) <= 0)
      ) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid minimum token amount",
          variant: "destructive",
        });
        return;
      }

      // Upload image to Cloudinary if a new image was selected
      let cloudinaryImageUrl = coverImage || "";

      if (imageFile) {
        try {
          setUploadingImage(true);
          toast({
            title: "📤 Uploading Image",
            description:
              "Please wait while we upload your cover image to Cloudinary...",
          });

          // Convert file to base64 for Cloudinary upload
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
          });

          const base64Image = await base64Promise;
          cloudinaryImageUrl = await sendCloudinaryImage(base64Image);

          // Update the coverImage state with Cloudinary URL
          setCoverImage(cloudinaryImageUrl);
          setImageFile(null); // Clear the file after successful upload

          toast({
            title: "✓ Image Uploaded",
            description:
              "Your cover image has been uploaded successfully to Cloudinary.",
          });
        } catch (uploadError: any) {
          console.error("Error uploading image to Cloudinary:", uploadError);
          toast({
            title: "❌ Image Upload Failed",
            description:
              uploadError.message ||
              "Failed to upload image to Cloudinary. Proceeding without cover image.",
            variant: "destructive",
          });
          cloudinaryImageUrl = ""; // Proceed without image
        } finally {
          setUploadingImage(false);
        }
      }

      const tokenGatingData = {
        isOn,
        tokenType,
        selectedToken,
        forwardLink,
        minRequired: tokenType === "Token" ? Number(minRequired) : 1,
        coverImage: cloudinaryImageUrl,
        network: "SOLANA" as const,
      };

      const response = await updateTokenGating(
        micrositeId,
        tokenGatingData,
        token
      );

      if (response.state === "success") {
        // Build detailed success message
        let statusMessage = `Token gating is now ${
          isOn ? "ENABLED" : "DISABLED"
        }.`;

        if (isOn) {
          statusMessage += ` Users must own ${
            tokenType === "NFT"
              ? "the selected NFT"
              : `at least ${minRequired} ${selectedToken} tokens`
          } to access your SmartSite.`;
        } else {
          statusMessage += ` Your SmartSite is publicly accessible.`;
        }

        toast({
          title: "✓ Configuration Saved Successfully",
          description: statusMessage,
        });
      } else {
        throw new Error(response.message || "Failed to save configuration");
      }
    } catch (error: any) {
      console.error("Error saving token gating configuration:", error);
      toast({
        title: "❌ Save Failed",
        description:
          error.message ||
          "Failed to save token gating configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  // Handle delete/reset token gating configuration
  const handleDelete = async () => {
    // Show confirmation dialog
    const confirmDelete = window.confirm(
      "Are you sure you want to reset the token gating configuration? This will remove all token gating restrictions from your SmartSite and clear all settings."
    );

    if (!confirmDelete) {
      return; // User cancelled
    }

    try {
      setDeleting(true);

      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in to continue",
          variant: "destructive",
        });
        return;
      }

      const response = await deleteTokenGating(micrositeId, token);

      if (response.state === "success") {
        // Reset form to defaults
        setIsOn(false);
        setTokenType("NFT");
        setSelectedToken("");
        setForwardLink("");
        setMinRequired("");
        setCoverImage(null);
        setCoverImagePreview(null);
        setImageFile(null);

        toast({
          title: "✓ Configuration Reset",
          description:
            "All token gating settings have been cleared. Your SmartSite is now publicly accessible.",
        });
      } else {
        throw new Error(response.message || "Failed to delete configuration");
      }
    } catch (error: any) {
      console.error("Error deleting token gating configuration:", error);
      toast({
        title: "❌ Reset Failed",
        description:
          error.message ||
          "Failed to reset token gating configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Show loading state while fetching
  if (fetching) {
    return (
      <div className="min-h-screen bg-white max-w-4xl rounded-2xl mx-auto p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
          <p className="text-gray-500">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white max-w-4xl rounded-2xl mx-auto p-8 flex items-center justify-center">
      <div className="w-full">
        <h1 className="text-2xl font-semibold text-center mb-12">
          Token Powered Site
        </h1>

        <div className="space-y-8">
          {/* On/Off and Token Type Row */}
          <div className="grid grid-cols-2 gap-6">
            {/* On/Off */}
            <div>
              <label className="block text-sm font-medium mb-3">On/Off:</label>
              <div className="bg-white rounded-full p-1 flex shadow-medium shadow-white">
                <button
                  onClick={() => setIsOn(true)}
                  className={`flex-1 py-2.5 rounded-full font-medium transition-all duration-400 ${
                    isOn
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  On
                </button>
                <button
                  onClick={() => setIsOn(false)}
                  className={`flex-1 py-2.5 rounded-full font-medium transition-all duration-400 ${
                    !isOn
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Off
                </button>
              </div>
            </div>

            {/* Token Type */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Token Type:
              </label>
              <div className="bg-white rounded-full p-1 flex shadow-medium">
                <button
                  onClick={() => handleTokenTypeChange("NFT")}
                  className={`flex-1 py-2.5 rounded-full font-medium transition-all duration-400 ${
                    tokenType === "NFT"
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  NFT
                  {!nftsLoading && solanaNFTs.length > 0 && (
                    <span className="ml-1 text-xs">({solanaNFTs.length})</span>
                  )}
                </button>
                <button
                  onClick={() => handleTokenTypeChange("Token")}
                  className={`flex-1 py-2.5 rounded-full font-medium transition-all duration-400 ${
                    tokenType === "Token"
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Token
                  {!tokensLoading && solanaTokens.length > 0 && (
                    <span className="ml-1 text-xs">
                      ({solanaTokens.length})
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Select Token and Forward Link Row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Select Token */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Select {tokenType}:
              </label>
              <div className="relative">
                {tokensLoading || nftsLoading ? (
                  <div className="w-full px-4 py-3 bg-white rounded-xl shadow-medium flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-500">Loading...</span>
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedToken}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        setSelectedToken(e.target.value)
                      }
                      disabled={currentItems.length === 0}
                      className="w-full px-4 py-3 bg-white rounded-xl shadow-medium appearance-none cursor-pointer focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {currentItems.length === 0 ? (
                        <option value="">
                          No {tokenType === "NFT" ? "NFTs" : "tokens"} found
                        </option>
                      ) : (
                        currentItems.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))
                      )}
                    </select>
                    <ChevronDown
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      size={20}
                    />
                  </>
                )}
              </div>
              {currentItems.length === 0 && !tokensLoading && !nftsLoading && (
                <p className="text-red-600 text-sm mt-2">
                  *You have no {tokenType === "NFT" ? "NFTs" : "tokens"} in your
                  Solana wallet.
                </p>
              )}
              {currentItems.length > 0 && (
                <p className="text-green-600 text-sm mt-2">
                  {currentItems.length}{" "}
                  {tokenType === "NFT" ? "NFTs" : "tokens"} available
                </p>
              )}
            </div>

            {/* Forward Link */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Forward Link:
              </label>
              <input
                type="text"
                value={forwardLink}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setForwardLink(e.target.value)
                }
                className="w-full px-4 py-3 bg-white rounded-xl focus:outline-none shadow-medium"
                placeholder=""
              />
            </div>
          </div>

          {/* Min Required - Only show for Tokens */}
          {tokenType === "Token" && (
            <div>
              <label className="block text-sm font-medium mb-3">
                Min Required:
              </label>
              <input
                type="text"
                value={minRequired}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setMinRequired(e.target.value)
                }
                className="w-full px-4 py-3 bg-white rounded-xl focus:outline-none shadow-medium"
                placeholder="Enter minimum token amount (e.g., 100)"
              />
              <p className="text-gray-500 text-xs mt-1">
                Minimum number of tokens required to access the gated content
              </p>
            </div>
          )}

          {/* Upload Cover Image */}
          <div className="bg-white rounded-2xl p-8 shadow-medium">
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 bg-gray-100 rounded-2xl flex items-center justify-center mb-6 relative">
                {coverImagePreview ? (
                  <Image
                    src={coverImagePreview}
                    alt="Cover"
                    width={320}
                    height={320}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <svg
                    className="w-12 h-12 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="2"
                      ry="2"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="8.5"
                      cy="8.5"
                      r="1.5"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points="21 15 16 10 5 21"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <span className="inline-block px-8 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors">
                  Upload Cover Image
                </span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleSaveClick}
              disabled={loading || deleting || uploadingImage}
              className="flex-1 py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploadingImage ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading Image...
                </>
              ) : loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </button>

            <button
              onClick={handleDelete}
              disabled={loading || deleting || uploadingImage}
              className="px-6 py-4 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-medium text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              title="Reset token gating configuration"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5" />
                  Reset
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Save Confirmation Modal */}
      <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-blue-600" />
              </div>
              <DialogTitle className="text-xl">
                Confirm Save Configuration
              </DialogTitle>
            </div>
            <DialogDescription className="text-base pt-2">
              Are you sure you want to save this token gating configuration?
              This will update how users access your SmartSite.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setShowSaveModal(false)}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm & Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TokenGatedContent;
