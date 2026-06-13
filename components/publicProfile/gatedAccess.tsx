"use client";
import { FC, useState, CSSProperties } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from "next/image";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  WagmiConfig,
  createConfig,
  configureChains,
  mainnet,
  useAccount,
} from "wagmi";
import { publicProvider } from "wagmi/providers/public";
import { WalletConnect } from "./walletConnect";
import { Terminal, BellRing } from "lucide-react";
// import ClipLoader from 'react-spinners/ClipLoader';

interface Props {
  data: {
    contractAddress: string;
    eventLink: string;
    network: string;
    tokenId: string;
    title: string;
    description: string;
    image: string;
    openseaLink: string;
  };
  gatedAccess: boolean;
  gatedInfo: any;
}

const { publicClient, webSocketPublicClient } = configureChains(
  [mainnet],
  [publicProvider()]
);

const config = createConfig({
  autoConnect: true,
  publicClient,
  webSocketPublicClient,
});

const override: CSSProperties = {
  display: "block",
  margin: "0 auto",
  borderColor: "red",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const GatedAccess: FC<Props> = ({ data, gatedAccess, gatedInfo }) => {
  const {
    contractAddress,
    network,
    title,
    description,
    image,
    openseaLink,
    eventLink,
  } = data;

  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(gatedAccess && gatedInfo.error === false);
  const [isTokenHolder, setTokenHolder] = useState(false);
  const [alertText, setAlertText] = useState("");

  const checkValidation = async () => {
    setLoading(true);
    setAlertText("");

    if (!isConnected) {
      alert("Please connect wallet first");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/api/v2/web/isTokenHolder/${address}/${contractAddress}/${network}`
      );
      const data = await res.json();

      setTokenHolder(data.result.isHolderOfCollection);

      if (data.message === "success" && data.result.isHolderOfCollection) {
        setTimeout(() => {
          setOpen(false);
        }, 2000);
      } else {
        setAlertText(data.result.errorText);
      }
    } catch (error) {
      console.error("Error:", error);
      setAlertText("An error occurred while validating token access.");
    }

    setLoading(false);
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-xs rounded-md md:max-w-md">
        <WagmiConfig config={config}>
          <div className="flex justify-center">
            <WalletConnect />
          </div>
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-extrabold dark:text-white">
              This website is token powered
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="container flex flex-col items-center">
            <div>
              <h4 className="text-xl font-bold dark:text-white mb-2">
                {title}
              </h4>
            </div>

            <div className="max-w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
              <Image
                className="h-auto max-w-full rounded-lg"
                src={image}
                alt={title}
                width={120}
                height={120}
                priority
              />
            </div>
            <Link
              href={eventLink}
              target="_blank"
              className="text-gray-900 bg-gradient-to-r from-red-200 via-red-300 to-yellow-200 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-red-100 dark:focus:ring-red-400 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 mt-4"
            >
              Purchase Token
            </Link>
            <div className="">
              <Button
                onClick={checkValidation}
                className="text-white bg-[#050708] hover:bg-[#050708]/90 focus:ring-4 focus:outline-none focus:ring-[#050708]/50 font-medium rounded-lg text-sm px-4 py-2.5 text-center inline-flex items-center dark:focus:ring-[#050708]/50 dark:hover:bg-[#050708]/30 me-2 mb-2"
              >
                <span className="mr-2">Verify Access</span>
                {!loading && (
                  <svg
                    className="w-4 h-4 "
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 14 10"
                  >
                    <path
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M1 5h12m0 0L9 1m4 4L9 9"
                    />
                  </svg>
                )}
                {/* <ClipLoader
                  color="#ffffff"
                  loading={loading}
                  cssOverride={override}
                  size={20}
                  aria-label="Loading Spinner"
                  data-testid="loader"
                /> */}
              </Button>
            </div>
            {!isTokenHolder && alertText && isConnected && (
              <Alert
                variant="destructive"
                className="mt-5 transform translate-y-0.5 transition-all "
              >
                <Terminal className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{alertText}</AlertDescription>
              </Alert>
            )}
            {isTokenHolder && isConnected && (
              <>
                <Alert className="mt-5  border-lime-500">
                  <BellRing className="h-4 w-4" />
                  <AlertTitle className="text-lime-700">
                    Congratulations! You are a NFT holder of this NFT
                    collection.
                  </AlertTitle>
                </Alert>
              </>
            )}
          </DialogDescription>
        </WagmiConfig>
      </DialogContent>
    </Dialog>
  );
};

export default GatedAccess;
