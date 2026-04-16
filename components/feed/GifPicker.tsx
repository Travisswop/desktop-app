import React, { useEffect } from "react";
import GifPicker from "gif-picker-react";
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

  const handleGifClick = (gifData: any) => {
    setMediaFiles((prev: any) => [...prev, { type: "gif", src: gifData.url }]);
    setShowGifPicker(false); // auto close on select
  };

  return (
    <CustomModal
      isOpen={showGifPicker}
      onCloseModal={setShowGifPicker}
      title="Pick a GIF"
    >
      <div className="p-3">
        <GifPicker
          onGifClick={handleGifClick}
          tenorApiKey={process.env.NEXT_PUBLIC_TENOR_API_KEY || ""}
          width="100%"
        />
      </div>
    </CustomModal>
  );
};

export default GifPickerContent;
