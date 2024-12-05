import Image from "next/image";
import React, { useEffect, useState } from "react";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Tooltip,
} from "@nextui-org/react";
import { IoLinkOutline } from "react-icons/io5";
import { LiaFileMedicalSolid } from "react-icons/lia";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import { FaAngleDown, FaTimes } from "react-icons/fa";
import { icon, newIcons } from "@/components/util/data/smartsiteIconData";
import { isEmptyObject } from "@/components/util/checkIsEmptyObject";
import AnimateButton from "@/components/ui/Button/AnimateButton";
import { MdInfoOutline } from "react-icons/md";
import { InfoBarIconMap, InfoBarSelectedIconType } from "@/types/smallIcon";
import contactCardImg from "@/public/images/IconShop/appIconContactCard.png";
import productImg from "@/public/images/product.png";
import toast from "react-hot-toast";

const AddMarketplace = ({ handleRemoveIcon, handleToggleIcon }: any) => {
  const accessToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NmY4ZDc1NGU5NTM5ZjY1ZWQwYTIzOTMiLCJpYXQiOjE3MzMxMTgzMDAsImV4cCI6MTc0MDg5NDMwMH0.G4uD_-TaH1C3ShVgl9mljQpRpKkwu4uzultYXU9CIew";
  const state: any = useSmartSiteApiDataStore((state) => state);

  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [categoryName, setCategoryName] = useState("");

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/nft/getAllTemplatesAndCollections`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        const data = await response.json();
        if (data.state === "success") {
          const templatesData = data.data.flatMap((item: any) =>
            Object.values(item.templatesByNftType).flat().map((template: any) => ({
              collectionId: item.collection.id,
              templateId: template.templateId,
              name: template.metadata.name,
              description: template.metadata.description,
              image: template.metadata.image,
            }))
          );
          setTemplates(templatesData);
        } else {
          toast.error("Failed to fetch templates.");
        }
      } catch (error) {
        console.error("Error fetching templates:", error);
        toast.error("Error fetching templates.");
      }
    };
    fetchTemplates();
  }, []);

  const handleSelectTemplate = async (collectionId: string, templateId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/nft/getTemplateDetails?collectionId=${collectionId}&templateId=${templateId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const data = await response.json();
      if (data.state === "success") {
        setSelectedTemplate(data.data.template);
      } else {
        toast.error("Failed to fetch template details.");
      }
    } catch (error) {
      console.error("Error fetching template details:", error);
      toast.error("Error fetching template details.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName) {
      toast.error("Category name cannot be empty.");
      return;
    }
    toast.success(`Category "${categoryName}" created successfully.`);
    setCategoryName("");
  };

  return (
    <div className="relative bg-white rounded-xl shadow-small p-6 flex flex-col gap-4">
      {/* Top Section */}
      <div className="flex items-end gap-1 justify-center">
        <h2 className="font-semibold text-gray-700 text-xl text-center">
          Marketplace
        </h2>
        <div className="translate-y-0.5">
          <Tooltip
            size="sm"
            content={
              <span className="font-medium">
                You will be able to set the icon type, choose an icon, specify a button
                name, provide a link, and add a description.
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
      <button
        className="absolute top-3 right-3"
        type="button"
        onClick={() => handleRemoveIcon("Marketplace")}
      >
        <FaTimes size={18} />
      </button>

      {/* Product Rendering Section */}
      <div className="flex flex-col gap-2 mt-4 px-10 2xl:px-[10%]">
        <div className="w-full rounded-xl border border-gray-300 p-3">
          <div className="w-full flex flex-col gap-3">
            {selectedTemplate ? (
              <>
                <div className="flex justify-center">
                  <Image
                    src={selectedTemplate.metadata.image}
                    width={300}
                    height={400}
                    alt={selectedTemplate.metadata.name}
                    className="w-48 h-auto rounded-full"
                  />
                </div>
                <div className="px-20 flex flex-col items-center gap-2">
                  <p className="text-gray-700 font-semibold">
                    {selectedTemplate.metadata.name}
                  </p>
                  <p className="text-gray-600 font-normal text-sm text-center">
                    {selectedTemplate.metadata.description}
                  </p>
                  <div className="flex items-center justify-between gap-4">
                    <AnimateButton
                      whiteLoading={true}
                      className="bg-black text-white py-2 !border-0"
                      isLoading={isLoading}
                      width="w-40"
                    >
                      Price ${selectedTemplate.price}
                    </AnimateButton>
                    <AnimateButton
                      whiteLoading={true}
                      className="bg-black text-white py-2 !border-0"
                      isLoading={isLoading}
                      width="w-44"
                    >
                      Add to Cart
                      <LiaFileMedicalSolid size={20} />
                    </AnimateButton>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-center">No item selected.</p>
            )}
          </div>
        </div>

        {/* Dropdown Section */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-700 w-20">Add Item</h3>
            <Dropdown className="w-max rounded-lg" placement="bottom-start">
              <DropdownTrigger>
                <button
                  className="bg-white w-48 2xl:w-64 flex justify-between items-center rounded px-2 py-2 text-sm font-medium shadow-small"
                >
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-black rounded-full"></div>
                    {selectedTemplate ? selectedTemplate.metadata.name : "Select Item"}
                  </span>
                  <FaAngleDown />
                </button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Select Template">
                {templates.map((template: any) => (
                  <DropdownItem
                    key={template.templateId}
                    onClick={() =>
                      handleSelectTemplate(template.collectionId, template.templateId)
                    }
                  >
                    {template.name}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>

        {/* Category Input Section */}
        <div>
          <form onSubmit={handleCreateCategory} className="flex flex-col gap-3">
            <div>
              <p className="font-semibold text-gray-700 mb-1">Category Name</p>
              <div>
                <input
                  type="text"
                  name="category"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
                  placeholder="Enter Category Name"
                  required
                />
              </div>
            </div>
            <div className="flex justify-center">
              <AnimateButton
                whiteLoading={true}
                className="bg-black text-white py-2 !border-0"
                isLoading={isLoading}
                width="w-52"
              >
                <LiaFileMedicalSolid size={20} />
                Create
              </AnimateButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddMarketplace;
