'use client';
import React, { useState } from 'react';

import Image from 'next/image';
import qrcode from '@/public/images/websites/qrcode.png';
import edit from '@/public/images/websites/icon/edit.svg';
import send from '@/public/images/websites/icon/send.svg';
import qrJson1 from '@/components/smartsite/qrCode/qr-code-json/1-A.json';
import { postUserCustomQrCode } from '@/actions/customQrCode';
import Link from 'next/link';

import { QrCode1 } from '@/components/smartsite/qrCode/QRData';
import { FiDownload } from 'react-icons/fi';
import QRCodeShareModal from '../smartsite/socialShare/QRCodeShareModal';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '@nextui-org/react';
import { Loader2, QrCode } from 'lucide-react';
import { useUser } from '@/lib/UserContext';

const CreateQRCode = () => {
  const { user, accessToken } = useUser();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const handleCreateQrCode = async (e: any) => {
    console.log('create qr code');
    try {
      e.preventDefault();
      setIsLoading(true);

      const qrData = { ...qrJson1 };

      const formData = new FormData(e.currentTarget);

      const payload = {
        userId: user?._id,
        customQrData: qrData,
        qrCodeName: formData.get('title'),
        data: formData.get('url'),
        qrCodeSvgName: 'QrCode1',
      };

      qrData.dotsOptions = {
        ...qrData.dotsOptions,
        color: '#000000',
      };

      qrData.cornersDotOptions = {
        ...qrData.cornersDotOptions,
        color: '#000000',
      };
      qrData.cornersSquareOptions = {
        ...qrData.cornersSquareOptions,
        color: '#000000',
      };

      // Send the updated JSON data in a POST request
      const data: any = await postUserCustomQrCode(
        payload,
        accessToken ?? '' // Provide empty string fallback for null case
      );

      //   console.log("create data ", data);

      if (data && data.status === 'success') {
        setData(data);
        toast({
          title: 'Qr code created',
          description: 'Qr code created successfully',
        });
        setIsLoading(false);
      } else {
        toast({
          title: 'something went wrong',
          description: 'Please try again later',
        });
      }
    } catch (error) {
      toast({
        title: 'something went wrong',
        description: 'Please try again later',
      });
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenShareModal = () => {
    setIsModalOpen(true);
  };

  console.log('data', data);

  return (
    <>
      <Card className="w-full mx-auto border-none">
        <CardHeader>
          <h5 className="text-lg text-gray-700 font-semibold mb-1">
            Create QR Code
          </h5>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6 items-center justify-between">
            <form onSubmit={handleCreateQrCode} className="w-full">
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Title"
                  name="title"
                  required
                  className="w-full bg-gray-200 py-2.5 rounded-full px-4 focus:outline-none"
                />

                <input
                  type="url"
                  placeholder="URL"
                  name="url"
                  required
                  className="w-full bg-gray-200 py-2.5 rounded-full px-4 focus:outline-none"
                />
              </div>
              <div className="flex justify-center w-full mt-4">
                <Button
                  className="w-full text-white bg-black"
                  type="submit"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <QrCode className="mr-2 h-4 w-4" />
                  )}
                  Generate QR
                </Button>
              </div>
            </form>
            {data ? (
              <div>
                <Image
                  alt="qr code"
                  src={
                    data?.data?.qrCodeUrl
                      ? data.data.qrCodeUrl
                      : qrcode
                  }
                  width={200}
                  height={200}
                  className="border-2 border-gray-600 rounded-2xl"
                />
                <div className="flex items-center gap-2 justify-center mt-2">
                  <Link
                    href={
                      data?.data?._id
                        ? `/qr-code/${data.data._id}`
                        : ''
                    }
                  >
                    <button
                      type="button"
                      className="bg-black p-2 rounded-lg"
                    >
                      <Image alt="edit" src={edit} width={16} />
                    </button>
                  </Link>
                  <button
                    type="button"
                    onClick={handleOpenShareModal}
                    className="bg-black p-2 rounded-lg"
                  >
                    <Image alt="send" src={send} width={16} />
                  </button>
                  <a
                    href={data.data.qrCodeUrl}
                    download="qrcode.png"
                    className="bg-black p-1.5 rounded-lg"
                  >
                    <FiDownload color="white" size={18} />
                  </a>
                </div>
              </div>
            ) : (
              <div className="border-2 border-gray-500 rounded-xl p-2 pb-4">
                <div className="relative w-[130px] h-[130px]">
                  <QrCode1 color={'black'} width={130} height={130} />
                  <Image
                    alt="swop-logo"
                    src={
                      'https://res.cloudinary.com/bayshore/image/upload/v1732872687/swop-logo_n9qal7.jpg'
                    }
                    width={90}
                    height={90}
                    className="absolute inset-0 m-auto w-8 h-8"
                  />
                  <p className="text-[8px] text-center">
                    Powered By SWOP
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      {isModalOpen && (
        <QRCodeShareModal
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          qrCodeUrl={data.data.qrCodeUrl}
        />
      )}
    </>
  );
};

export default CreateQRCode;
