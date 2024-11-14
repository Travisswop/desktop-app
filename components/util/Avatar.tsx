import Image from "next/image";
import React from "react";

interface IAvatar {
  src: string;
  alt?: string;
  width?: number; // Optional property
  height?: number; // Optional property
  className?: any;
}

const UserImageAvatar = ({
  src,
  alt = "user image",
  width = 100,
  height = 100,
  className = "w-12 h-12 rounded-full bg-red-300 overflow-hidden",
}: IAvatar) => {
  return (
    <div className={className}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="w-full h-full"
      />
    </div>
  );
};

export default UserImageAvatar;
