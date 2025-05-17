'use client';
import { Spinner } from '@nextui-org/react';
import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import {
  QrCode1,
  QrCode2,
  QrCode3,
  QrCode4,
} from '@/components/smartsite/qrCode/QRData';
import qrJson1 from '@/components/smartsite/qrCode/qr-code-json/1-A.json';
import qrJson2 from '@/components/smartsite/qrCode/qr-code-json/2-A.json';
import qrJson3 from '@/components/smartsite/qrCode/qr-code-json/3-A.json';
import qrJson4 from '@/components/smartsite/qrCode/qr-code-json/4-A.json';
import { FaSave } from 'react-icons/fa';
import { postCustomQrCode } from '@/actions/customQrCode';
import { useRouter } from 'next/navigation';
import { sendCloudinaryImage } from '@/lib/SendCloudinaryImage';
import { useToast } from '@/hooks/use-toast';
import CustomFileInput from '@/components/CustomFileInput';
import DynamicPrimaryBtn from '@/components/ui/Button/DynamicPrimaryBtn';
import logger from '@/utils/logger';

const EditQRCode = ({ qrCodeData, token }: any) => {
  const [color, setColor] = useState('#B396FF');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [toggle, setToggle] = useState(false);
  const [backgroundColorToggle, setBackgroundColorToggle] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<any>(null);
  const [fileError, setFileError] = useState<string>('');
  const [qrPattern, setQrPattern] = useState('style1');
  const [imageUrl, setImageUrl] = useState('');

  const router = useRouter();
  const { toast } = useToast();

  const backgroundUpdatePickerRef = useRef<HTMLDivElement>(null);
  const updateColorPickerRef = useRef<HTMLDivElement>(null);

  // Initialize state from qrCodeData
  useEffect(() => {
    setQrPattern(qrCodeData.qrCodeSvgName);
    setBgColor(qrCodeData.backgroundColor);
    setColor(qrCodeData.qrDotColor);
    setImageUrl(qrCodeData.overLayImage);
  }, [
    qrCodeData.backgroundColor,
    qrCodeData.overLayImage,
    qrCodeData.qrCodeSvgName,
    qrCodeData.qrDotColor,
  ]);

  // Common colors array used for both QR and background
  const defaultColors = [
    { _id: '1234', hexCode: '#000000' },
    { _id: '11234', hexCode: '#E6379A' },
    { _id: '12534', hexCode: '#6F2FC0' },
    { _id: '12314', hexCode: '#FF6C08' },
    { _id: '15234', hexCode: '#FF9500' },
    { _id: '12334', hexCode: '#6B6B6B' },
    { _id: '12324', hexCode: '#BF0000' },
    { _id: '12344', hexCode: '#027AFF' },
  ];

  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setFileError('*File size must be less than 10 MB');
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
    e.preventDefault();
    setIsLoading(true);

    let qrData;
    switch (qrPattern) {
      case 'style1':
        qrData = { ...qrJson1, data: qrCodeData.qrCodeUrl };
        break;
      case 'style2':
        qrData = { ...qrJson2, data: qrCodeData.qrCodeUrl };
        break;
      case 'style3':
        qrData = { ...qrJson3, data: qrCodeData.qrCodeUrl };
        break;
      case 'style4':
        qrData = { ...qrJson4, data: qrCodeData.qrCodeUrl };
        break;
      default:
        qrData = { ...qrJson1, data: qrCodeData.qrCodeUrl };
    }

    try {
      // Handle image upload or use existing image
      if (imageFile) {
        const uploadedImageUrl = await sendCloudinaryImage(imageFile);
        qrData.image = uploadedImageUrl;
      } else {
        qrData.image = imageUrl;
      }

      // Update QR code styling
      qrData.backgroundOptions = { color: bgColor };
      qrData.dotsOptions = { ...qrData.dotsOptions, color };
      qrData.data = qrCodeData.qrCodeUrl;
      qrData.cornersDotOptions = {
        ...qrData.cornersDotOptions,
        color,
      };
      qrData.cornersSquareOptions = {
        ...qrData.cornersSquareOptions,
        color,
      };

      const payload = {
        micrositeId: qrCodeData.microsite,
        qrStyleData: qrData,
        qrCodeSvgName: qrPattern,
        currentUrl: qrCodeData.qrCodeUrl,
      };

      const data = await postCustomQrCode(payload, token);

      if (data?.state === 'success') {
        router.back();
        toast({
          title: 'Success',
          description: 'QR code updated successfully',
        });
      }
    } catch (error) {
      logger.error('Error updating QR code:', error);
      toast({
        title: 'Error',
        description: 'Something went wrong!',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Close color pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        backgroundUpdatePickerRef.current &&
        !backgroundUpdatePickerRef.current.contains(
          event.target as Node
        )
      ) {
        setBackgroundColorToggle(false);
      }

      if (
        updateColorPickerRef.current &&
        !updateColorPickerRef.current.contains(event.target as Node)
      ) {
        setToggle(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper function to render QR code based on selected style
  const renderQRCode = (
    style: string,
    color: string,
    isPreview = false
  ) => {
    const props = {
      height: isPreview ? 200 : 100,
      width: isPreview ? 200 : 100,
      color: isPreview
        ? color
        : style === qrPattern
        ? 'white'
        : 'black',
      className: isPreview
        ? ''
        : '-translate-x-[54px] -translate-y-[54px]',
      value: isPreview ? 'hola testing' : undefined,
    };

    switch (style) {
      case 'style1':
        return <QrCode1 {...props} />;
      case 'style2':
        return <QrCode2 {...props} />;
      case 'style3':
        return <QrCode3 {...props} />;
      case 'style4':
        return <QrCode4 {...props} />;
      default:
        return <QrCode1 {...props} />;
    }
  };

  return (
    <main className="main-container overflow-hidden">
      <div className="flex gap-6 items-start">
        <div className="w-[62%] border-r border-gray-300 pr-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold text-gray-700">
              Customize QR
            </p>
          </div>
          <form
            onSubmit={handleFormSubmit}
            className="bg-white py-6 px-10 flex flex-col gap-4"
          >
            <div>
              <p className="heading-4 mb-2">Choose A Pattern: </p>
              <div className="flex items-center gap-2">
                {['style1', 'style2', 'style3', 'style4'].map(
                  (style) => (
                    <button
                      key={style}
                      type="button"
                      className={`w-12 h-12 overflow-hidden rounded-lg ${
                        qrPattern === style
                          ? 'bg-black border-2 border-black'
                          : 'bg-white'
                      }`}
                      onClick={() => setQrPattern(style)}
                    >
                      {renderQRCode(style, color)}
                    </button>
                  )
                )}
              </div>
            </div>

            <div>
              <p className="heading-4 mb-2">Pick QR Color: </p>
              <div className="flex items-center gap-3 bg-gray-100 p-2 rounded-lg">
                <button
                  type="button"
                  onClick={() => setToggle(!toggle)}
                >
                  <Image
                    alt="pick color"
                    src={'/images/color.png'}
                    width={40}
                    height={40}
                  />
                </button>
                <p className="text-gray-400">
                  {!color || color === '#NaNNaNNaN' ? '#HEX' : color}
                </p>
              </div>
              <div className="w-max" ref={updateColorPickerRef}>
                {toggle && (
                  <HexColorPicker color={color} onChange={setColor} />
                )}
              </div>
            </div>

            <div>
              <p className="heading-4 mb-2">Default QR Colors: </p>
              <div className="flex items-center gap-3">
                {defaultColors.map((data) => (
                  <button
                    type="button"
                    key={data._id}
                    onClick={() => setColor(data.hexCode)}
                    className={`rounded-full ${
                      color === data.hexCode &&
                      'border-2 border-[#027AFF] p-1'
                    }`}
                  >
                    <div
                      style={{ backgroundColor: data.hexCode }}
                      className="w-11 h-11 rounded-full"
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="heading-4 mb-2">
                Choose Background Color:{' '}
              </p>
              <div className="flex items-center gap-3 bg-gray-100 p-2 rounded-lg">
                <button
                  type="button"
                  onClick={() =>
                    setBackgroundColorToggle(!backgroundColorToggle)
                  }
                >
                  <Image
                    alt="pick color"
                    src={'/images/color.png'}
                    width={40}
                    height={40}
                  />
                </button>
                <p className="text-gray-400">
                  {!bgColor || bgColor === '#NaNNaNNaN'
                    ? '#HEX'
                    : bgColor}
                </p>
              </div>
              <div ref={backgroundUpdatePickerRef} className="w-max">
                {backgroundColorToggle && (
                  <HexColorPicker
                    color={bgColor}
                    onChange={setBgColor}
                  />
                )}
              </div>
            </div>

            <div>
              <p className="heading-4 mb-2">
                Default Background Colors:{' '}
              </p>
              <div className="flex items-center gap-3">
                {defaultColors.map((data) => (
                  <button
                    type="button"
                    key={data._id}
                    onClick={() => setBgColor(data.hexCode)}
                    className={`rounded-full ${
                      bgColor === data.hexCode &&
                      'border-2 border-[#027AFF] p-1'
                    }`}
                  >
                    <div
                      style={{ backgroundColor: data.hexCode }}
                      className="w-11 h-11 rounded-full"
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col 2xl:flex-row 2xl:items-center gap-2">
              <p className="font-semibold text-gray-700 text-sm">
                Edit Logo:
              </p>
              <CustomFileInput handleFileChange={handleFileChange} />
              {fileError && (
                <p className="text-red-600 text-sm font-medium">
                  {fileError}
                </p>
              )}
            </div>

            <div>
              <DynamicPrimaryBtn
                type="submit"
                disabled={isLoading}
                className="mt-3 w-48"
              >
                {isLoading ? (
                  <Spinner
                    className="py-0.5"
                    size="sm"
                    color="white"
                  />
                ) : (
                  <>
                    <FaSave size={18} />
                    Save Changes
                  </>
                )}
              </DynamicPrimaryBtn>
            </div>
          </form>
        </div>

        {/* Live preview */}
        <div className="w-[38%] flex flex-col items-center gap-4">
          <p className="text-gray-500 font-medium mb-2">
            Live Preview
          </p>
          <div className="bg-white p-2.5 rounded-xl shadow-medium">
            <div
              style={{ backgroundColor: bgColor }}
              className="relative p-2 rounded-lg"
            >
              {renderQRCode(qrPattern, color, true)}

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <Image
                  src={imageFile || qrCodeData.overLayImage}
                  quality={100}
                  alt="logo"
                  width={200}
                  height={200}
                  className="w-12 h-12"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default EditQRCode;
