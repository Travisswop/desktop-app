"use client";
import { MotionButton } from "@/utils/Motion";
import React from "react";
// import { useRouter } from "next/navigation"; // Import useRouter from Next.js

interface btnProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: ((e: React.MouseEvent<HTMLButtonElement>) => void) | undefined;
}

// we need to use important in case any passed className won't work

const PushToMintCollectionButton = ({
  children,
  className,
  disabled = false,
  onClick,
}: btnProps) => {
  // const router = useRouter(); // Initialize the useRouter hook

  // Define the default classes
  const defaultClasses = `relative overflow-hidden flex justify-center items-center gap-1 px-5 py-2 rounded-xl text-white bg-black font-medium hover:text-white hover:bg-gradient-to-r hover:from-black hover:to-white hover:bg-[length:200%_100%] hover:animate-bg-slide`;

  // Merge the default classes with the passed className
  const mergedClasses = `${defaultClasses} ${className && className}`;

  // Handle click event
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick(e); // If a custom onClick handler is passed, call it
    }
    // router.push("/mint/createCollection"); // Navigate to the target page
  };

  return (
    <MotionButton
      whileTap={{ scale: 0.85 }}
      disabled={disabled}
      className={mergedClasses}
      onClick={handleClick} // Use the handleClick function
    >
      {children}
    </MotionButton>
  );
};

export default PushToMintCollectionButton;
