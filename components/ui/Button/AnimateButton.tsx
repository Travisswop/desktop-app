"use client";
import { MotionButton } from "@/components/Motion";
import { Spinner } from "@nextui-org/react";
import React, { useState, ReactNode, MouseEvent } from "react";

interface AnimateButtonProps {
  children: ReactNode;
  isLoading?: boolean;
  isDisabled?: boolean;
  type?: "button" | "submit" | "reset";
  width?: string;
  className?: string;
  paddingY?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  whiteLoading?: boolean;
}

const AnimateButton: React.FC<AnimateButtonProps> = ({
  children,
  isLoading = false,
  whiteLoading = false,
  type = "submit",
  width = "w-52",
  onClick,
  className,
  isDisabled = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const defaultClasses = `${width} relative overflow-hidden flex justify-center items-center gap-0.5 border border-gray-400 px-4 py-1.5 rounded-xl text-gray-500 font-medium hover:text-white hover:bg-gradient-to-r hover:from-black hover:to-transparent hover:bg-[length:200%_100%] hover:animate-bg-slide border-2 hover:border-none hover:py-2`;
  // Merge the default classes with the passed className
  const mergedClasses = `${defaultClasses} ${className && className}`;

  return (
    <MotionButton
      whileTap={{ scale: 0.85 }}
      onClick={onClick}
      type={type}
      className={mergedClasses}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isDisabled}
    >
      {isLoading ? (
        <Spinner
          size="sm"
          className="py-0.5"
          color={whiteLoading ? "white" : isHovered ? "white" : "primary"}
        />
      ) : (
        children
      )}
    </MotionButton>
  );
};

export default AnimateButton;
