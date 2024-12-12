'use client';
import { Spinner } from '@nextui-org/react';
import Image from 'next/image';
import React, { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { sendCloudinaryImage } from '@/lib/SendCloudineryImage';
import CustomFileInput from '@/components/CustomFileInput';
import DynamicPrimaryBtn from '@/components/ui/Button/DynamicPrimaryBtn';

const EditOldQRCode = ({ profileUrl, micrositeId, token }: any) => {
  const [color, setColor] = useState('#B396FF');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [toggle, setToggle] = useState(false);
  const [backgroundColorToggle, setBackgroundColorToggle] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<any>(null);
  const [fileError, setFileError] = useState<string>('');
  const [qrPattern, setQrPattern] = useState('style1');

  const { toast } = useToast();

  // console.log("imageFilesss", imageFile);

  const router = useRouter();

  const defaultColorArray = [
    {
      _id: '1234',
      hexCode: '#000000',
    },
    {
      _id: '11234',
      hexCode: '#E6379A',
    },
    {
      _id: '12534',
      hexCode: '#6F2FC0',
    },
    {
      _id: '12314',
      hexCode: '#FF6C08',
    },
    {
      _id: '15234',
      hexCode: '#FF9500',
    },
    {
      _id: '12334',
      hexCode: '#6B6B6B',
    },
    {
      _id: '12324',
      hexCode: '#BF0000',
    },
    {
      _id: '12344',
      hexCode: '#027AFF',
    },
  ];

  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        // Check if file size is greater than 10 MB
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

    // console.log("hit 1");

    let qrData;
    switch (qrPattern) {
      case 'style1':
        qrData = { ...qrJson1 };
        break;
      case 'style2':
        qrData = { ...qrJson2 };
        break;
      case 'style3':
        qrData = { ...qrJson3 };
        break;
      case 'style4':
        qrData = { ...qrJson4 };
        break;
      default:
        qrData = { ...qrJson1 };
    }

    // Update the JSON data with current state values
    // qrData.dotsOptions.color = color;
    // qrData.backgroundOptions.color = bgColor || "#ffffff00";

    // console.log("hit 2");

    console.log('imageFile', imageFile);

    try {
      if (imageFile) {
        const imageUrl = await sendCloudinaryImage(imageFile);
        qrData.image = imageUrl;
      }

      qrData.backgroundOptions = { color: bgColor };
      qrData.dotsOptions = { ...qrData.dotsOptions, color: color };
      qrData.data = profileUrl;
      // corner dot color
      qrData.cornersDotOptions = {
        ...qrData.cornersDotOptions,
        color: color,
      };
      qrData.cornersSquareOptions = {
        ...qrData.cornersSquareOptions,
        color: color,
      };

      // console.log("qrData", qrData);

      const payload = {
        micrositeId: micrositeId,
        currentUrl: profileUrl,
        qrCodeSvgName: qrPattern,
        qrDotColor: color,
        qrStyleData: qrData,
      };

      // console.log("payload", payload);

      // console.log("hit 3");

      // Send the updated JSON data in a POST request
      const data: any = await postCustomQrCode(payload, token);

      // console.log("hit 4");

      // console.log("data for posrt", data);

      if (data && data.state === 'success') {
        router.back();
        toast({
          title: 'Success',
          description: 'Qr code updated',
        });
        setIsLoading(false);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong!',
      });
      setIsLoading(false);
    } finally {
      setIsLoading(false);
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
            {/* <div onClick={handleModal}>
              <EditMicrositeBtn>
                <FiSend />
                Share
              </EditMicrositeBtn>
            </div> */}
          </div>
          <form
            onSubmit={handleFormSubmit}
            className="bg-white py-6 px-10 flex flex-col gap-4"
          >
            <div>
              <p className="heading-4 mb-2">Choose A Pattern: </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`w-12 h-12 overflow-hidden rounded-lg ${
                    qrPattern === 'style1'
                      ? 'bg-black border-2 border-black'
                      : 'bg-white'
                  }`}
                  onClick={() => setQrPattern('style1')}
                >
                  <QrCode1
                    height={100}
                    width={100}
                    color={qrPattern === 'style1' ? 'white' : 'black'}
                    className={
                      '-translate-x-[54px] -translate-y-[54px]'
                    }
                  />
                </button>

                <button
                  type="button"
                  className={`w-12 h-12 overflow-hidden rounded-lg ${
                    qrPattern === 'style2'
                      ? 'bg-black border-2 border-black'
                      : 'bg-white'
                  }`}
                  onClick={() => setQrPattern('style2')}
                >
                  <QrCode2
                    height={100}
                    width={100}
                    color={qrPattern === 'style2' ? 'white' : 'black'}
                    className={
                      '-translate-x-[54px] -translate-y-[54px]'
                    }
                  />
                </button>

                <button
                  type="button"
                  className={`w-12 h-12 overflow-hidden rounded-lg ${
                    qrPattern === 'style3'
                      ? 'bg-black border-2 border-black'
                      : 'bg-white'
                  }`}
                  onClick={() => setQrPattern('style3')}
                >
                  <QrCode3
                    height={100}
                    width={100}
                    color={qrPattern === 'style3' ? 'white' : 'black'}
                    className={
                      '-translate-x-[54px] -translate-y-[54px]'
                    }
                  />
                </button>
                <button
                  type="button"
                  className={`w-12 h-12 overflow-hidden rounded-lg ${
                    qrPattern === 'style4'
                      ? 'bg-black border-2 border-black'
                      : 'bg-white'
                  }`}
                  onClick={() => setQrPattern('style4')}
                >
                  <QrCode4
                    height={100}
                    width={100}
                    color={qrPattern === 'style4' ? 'white' : 'black'}
                    className={
                      '-translate-x-[54px] -translate-y-[54px]'
                    }
                  />
                </button>
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
              {toggle && (
                <HexColorPicker color={color} onChange={setColor} />
              )}
            </div>
            <div>
              <p className="heading-4 mb-2">Default QR Colors: </p>
              <div className="flex items-center gap-3">
                {defaultColorArray.map((data) => (
                  <button
                    type="button"
                    key={data._id}
                    onClick={() => setColor(data.hexCode)}
                    className={`rounded-full ${
                      color === data.hexCode &&
                      'border-2 border-[#027AFF] p-1'
                    } `}
                  >
                    <div
                      style={{ backgroundColor: data.hexCode }}
                      className={`w-11 h-11 rounded-full`}
                    ></div>
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
              {backgroundColorToggle && (
                <HexColorPicker
                  color={bgColor}
                  onChange={setBgColor}
                />
              )}
            </div>
            <div>
              <p className="heading-4 mb-2">
                Default Background Colors:{' '}
              </p>
              <div className="flex items-center gap-3">
                {defaultColorArray.map((data) => (
                  <button
                    type="button"
                    key={data._id}
                    onClick={() => setBgColor(data.hexCode)}
                    className={`rounded-full ${
                      bgColor === data.hexCode &&
                      'border-2 border-[#027AFF] p-1'
                    } `}
                  >
                    <div
                      style={{ backgroundColor: data.hexCode }}
                      className={`w-11 h-11 rounded-full`}
                    ></div>
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
            {/* <div>
              <p className="heading-4 mb-2">Choose Frame Border: </p>
              <div className="flex items-center gap-3">
                <button
                  // onClick={() => setColor(data.hexCode)}
                  className={`rounded-full border border-[#027AFF] p-1 `}
                >
                  <div
                    className={`w-8 h-8 rounded-full border-[3px] border-gray-700`}
                  ></div>
                </button>
                <button
                  // onClick={() => setColor(data.hexCode)}
                  className={`border border-[#027AFF] p-1 `}
                >
                  <div className={`w-8 h-8 border-[3px] border-gray-700`}></div>
                </button>
                <button
                  // onClick={() => setColor(data.hexCode)}
                  className={`rounded-lg border border-[#027AFF] p-1 `}
                >
                  <div
                    className={`w-8 h-8 rounded-lg border-[3px] border-gray-700`}
                  ></div>
                </button>
              </div>
            </div>
            <div>
              <p className="heading-4 mb-2">Your Text: </p>
              <div>
                <input
                  type="text"
                  placeholder={`Scan Me`}
                  className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-lg focus:outline-none px-4 py-2.5 text-gray-700 bg-gray-100"
                />
                <div className="relative flex-1 py-6">
                  <IoLinkSharp
                    className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder={`Search Connections`}
                    className="w-full border border-gray-500 focus:border-[#e5e0e0] rounded-md focus:outline-none pl-10 py-2.5 text-gray-700 bg-gray-100"
                  />
                  <DynamicPrimaryBtn className="absolute right-4 top-1/2 -translate-y-[50%] font-bold text-gray-600 !rounded-full !py-1.5 !text-sm !gap-1">
                    <MdOutlineFileUpload size={18} /> Upload
                  </DynamicPrimaryBtn>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-4">
                <p className="heading-4 mb-2">QR Code Branding</p>
                <DynamicPrimaryBtn className="text-xs !py-1 !px-2 !gap-1">
                  <IoIosLock /> Pro
                </DynamicPrimaryBtn>
              </div>
              <div className="flex items-center gap-2">
                <p>I want to remove the swop logo: </p>
                <Switch
                  color="default"
                  size="sm"
                  defaultSelected
                  aria-label="Lead Captures"
                />
              </div>
            </div> */}
            <div>
              <DynamicPrimaryBtn
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
                    {' '}
                    <FaSave size={18} />
                    Save Changes
                  </>
                )}
              </DynamicPrimaryBtn>
            </div>
          </form>
        </div>

        {/* live preview  */}
        <div className="w-[38%] flex flex-col items-center gap-4">
          <p className="text-gray-500 font-medium mb-2">
            Live Preview
          </p>
          <div className="bg-white p-2.5 rounded-xl shadow-medium">
            <div
              style={{ backgroundColor: bgColor }}
              className={`relative p-2 rounded-lg`}
            >
              {qrPattern === 'style1' && (
                <QrCode1 width={200} height={200} color={color} />
              )}
              {qrPattern === 'style2' && (
                <QrCode2 width={200} height={200} color={color} />
              )}
              {qrPattern === 'style3' && (
                <QrCode3 width={200} height={200} color={color} />
              )}
              {qrPattern === 'style4' && (
                <QrCode4 width={200} height={200} color={color} />
              )}

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                {imageFile ? (
                  <Image
                    src={imageFile}
                    quality={100}
                    alt="logo"
                    width={200}
                    height={200}
                    className="w-12 h-12"
                  />
                ) : (
                  <Image
                    src={
                      'https://res.cloudinary.com/bayshore/image/upload/v1706786605/qr-logo_mwasoz.png'
                    }
                    quality={100}
                    alt="logo"
                    width={200}
                    height={200}
                    className="w-12 h-12"
                  />
                )}
              </div>
            </div>
          </div>
          {/* <p className="heading-4 mt-4">Select Download Type</p>
          <div>
            <RadioGroup value="PDF" orientation="horizontal" color="success">
              <Radio value="PDF">PDF</Radio>
              <Radio value="JPG">JPG</Radio>
              <Radio value="PNG">PNG</Radio>
              <Radio value="SVG">SVG</Radio>
            </RadioGroup>
          </div>
          <DynamicPrimaryBtn>
            <MdOutlineFileUpload size={18} />
            Download
          </DynamicPrimaryBtn> */}
        </div>
      </div>
    </main>
  );
};

export default EditOldQRCode;
