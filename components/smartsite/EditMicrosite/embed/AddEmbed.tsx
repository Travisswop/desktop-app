import Image from "next/image";
import React, { useEffect, useState } from "react";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Tooltip,
} from "@nextui-org/react";
import { AiOutlineDownCircle } from "react-icons/ai";
import { IoLinkOutline } from "react-icons/io5";
import { LiaFileMedicalSolid } from "react-icons/lia";
// import { embedItems, icon } from "@/util/data/smartsiteIconData";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import { TikTokEmbed, XEmbed, YouTubeEmbed } from "react-social-media-embed";
// import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
// import AnimateButton from "../../Button/AnimateButton";
// import { toast } from "react-toastify";
import { postEmbedLink } from "@/actions/embedLink";
import { FaTimes } from "react-icons/fa";
import { embedItems, icon } from "@/components/util/data/smartsiteIconData";
import AnimateButton from "@/components/ui/Button/AnimateButton";
import { MdInfoOutline } from "react-icons/md";
import placeholder from "@/public/images/video_player_placeholder.gif";
import toast from "react-hot-toast";
import Cookies from "js-cookie";

const AddEmbed = ({ handleRemoveIcon }: any) => {
  const state: any = useSmartSiteApiDataStore((state) => state); //get small icon store value

  const [token, setToken] = useState("");

  useEffect(() => {
    const getAccessToken = async () => {
      const token = Cookies.get('access-token');
      setToken(token || "")
    };
    getAccessToken();
  }, []);

  //const sesstionState = useLoggedInUserStore((state) => state.state.user); //get session value

  const [embedLink, setEmbedLink] = useState("");

  const [selectedIcon, setSelectedIcon] = useState({
    category: "X",
    categoryIcon: icon.appIconTwitter,
    placeHolder: "https://www.x.com/{xUserName}/status/{tweetID}",
    inputText: "X Post Link",
    url: "www.x.com",
  });

  console.log("selectted icon", selectedIcon);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleEmbed = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const embedInfo = {
      micrositeId: state.data._id,
      link: formData.get("url"),
      type:
        selectedIcon.category === "X"
          ? "twitter"
          : selectedIcon.category.toLowerCase(),
    };

    try {
      const data = await postEmbedLink(embedInfo, token);
      // console.log("data", data);

      if ((data.state = "success")) {
        toast.success("Embed created successfully");
        handleRemoveIcon("Embed");
      } else {
        toast.error("Something went wrong!");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const modifyEmbedLink = (html: string, width: string, height: string) => {
    return html
      .replace(/width="[^"]*"/, `width="${width}"`)
      .replace(/height="[^"]*"/, `height="${height}"`);
  };

  const getEmbedItems: any = embedItems;

  return (
    <div className="relative bg-white rounded-xl shadow-small p-6 flex flex-col gap-4 px-10 2xl:px-[10%]">
      <div className="flex items-end gap-1 justify-center">
        <div className="flex items-end gap-1 justify-center">
          <h2 className="font-semibold text-gray-700 text-xl text-center">
            Embed
          </h2>
          <div className="translate-y-0.5">
            <Tooltip
              size="sm"
              content={
                <span className="font-medium">
                  Select which platform you want to embed and paste the link
                </span>
              }
              className={`max-w-40 h-auto`}
            >
              <button>
                <MdInfoOutline />
              </button>
            </Tooltip>
          </div>
        </div>
        <button
          className="absolute top-3 right-3"
          type="button"
          onClick={() => handleRemoveIcon("Embed")}
        >
          <FaTimes size={18} />
        </button>
      </div>
      <div className="border-2 border-[#d8acff] w-[100%] mx-auto h-auto flex justify-center p-1 bg-slate-100 rounded-lg">
        {!embedLink ? (
          <div className="relative w-full h-80">
            <Image
              src={placeholder}
              alt="blog photo"
              fill
              className="w-full h-full rounded-lg object-contain"
            />
          </div>
        ) : selectedIcon.category === "X" ? (
          <XEmbed url={embedLink} width={325} height={500} />
        ) : selectedIcon.category === "TikTok" ? (
          <TikTokEmbed url={embedLink} width={325} />
        ) : selectedIcon.category === "YouTube" ? (
          <YouTubeEmbed url={embedLink} width={400} height={300} />
        ) : selectedIcon.category === "Spotify" ? (
          <iframe
            src={embedLink}
            width="100%"
            height="352"
            style={{ borderRadius: "12px" }}
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          ></iframe>
        ) : selectedIcon.category === "Rumble" ? (
          <div
            dangerouslySetInnerHTML={{
              __html: modifyEmbedLink(embedLink, "400", "360"),
            }}
          ></div>
        ) : selectedIcon.category === "Streamable" ? (
          <div
            dangerouslySetInnerHTML={{
              __html: embedLink,
            }}
            className="w-full h-full"
          ></div>
        ) : (
          <div className="relative w-full h-80">
            <Image
              src={placeholder}
              alt="blog photo"
              fill
              className="w-full h-full rounded-lg object-contain"
            />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-700">Select Embed Type</h3>

          {selectedIcon && (
            <Image
              alt="app-icon"
              src={selectedIcon?.categoryIcon}
              className="w-4 h-auto"
              quality={100}
            />
          )}

          <Dropdown className="w-max rounded-lg" placement="bottom-start">
            <DropdownTrigger>
              <div className={`flex items-center`}>
                <button>
                  <AiOutlineDownCircle size={20} color="gray" />
                </button>
                {/* {isEmptyObject(selectedIconData) && ( */}
                <div className="hidden text-xs text-gray-600 px-2 w-28 py-1.5 bg-slate-200 shadow-medium z-50 absolute left-6 top-0 group-hover:flex justify-center">
                  <p>Embed Type</p>
                </div>
              </div>
            </DropdownTrigger>
            <DropdownMenu
              disabledKeys={["title"]}
              aria-label="Static Actions"
              className="p-2"
            >
              <DropdownItem
                key={"title"}
                className=" hover:!bg-white opacity-100 cursor-text disabled dropDownTitle"
              >
                <p>Choose Embed Type</p>
              </DropdownItem>
              {getEmbedItems.map((data: any) => (
                <DropdownItem
                  key={data.category}
                  onClick={() =>
                    setSelectedIcon({
                      category: data.category,
                      categoryIcon: data.categoryIcon,
                      placeHolder: data.placeHolder,
                      inputText: data.inputText,
                      url: data.url,
                    })
                  }
                  className="border-b rounded-none hover:rounded-md"
                >
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <Image
                      src={data.categoryIcon}
                      alt={data.category}
                      className="w-4 h-auto"
                      quality={100}
                    />
                    {data.category}
                  </div>
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>
      <div>
        <p className="font-semibold text-gray-700 mb-1">
          {selectedIcon.inputText} :
        </p>
        <form onSubmit={handleEmbed}>
          <div className="relative">
            <IoLinkOutline
              className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600"
              size={20}
            />
            <input
              type="text"
              name="url"
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-11 py-2 text-gray-700 bg-gray-100"
              placeholder={selectedIcon.placeHolder}
              required
              onChange={(e) => setEmbedLink(e.target.value)}
            />
          </div>
          <div className="flex justify-center mt-3">
            <AnimateButton
              className="bg-black text-white py-2 !border-0"
              whiteLoading={true}
              isLoading={isLoading}
              width={"w-40"}
            >
              <LiaFileMedicalSolid size={20} />
              Create
            </AnimateButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmbed;
