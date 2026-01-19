"use client";
import { FC, useEffect, useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import Subscribe from "./subscribe";
import Connect from "./connect";
import { FaCartShopping, FaRegStar } from "react-icons/fa6";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCart } from "@/app/(public-profile)/sp/[username]/cart/context/CartContext";
import { useUser } from "@/lib/UserContext";
import { getEnsDataUsingEns } from "../../actions/getEnsData";
import isUrl from "@/lib/isUrl";
import { MdOutlineShoppingCart } from "react-icons/md";

interface Props {
  avatar: string;
  cover?: string;
  name: string;
  parentId: string;
  micrositeId: string;
  theme: boolean;
  accessToken: string;
  isFromPublicProfile?: boolean;
}

// Simple profile image component
const ProfileImage: FC<{ avatar: string; name: string; size?: string }> = ({
  avatar,
  name,
  size = "w-24 h-24",
}) => (
  <div className={`border-4 rounded-full border-white shadow-lg ${size}`}>
    <Image
      src={isUrl(avatar) ? avatar : `/images/user_avator/${avatar}@3x.png`}
      alt={name}
      className="w-full h-full rounded-full"
      width={320}
      height={320}
      priority
    />
  </div>
);

// Full header for public profile
const PublicProfileHeader: FC<Props> = ({
  avatar,
  name,
  parentId,
  micrositeId,
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
    <div className="w-full">
      <div className="w-full flex items-start justify-between px-6">
        <div className="cursor-pointer">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
              {/* <Image
                src="/star.svg"
                alt="Subscribe"
                width={30}
                height={30}
                className="w-8 h-8 bg-white rounded-full p-1"
              /> */}
              <div className="w-6 h-6 lg:w-7 lg:h-7 bg-gray-400 rounded-full flex items-center justify-center">
                <FaRegStar color="white" />
              </div>
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
        <div
          onClick={handleRedirectIntoCartDetails}
          className="relative cursor-pointer bg-gray-400 w-6 h-6 lg:w-7 lg:h-7 rounded-full flex items-center justify-center"
        >
          <div className="bg-purple-400 w-4 h-4 rounded-full flex items-center justify-center text-black absolute -top-1 -right-2 text-[10px] font-semibold">
            {itemCount}
          </div>
          <MdOutlineShoppingCart color="white" />
        </div>
      </div>
      <div className="flex items-center justify-center">
        <div className="relative">
          <ProfileImage avatar={avatar} name={name} />

          {user && user?.ensName !== userName && !isAlreadyConnected && (
            <div className="absolute -right-3 bottom-2 ml-2">
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
    </div>
  );
};

// Main Header component
const Header: FC<Props> = ({ isFromPublicProfile = true, ...props }) => {
  // If not from public profile, just show the profile image
  if (!isFromPublicProfile) {
    return (
      <div className="flex items-center justify-center">
        <ProfileImage avatar={props.avatar} name={props.name} />
      </div>
    );
  }

  // Otherwise, show the full public profile header
  return <PublicProfileHeader {...props} />;
};

export default Header;
