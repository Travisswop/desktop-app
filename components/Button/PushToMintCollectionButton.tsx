'use client';
import { MotionButton } from '@/utils/Motion';
import React from 'react';

interface btnProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?:
    | ((e: React.MouseEvent<HTMLButtonElement>) => void)
    | undefined;
}

const PushToMintCollectionButton = ({
  children,
  className,
  disabled = false,
  onClick,
}: btnProps) => {
  // Base styles with disabled variants
  const defaultClasses = `
    relative overflow-hidden flex justify-center items-center gap-1
    px-5 py-2 rounded-xl
    text-white bg-black font-medium
    hover:text-white hover:bg-gradient-to-r hover:from-black hover:to-white
    hover:bg-[length:200%_100%] hover:animate-bg-slide
    disabled:bg-gray-400 disabled:text-gray-200 disabled:cursor-not-allowed disabled:opacity-100
  `;

  const mergedClasses = `${defaultClasses.trim()}${
    className ? ` ${className}` : ''
  }`;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) onClick(e);
  };

  return (
    <MotionButton
      whileTap={{ scale: 0.85 }}
      disabled={disabled}
      className={mergedClasses}
      onClick={handleClick}
    >
      {children}
    </MotionButton>
  );
};

export default PushToMintCollectionButton;
