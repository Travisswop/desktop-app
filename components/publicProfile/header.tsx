"use client";
import { FC, useEffect, useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import Subscribe from "./subscribe";
import Connect from "./connect";
import { FaCartShopping } from "react-icons/fa6";
import { getCartData } from "@/actions/addToCartActions";
import { usePathname, useRouter } from "next/navigation";
import useAddToCardToggleStore from "@/zustandStore/addToCartToggle";
interface Props {
  avatar: string;
  cover: string;
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
  accessToken,
}) => {
  const [open, setOpen] = useState(false);
  const [openDC, setOpenDC] = useState(false);
  const [cartQty, setCartQty] = useState(0);

  const { toggle, setToggle } = useAddToCardToggleStore();
  // const { accessToken } = useUser();

  const router = useRouter();
  const pathname = usePathname();

  const coverPhoto = cover.includes("https")
    ? cover
    : `/images/live-preview/coverphoto/${cover}.png`;

  useEffect(() => {
    const fetchCartData = async () => {
      try {
        const response = await getCartData(accessToken);
        if (response.state === "success") {
          setCartQty(response.data.cartItems.length);
        }
      } catch (error: any) {
        console.error(
          "error is" + error?.message || "Failed to add item to cart"
        );
      } finally {
        setToggle(); // Reset the toggle state after fetching data
      }
    };

    // Always fetch cart data when the component mounts
    if (accessToken) {
      fetchCartData();
    }
  }, [accessToken, setToggle]); // Add `accessToken` and `setToggle` as dependencies

  useEffect(() => {
    const fetchCartData = async () => {
      try {
        const response = await getCartData(accessToken);
        if (response.state === "success") {
          setCartQty(response.data.cartItems.length);
        }
      } catch (error: any) {
        console.error(
          "error is" + error?.message || "Failed to add item to cart"
        );
      } finally {
        setToggle(); // Reset the toggle state after fetching data
      }
    };

    // Fetch cart data when `toggle` changes
    if (accessToken && toggle) {
      fetchCartData();
    }
  }, [toggle, accessToken, setToggle]);

  const handleRedirectIntoCartDetails = () => {
    if (accessToken) {
      const newRoute = `${pathname}/cart`;
      router.push(newRoute);
    } else {
      router.push("/login");
    }
  };

  return (
    <div className={`relative w-full ${theme ? "h-28" : "h-52"} mt-4`}>
      <div>
        {!theme && (
          <div className="overflow-hidden h-44 rounded-md border-[6px] border-white shadow-lg">
            <Image
              className="object-fill w-full h-full rounded-md"
              src={coverPhoto}
              alt={name}
              width={436}
              height={192}
              priority
            />
          </div>
        )}

        <div className="absolute top-4 left-4 cursor-pointer">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
              <Image
                className="object-fill w-8 h-8 bg-white rounded-full p-1"
                src="/star.svg"
                alt="Subscribe"
                width={30}
                height={30}
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
        <div
          onClick={handleRedirectIntoCartDetails}
          className="cursor-pointer absolute top-4 right-4 bg-white w-8 h-8 rounded-full flex items-center justify-center"
        >
          <div className="bg-red-600 w-4 h-4 rounded-full flex items-center justify-center text-white absolute -top-0.5 -right-0.5 text-[10px] font-semibold">
            {cartQty ? cartQty : 0}
          </div>
          <FaCartShopping />
        </div>

        <div className="absolute flex items-center justify-center transition-all w-28 h-24 bottom-0 left-0 right-0 mx-auto">
          <div className="relative border-4 rounded-full border-white shadow-lg">
            <div>
              <Image
                className="object-fill w-full h-full rounded-full"
                src={
                  avatar.includes("https")
                    ? avatar
                    : `/images/user_avator/${avatar}@3x.png`
                }
                alt={name}
                width={120}
                height={120}
                priority
              />
            </div>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
