import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { LiaFileMedicalSolid } from 'react-icons/lia';
import useSmartSiteApiDataStore from '@/zustandStore/UpdateSmartsiteInfo';
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import { postAudio } from '@/actions/audio';
import { FaTimes } from 'react-icons/fa';
import { sendCloudinaryAudio } from '@/lib/sendCloudinaryAudio';
import { sendCloudinaryImage } from '@/lib/SendCloudinaryImage';
import CustomFileInput from '@/components/CustomFileInput';
import AnimateButton from '@/components/ui/Button/AnimateButton';
import { MdInfoOutline } from 'react-icons/md';
import { Tooltip } from '@nextui-org/react';
import filePlaceholder from '@/public/images/placeholder-photo.png';
import { AiFillAudio } from 'react-icons/ai';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';

const AddAudio = ({ handleRemoveIcon }: any) => {
  const state: any = useSmartSiteApiDataStore((state) => state);
  const [token, setToken] = useState('');

  useEffect(() => {
    const getAccessToken = async () => {
      const token = Cookies.get('access-token');
      setToken(token || '');
    };
    getAccessToken();
  }, []);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [inputError, setInputError] = useState<any>({});
  const [audioFile, setAudioFile] = useState<any>(null);
  const [imageFile, setImageFile] = useState<any>(null);
  const [fileError, setFileError] = useState<string>('');
  const [imageFileError, setImageFileError] = useState<string>('');

  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('audio/')) {
      if (file.size > 10 * 1024 * 1024) {
        setFileError('File size should be less than 20 MB');
        setAudioFile(null);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioFile(reader.result as any);
          setFileError('');
        };
        reader.readAsDataURL(file);
      }
    } else {
      setFileError('Please upload a audio file.');
    }
  };

  const handleImageFileChange = (event: any) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 10 * 1024 * 1024) {
        setImageFileError('File size should be less than 10 MB');
        setImageFile(null);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageFile(reader.result as any);
          setImageFileError('');
        };
        reader.readAsDataURL(file);
      }
    } else {
      setImageFileError('Please upload a image file.');
    }
  };

  const handleFormSubmit = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const info = {
      micrositeId: state.data._id,
      name: formData.get('name'),
      file: audioFile,
      coverPhoto: imageFile,
    };

    let errors = {};

    if (!info.name) {
      errors = { ...errors, title: 'display name is required' };
    }
    if (!info.file) {
      errors = { ...errors, image: 'audio is required' };
    }
    if (!info.coverPhoto) {
      errors = { ...errors, image: 'cover photo is required' };
    }

    if (Object.keys(errors).length > 0) {
      setInputError(errors);
      setIsLoading(false);
    } else {
      setInputError('');
      try {
        const audioUrl = await sendCloudinaryAudio(info.file);
        if (!audioUrl) {
          toast.error('Audio upload failed!');
        }
        info.file = audioUrl;

        const imageUrl = await sendCloudinaryImage(info.coverPhoto);
        if (!imageUrl) {
          return toast.error('Cover photo upload failed!');
        }
        info.coverPhoto = imageUrl;

        if (imageUrl) {
          const data = await postAudio(info, token);

          if ((data.state = 'success')) {
            toast.success('Music created successfully');
            handleRemoveIcon('Mp3');
          } else {
            toast.error('Something went wrong!');
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      className="relative bg-white rounded-xl shadow-small p-6 flex flex-col gap-4 px-10 2xl:px-[10%]"
    >
      <div className="flex items-end gap-1 justify-center">
        <div className="flex items-end gap-1 justify-center">
          <h2 className="font-semibold text-gray-700 text-xl text-center">
            Audio
          </h2>
          <div className="translate-y-0.5">
            <Tooltip
              size="sm"
              content={
                <span className="font-medium">
                  Embed music to your smart site that people can
                  listen to.
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
          onClick={() => handleRemoveIcon('Mp3')}
        >
          <FaTimes size={18} />
        </button>
      </div>

      <div className="flex justify-between gap-10">
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex flex-col gap-1">
            <div className="">
              <div className="border-2 border-[#d8acff] w-full h-auto p-1 bg-slate-100 rounded-lg">
                {audioFile ? (
                  <AudioPlayer
                    autoPlay
                    src={audioFile}
                    className="h-full"
                  />
                ) : (
                  <div>
                    <AudioPlayer autoPlay src="" className="h-full" />
                  </div>
                )}
              </div>
              {inputError.image && (
                <p className="text-red-600 font-medium text-sm mt-1">
                  Audio is required
                </p>
              )}
            </div>
          </div>
          <div className="">
            <p className="font-semibold text-gray-700 text-sm mb-1">
              Select Mp3 File
              <span className="text-red-600 font-medium text-sm mt-1">
                *
              </span>
            </p>
            <div className="w-full bg-white shadow-medium rounded-xl px-20 py-10">
              <div className="bg-gray-100 rounded-xl p-4 flex flex-col items-center gap-2">
                <AiFillAudio color="gray" size={30} />
                <p className="text-gray-400 font-normal text-sm">
                  Select Mp3 File
                </p>
                <CustomFileInput
                  title={'Browse'}
                  handleFileChange={handleFileChange}
                />
                {inputError.image && (
                  <p className="text-red-600 font-medium text-sm mt-1">
                    Audio is required
                  </p>
                )}

                {fileError && (
                  <p className="text-red-600 font-medium text-sm mt-1">
                    {fileError}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-medium">
              Display Name
              <span className="text-red-600 font-medium text-sm mt-1">
                *
              </span>
            </p>
            <div>
              <input
                type="text"
                name="name"
                className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-3 py-2 text-gray-700 bg-gray-100"
                placeholder={'Enter display name'}
              />
              {inputError.title && (
                <p className="text-red-600 font-medium text-sm mt-1">
                  display name is required
                </p>
              )}
            </div>
          </div>
          <div className="">
            <p className="font-semibold text-gray-700 text-sm mb-1">
              Select Cover Photo
              <span className="text-red-600 font-medium text-sm mt-1">
                *
              </span>
            </p>
            <div className="w-full bg-white shadow-medium rounded-xl px-20 py-10">
              <div className="bg-gray-100 rounded-xl p-4 flex flex-col items-center gap-2">
                <div className="w-16 h-10">
                  {imageFile ? (
                    <Image
                      src={imageFile}
                      alt="cover photo"
                      width={120}
                      height={120}
                      className="rounded w-full h-full"
                    />
                  ) : (
                    <Image
                      src={filePlaceholder}
                      alt="placeholder"
                      className="w-10 h-auto mx-auto"
                    />
                  )}
                </div>
                <p className="text-gray-400 font-normal text-sm">
                  Select Cover Photo
                </p>
                <CustomFileInput
                  title={'Browse'}
                  handleFileChange={handleImageFileChange}
                />
                {inputError.image && (
                  <p className="text-red-600 font-medium text-sm mt-1">
                    cover photo is required
                  </p>
                )}

                {imageFileError && (
                  <p className="text-red-600 font-medium text-sm mt-1">
                    {imageFileError}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-center">
        <AnimateButton
          className="bg-black text-white py-2 !border-0"
          whiteLoading={true}
          isLoading={isLoading}
          width={'w-40'}
        >
          <LiaFileMedicalSolid size={20} />
          Create
        </AnimateButton>
      </div>
    </form>
  );
};

export default AddAudio;
