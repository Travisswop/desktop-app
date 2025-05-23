import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Tooltip,
} from '@nextui-org/react';
import { AiOutlineDownCircle } from 'react-icons/ai';
import { LiaFileMedicalSolid } from 'react-icons/lia';
import { FaAngleDown, FaTimes } from 'react-icons/fa';
import { MdDelete, MdInfoOutline } from 'react-icons/md';
import { deleteSwopPay, updateSwopPay } from '@/actions/swopPay';
import {
  currencyItems,
  icon,
} from '@/components/util/data/smartsiteIconData';
import { sendCloudinaryImage } from '@/lib/SendCloudinaryImage';
import CustomFileInput from '@/components/CustomFileInput';
import AnimateButton from '@/components/ui/Button/AnimateButton';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';

const UpdateSwopPay = ({ iconDataObj, isOn, setOff }: any) => {
  const [token, setToken] = useState('');

  useEffect(() => {
    const getAccessToken = async () => {
      const token = Cookies.get('access-token');
      setToken(token || '');
    };
    getAccessToken();
  }, []);

  const [isDeleteLoading, setIsDeleteLoading] =
    useState<boolean>(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [inputError, setInputError] = useState<any>({});
  const [imageFile, setImageFile] = useState<any>(null);
  const [fileError, setFileError] = useState<string>('');
  const [selectedIcon, setSelectedIcon] = useState({
    id: 4,
    name: 'Solana',
    icon: icon.appIconSolana,
    characterText: '$',
  });

  const [productName, setProductName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [price, setPrice] = useState<number>(50);

  const currencyList: any = currencyItems;

  useEffect(() => {
    const findIcon = currencyList.find(
      (item: any) => item.name === iconDataObj.data.currency
    );
    setSelectedIcon(findIcon);
  }, [currencyList, iconDataObj.data.currency]);

  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setFileError('File size should be less than 10 MB');
        setImageFile(null);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageFile(reader.result as any);
          setFileError('');
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleFormSubmit = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const info: any = {
      _id: iconDataObj.data._id,
      micrositeId: iconDataObj.data.micrositeId,
      title: formData.get('title'),
      price: formData.get('price'),
      description: formData.get('description'),
      paymentUrl: formData.get('paymentUrl'),
      currency: selectedIcon.name,
      imageUrl: imageFile || iconDataObj.data.imageUrl,
    };

    let errors = {};

    if (!info.title) {
      errors = { ...errors, title: 'title is required' };
    }
    if (!info.price) {
      errors = { ...errors, headline: 'price is required' };
    }
    if (!info.description) {
      errors = { ...errors, description: 'description is required' };
    }
    if (info.description && info?.description?.length < 5) {
      errors = {
        ...errors,
        description: 'description must be atleast 5 characters long',
      };
    }
    if (!info.paymentUrl) {
      errors = { ...errors, image: 'product url is required' };
    }
    if (!info.currency) {
      errors = { ...errors, image: 'currency is required' };
    }
    if (!info.imageUrl) {
      errors = { ...errors, image: 'image is required' };
    }

    if (Object.keys(errors).length > 0) {
      setInputError(errors);
      setIsLoading(false);
    } else {
      setInputError('');

      try {
        if (imageFile) {
          const imageUrl = await sendCloudinaryImage(info.imageUrl);
          if (!imageUrl) {
            return toast.error('photo upload failed!');
          }
          info.imageUrl = imageUrl;
        }
        const data = await updateSwopPay(info, token);

        if ((data.state = 'success')) {
          setOff();
          toast.success('Product updated successfully');
        } else {
          toast.error('Something went wrong!');
        }
      } catch (error) {
        toast.error('An error occurred');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const closeModal = () => {
    setOff();
  };

  const handleBackdropClick = (e: any) => {
    if (
      e.target.classList.contains('backdrop') &&
      !e.target.closest('.modal-content')
    ) {
      closeModal();
    }
  };

  const handleDelete = async () => {
    setIsDeleteLoading(true);
    const submitData = {
      _id: iconDataObj.data._id,
      micrositeId: iconDataObj.data.micrositeId,
    };
    try {
      const data: any = await deleteSwopPay(submitData, token);

      if (data && data?.state === 'success') {
        setOff();
        toast.success('Product deleted successfully');
      } else {
        toast.error('Something went wrong');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsDeleteLoading(false);
    }
  };

  useEffect(() => {
    setProductName(iconDataObj.data.title);
    setPrice(iconDataObj.data.price);
    setDescription(iconDataObj.data.description);
  }, [
    iconDataObj.data.description,
    iconDataObj.data.price,
    iconDataObj.data.title,
  ]);

  return (
    <>
      {isOn && (
        <div
          className="fixed z-50 left-0 top-0 h-full w-full overflow-auto flex items-center justify-center bg-overlay/50 backdrop"
          onMouseDown={handleBackdropClick}
        >
          <div
            ref={modalRef}
            className="modal-content h-max w-96 lg:w-[40rem] bg-white relative rounded-xl"
          >
            <button
              className="btn btn-sm btn-circle absolute right-4 top-[12px]"
              onClick={closeModal}
            >
              <FaTimes color="gray" />
            </button>
            <form
              onSubmit={handleFormSubmit}
              className="bg-white rounded-xl shadow-small px-8 py-6 flex flex-col gap-4"
            >
              <div className="flex items-end gap-1 justify-center">
                <h2 className="font-semibold text-gray-700 text-xl text-center">
                  Product Purchase
                </h2>
                <div className="translate-y-0.5">
                  <Tooltip
                    size="sm"
                    content={
                      <span className="font-medium">
                        You will be able to set the icon type, choose
                        an icon , specify a button name, provide a
                        link, and add a description.
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
              <div className="w-full rounded-xl bg-gray-200 p-3">
                <div className="flex items-center justify-between bg-white rounded-xl py-1 px-3">
                  <div className=" w-full flex items-center gap-2">
                    <Image
                      className="w-12 h-12 rounded-full"
                      src={
                        imageFile
                          ? imageFile
                          : iconDataObj?.data?.imageUrl
                      }
                      alt="icon"
                      width={90}
                      height={90}
                    />
                    <div>
                      <p className="text-gray-700 font-medium">
                        {productName}
                      </p>
                      <p className="text-gray-500 text-sm font-medium">
                        {description}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-700 font-medium">
                    ${price}
                  </p>
                </div>
              </div>
              <div className="flex justify-between gap-10">
                <div className="flex flex-col gap-3 flex-1">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-700 text-sm">
                        Upload Product Photo
                        <span className="text-red-600 font-medium text-sm mt-1">
                          *
                        </span>
                      </p>
                      <CustomFileInput
                        handleFileChange={handleFileChange}
                      />
                    </div>
                    {inputError.image && (
                      <p className="text-red-600 font-medium text-sm mt-2">
                        Image is required
                      </p>
                    )}
                    {fileError && (
                      <p className="text-red-600 font-medium text-sm mt-2">
                        {fileError}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="title"
                      className="font-medium text-sm"
                    >
                      Product Name
                      <span className="text-red-600 font-medium text-sm mt-1">
                        *
                      </span>
                    </label>
                    <div>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        defaultValue={iconDataObj.data.title}
                        className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-3 py-2 text-gray-700 bg-gray-100"
                        placeholder={'Enter product name'}
                        onChange={(e) =>
                          setProductName(e.target.value)
                        }
                      />
                      {inputError.title && (
                        <p className="text-red-600 font-medium text-sm mt-1">
                          product name is required
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="paymentUrl"
                      className="font-medium text-sm"
                    >
                      Product Url
                      <span className="text-red-600 font-medium text-sm mt-1">
                        *
                      </span>
                    </label>
                    <input
                      type="text"
                      id="paymentUrl"
                      name="paymentUrl"
                      defaultValue={iconDataObj.data.paymentUrl}
                      className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-3 py-2 text-gray-700 bg-gray-100"
                      placeholder={'Enter Product Url'}
                      //   required
                    />
                    {inputError.headline && (
                      <p className="text-red-600 font-medium text-sm">
                        product url is required
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-700">
                  Select Currency
                </h3>

                <Dropdown
                  className="w-max rounded-lg"
                  placement="bottom-start"
                >
                  <DropdownTrigger>
                    <div className={`flex items-center`}>
                      <button
                        type="button"
                        className="bg-white w-48 2xl:w-64 flex justify-between items-center rounded px-2 py-2 text-sm font-medium shadow-small"
                      >
                        <span className="flex items-center gap-2">
                          {selectedIcon && (
                            <Image
                              alt="app-icon"
                              src={selectedIcon.icon}
                              className="w-5 h-auto"
                            />
                          )}
                          {selectedIcon.name}
                        </span>{' '}
                        <FaAngleDown />
                      </button>
                      <div className="hidden text-xs text-gray-600 px-2 w-28 py-1.5 bg-slate-200 shadow-medium z-50 absolute left-6 top-0 group-hover:flex justify-center">
                        <p>select icon type</p>
                      </div>
                    </div>
                  </DropdownTrigger>
                  <DropdownMenu
                    disabledKeys={['title']}
                    aria-label="Static Actions"
                    className="p-2"
                  >
                    <DropdownItem
                      key={'title'}
                      className=" hover:!bg-white opacity-100 cursor-text disabled dropDownTitle"
                    >
                      <p>Choose Icon</p>
                    </DropdownItem>
                    {currencyList.map((data: any) => (
                      <DropdownItem
                        key={data.id}
                        onClick={() =>
                          setSelectedIcon({
                            id: data.id,
                            name: data.name,
                            icon: data.icon,
                            characterText: '$',
                          })
                        }
                        className="border-b rounded-none hover:rounded-md"
                      >
                        <div className="flex items-center gap-2 font-semibold text-sm">
                          <Image
                            src={data.icon}
                            alt={data.name}
                            className="w-4 h-auto"
                            quality={100}
                            //   style={tintStyle}
                          />
                          {data.name}
                        </div>
                      </DropdownItem>
                    ))}
                  </DropdownMenu>
                </Dropdown>
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="price"
                  className="font-medium text-sm"
                >
                  Price
                  <span className="text-red-600 font-medium text-sm mt-1">
                    *
                  </span>
                </label>
                <div>
                  <div className="relative">
                    <p className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600">
                      <Image
                        src={selectedIcon.icon}
                        alt={selectedIcon.name}
                        width={20}
                        height={20}
                      />
                    </p>
                    <input
                      type="text"
                      name="price"
                      id="price"
                      defaultValue={iconDataObj.data.price}
                      className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-11 py-2 text-gray-700 bg-gray-100"
                      placeholder={'Enter product price'}
                      onChange={(e) =>
                        setPrice(Number(e.target.value))
                      }
                      required
                    />
                  </div>
                  {inputError.price && (
                    <p className="text-red-600 font-medium text-sm mt-1">
                      price is required
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="description"
                  className="font-medium text-sm"
                >
                  Description
                  <span className="text-red-600 font-medium text-sm mt-1">
                    *
                  </span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  defaultValue={iconDataObj.data.description}
                  className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-3 py-2 text-gray-700 bg-gray-100"
                  placeholder={'Enter description'}
                  onChange={(e) => setDescription(e.target.value)}
                />
                {inputError.description && (
                  <p className="text-red-600 font-medium text-sm">
                    {inputError.description}
                  </p>
                )}
              </div>
              <div className="flex justify-between mt-3">
                <AnimateButton
                  whiteLoading={true}
                  className="bg-black text-white py-2 !border-0"
                  isLoading={isLoading}
                  width={'w-52'}
                >
                  <LiaFileMedicalSolid size={20} />
                  Update Changes
                </AnimateButton>
                <AnimateButton
                  whiteLoading={true}
                  className="bg-black text-white py-2 !border-0"
                  type="button"
                  onClick={handleDelete}
                  isLoading={isDeleteLoading}
                  width={'w-28'}
                >
                  <MdDelete size={20} /> Delete
                </AnimateButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UpdateSwopPay;
