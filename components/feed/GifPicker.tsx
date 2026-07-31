import React, { useEffect } from "react";
import { GifPicker, type Gif } from "gif-picker-react";
import { gifProvider } from "@/lib/gifs";
import CustomModal from "../modal/CustomModal";

interface GifProps {
  mediaFilesLength: any;
  setMediaFiles: any;
  setFileError: any;
  showGifPicker: boolean;
  setShowGifPicker: (show: boolean) => void;
}

const GifPickerContent = ({
  mediaFilesLength,
  setMediaFiles,
  setFileError,
  showGifPicker,
  setShowGifPicker,
}: GifProps) => {
  useEffect(() => {
    if (mediaFilesLength > 4) {
      setFileError("You can select a maximum of 4 files.");
    }
    if (mediaFilesLength === 4) {
      setShowGifPicker(false);
    }
  }, [mediaFilesLength, setFileError, setShowGifPicker]);

  const handleGifClick = (gifData: Gif) => {
    setMediaFiles((prev: any) => [
      ...prev,
      { type: "gif", src: gifData.imageUrl },
    ]);
    setShowGifPicker(false); // auto close on select
  };

  if (!gifProvider) return null;

  return (
    <CustomModal
      isOpen={showGifPicker}
      onCloseModal={setShowGifPicker}
      title="Pick a GIF"
    >
      <div className="p-3">
        <GifPicker
          onGifClick={handleGifClick}
          provider={gifProvider}
          width="100%"
        />
      </div>
    </CustomModal>
  );
};

export default GifPickerContent;
