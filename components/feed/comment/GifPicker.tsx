import React, { useEffect, useRef, useState } from 'react';
import GifPicker from 'gif-picker-react';
import { HiOutlineGif } from 'react-icons/hi2';
import { useCommentContentStore } from '@/zustandStore/CommentImgContent';

const CommentGifPickerContent = () => {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { postContent, setPostContent } = useCommentContentStore(); //manage comment content

  const toggleGif = () => {
    setShowPicker(!showPicker);
  };

  const handleGifClick = (gifData: any) => {
    setPostContent([
      {
        type: 'image',
        src: gifData.url,
      },
    ]);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPicker]);

  return (
    <div className="relative flex items-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={postContent.length === 0 ? toggleGif : () => {}}
        className={`${postContent.length > 0 && 'cursor-not-allowed disabled'}`}
      >
        <HiOutlineGif
          size={23}
          className={`${
            postContent.length > 0 ? 'text-gray-400' : 'text-gray-700'
          }`}
        />
      </button>
      {showPicker && (
        <div ref={pickerRef} className="absolute top-full mt-2 z-50">
          <GifPicker
            onGifClick={handleGifClick}
            tenorApiKey={'AIzaSyA-Xn0TwTUBNXY4EBbDCmnAs7o1XYIoZgU'}
          />
        </div>
      )}
    </div>
  );
};

export default CommentGifPickerContent;
