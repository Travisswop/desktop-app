import React, { useEffect, useRef, useState } from 'react';
import { LiaFileMedicalSolid } from 'react-icons/lia';
import { FaTimes } from 'react-icons/fa';
import { MdDelete, MdInfoOutline } from 'react-icons/md';
import { deleteVideo, updateVideo } from '@/actions/video';
import { sendCloudinaryVideo } from '@/lib/sendCloudinaryVideo';
import CustomFileInput from '@/components/CustomFileInput';
import AnimateButton from '@/components/ui/Button/AnimateButton';
import { Tooltip } from '@nextui-org/react';
import Image from 'next/image';
import filePlaceholder from '@/public/images/placeholder-photo.png';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';

const UpdateVideo = ({ iconDataObj, isOn, setOff }: any) => {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDeleteLoading, setIsDeleteLoading] =
    useState<boolean>(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [inputError, setInputError] = useState<any>({});
  const [videoFile, setVideoFile] = useState<any>(null);
  const [fileError, setFileError] = useState<string>('');
  const [attachLink, setAttachLink] = useState<string>('');

  useEffect(() => {
    const getAccessToken = async () => {
      const token = Cookies.get('access-token');
      setToken(token || '');
    };
    getAccessToken();
  }, []);

  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('video/')) {
      if (file.size > 20 * 1024 * 1024) {
        setFileError('File size should be less than 20 MB');
        setVideoFile(null);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setVideoFile(reader.result as any);
          setFileError('');
        };
        reader.readAsDataURL(file);
      }
    } else {
      setFileError('Please upload a valid video file.');
    }
  };

  const handleFormSubmit = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const info = {
      _id: iconDataObj.data._id,
      micrositeId: iconDataObj.data.micrositeId,
      title: formData.get('title'),
      file: videoFile || iconDataObj.data.link,
      attachLink: attachLink,
    };

    let errors = {};

    if (!info.title) {
      errors = { ...errors, title: 'title is required' };
    }
    if (!info.file && !attachLink) {
      errors = { ...errors, image: 'video is required' };
    }

    if (Object.keys(errors).length > 0) {
      setInputError(errors);
      setIsLoading(false);
    } else {
      setInputError('');
      try {
        if (videoFile) {
          const videoUrl = await sendCloudinaryVideo(info.file);
          if (!videoUrl) {
            toast.error('Image upload failed!');
          }
          info.file = videoUrl;
        } else if (attachLink) {
          info.file = attachLink;
        }

        const data = await updateVideo(info, token);

        if ((data.state = 'success')) {
          setOff();
          toast.success('Video updated successfully');
        } else {
          toast.error('Something went wrong!');
        }
      } catch (error) {
        console.error(error);
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
      const data: any = await deleteVideo(submitData, token);

      if (data && data?.state === 'success') {
        setOff();
        toast.success('Video deleted successfully');
        setOff();
      } else {
        toast.error('Something went wrong!');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleteLoading(false);
    }
  };

  return (
    <>
      {isOn && (
        <div
          className="fixed z-50 left-0 top-0 h-full w-full overflow-auto flex items-center justify-center bg-overlay/50 backdrop"
          onMouseDown={handleBackdropClick}
        >
          <div
            ref={modalRef}
            className="modal-content w-96 lg:w-[40rem] h-[90vh] hide-scrollbar overflow-y-auto bg-white relative rounded-xl"
          >
            <button
              className="btn btn-sm btn-circle absolute right-4 top-[12px]"
              onClick={closeModal}
            >
              <FaTimes color="gray" />
            </button>
            <div className="bg-white rounded-xl shadow-small p-6 flex flex-col gap-4">
              <form
                onSubmit={handleFormSubmit}
                className="bg-white flex flex-col gap-4"
              >
                <div className="flex items-end gap-1 justify-center">
                  <div className="flex items-end gap-1 justify-center">
                    <h2 className="font-semibold text-gray-700 text-xl text-center">
                      Video
                    </h2>
                    <div className="translate-y-0.5">
                      <Tooltip
                        size="sm"
                        content={
                          <span className="font-medium">
                            You can embed a video by either uploading
                            it directly or sharing an external link,
                            along with providing a title for the
                            content.
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
                </div>
                <div className="flex justify-between gap-10">
                  <div className="flex flex-col gap-3 flex-1">
                    <div className="flex flex-col gap-1">
                      <div className="">
                        <div className="border-2 border-[#d8acff] w-full h-80 p-1 bg-slate-100 rounded-lg">
                          {videoFile ? (
                            <video
                              key={videoFile as string}
                              className="w-full h-full object-cover rounded-lg"
                              controls
                            >
                              <source
                                src={videoFile as string}
                                type="video/mp4"
                              />
                              <track
                                src="/path/to/captions.vtt"
                                kind="subtitles"
                                srcLang="en"
                                label="English"
                              />
                              Your browser does not support the video
                              tag.
                            </video>
                          ) : (
                            <video
                              key={iconDataObj.data.link as string}
                              className="w-full h-full object-cover rounded-lg"
                              controls
                            >
                              <source
                                src={iconDataObj.data.link as string}
                                type="video/mp4"
                              />
                              <track
                                src="/path/to/captions.vtt"
                                kind="subtitles"
                                srcLang="en"
                                label="English"
                              />
                              Your browser does not support the video
                              tag.
                            </video>
                          )}
                        </div>
                        {inputError.image && (
                          <p className="text-red-600 font-medium text-sm mt-1">
                            Video is required
                          </p>
                        )}

                        {fileError && (
                          <p className="text-red-600 font-medium text-sm mt-1">
                            {fileError}
                          </p>
                        )}
                        <div className="mt-2">
                          <p className="font-semibold text-gray-700 text-sm mb-1">
                            Add Your Video
                            <span className="text-red-600 font-medium text-sm mt-1">
                              *
                            </span>
                          </p>
                          <div className="w-full bg-white shadow-medium rounded-xl px-20 py-10">
                            <div className="bg-gray-100 rounded-xl p-4 flex flex-col items-center gap-2">
                              <Image
                                src={filePlaceholder}
                                alt="placeholder"
                                className="w-12"
                              />
                              <p className="text-gray-400 font-normal text-sm">
                                Select Video
                              </p>
                              <CustomFileInput
                                title={'Browse'}
                                handleFileChange={handleFileChange}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="font-medium">
                        Title
                        <span className="text-red-600 font-medium text-sm mt-1">
                          *
                        </span>
                      </p>
                      <div>
                        <input
                          type="text"
                          name="title"
                          defaultValue={iconDataObj.data.title}
                          className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-3 py-2 text-gray-700 bg-gray-100"
                          placeholder={'Enter video title'}
                          // required
                        />
                        {inputError.title && (
                          <p className="text-red-600 font-medium text-sm mt-1">
                            title is required
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="font-medium">Attach Link</p>
                      <div>
                        <input
                          type="url"
                          name="link"
                          className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-3 py-2 text-gray-700 bg-gray-100"
                          placeholder={'Enter video url'}
                          onChange={(e) =>
                            setAttachLink(e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between mt-3">
                  <AnimateButton
                    className="bg-black text-white py-2 !border-0"
                    whiteLoading={true}
                    isLoading={isLoading}
                    width={'w-52'}
                  >
                    <LiaFileMedicalSolid size={20} />
                    Save Changes
                  </AnimateButton>
                  <AnimateButton
                    className="bg-black text-white py-2 !border-0"
                    whiteLoading={true}
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
        </div>
      )}
    </>
  );
};

export default UpdateVideo;
