"use client";
import { FC, useEffect, useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import Subscribe from "./subscribe";
import Connect from "./connect";
import { FaCartShopping } from "react-icons/fa6";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCart } from "@/app/(public-profile)/sp/[username]/cart/context/CartContext";
import { useUser } from "@/lib/UserContext";
import { getEnsDataUsingEns } from "../../actions/getEnsData";

interface Props {
  avatar: string;
  cover?: string;
  name: string;
  parentId: string;
  micrositeId: string;
  theme: boolean;
  accessToken: string;
}

const Header: FC<Props> = ({
  avatar,
  cover,
  name,
  parentId,
  micrositeId,
  theme,
}) => {
  const [open, setOpen] = useState(false);
  const [openDC, setOpenDC] = useState(false);
  const [isAlreadyConnected, setIsAlreadyConnected] = useState(false);
  const { itemCount } = useCart();
  const router = useRouter();
  const pathname = usePathname();

  const { user } = useUser();

  const params = useParams<{ username: string }>();
  const userName = params?.username;

  useEffect(() => {
    if (user && userName) {
      const fetchEnsData = async () => {
        const res = await getEnsDataUsingEns(userName);
        const resId = res.domainOwner._id;

        if (user && user.connectionIds.includes(resId)) {
          setIsAlreadyConnected(true);
        } else {
          setIsAlreadyConnected(false);
        }
      };
      fetchEnsData();
    }
  }, [user, userName]);

  const handleRedirectIntoCartDetails = () => {
    const newRoute = `${pathname}/cart`;
    router.push(newRoute);
  };

  return (
    <div className={`w-full h-32 flex items-start justify-between`}>
      <div className="cursor-pointer">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger>
            <Image
              src="/star.svg"
              alt="Subscribe"
              width={30}
              height={30}
              className="w-8 h-8 bg-white rounded-full p-1"
            />
          </DialogTrigger>
          <DialogContent>
            <Subscribe
              data={{
                name,
                parentId,
                micrositeId,
              }}
              handler={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex items-center justify-center">
        <div className="relative border-4 rounded-full border-white shadow-lg">
          <div className="w-28 h-28">
            <Image
              src={
                avatar.includes("https")
                  ? avatar
                  : `/images/user_avator/${avatar}@3x.png`
              }
              alt={name}
              className="w-full h-full rounded-full"
              width={320}
              height={320}
              priority
            />
          </div>
          {user && user?.ensName !== userName && !isAlreadyConnected && (
            <div className="absolute -right-2 bottom-2 ml-2">
              <Dialog open={openDC} onOpenChange={setOpenDC}>
                <DialogTrigger>
                  <div className="bg-white border-2 rounded-full border-black p-1">
                    <Image
                      src="/add-btn-dark.svg"
                      alt="Add"
                      width={20}
                      height={20}
                    />
                  </div>
                </DialogTrigger>
                <DialogContent>
                  <Connect
                    data={{
                      name,
                      parentId,
                      micrositeId,
                      avatar,
                    }}
                    handler={() => setOpenDC(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>
      <div
        onClick={handleRedirectIntoCartDetails}
        className="relative cursor-pointer bg-white w-8 h-8 rounded-full flex items-center justify-center"
      >
        <div className="bg-black w-4 h-4 rounded-full flex items-center justify-center text-white absolute -top-0.5 -right-0.5 text-[10px] font-semibold">
          {itemCount}
        </div>
        <FaCartShopping />
      </div>
    </div>
  );
};

export default Header;
