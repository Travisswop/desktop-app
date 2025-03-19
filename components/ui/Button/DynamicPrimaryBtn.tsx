"use client";
import { MotionButton } from "@/components/Motion";
import React from "react";

interface BtnProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: any;
  enableGradient?: boolean; // New prop to control gradient animation
  type?: any;
}

const DynamicPrimaryBtn = ({
  children,
  className,
  disabled = false,
  onClick = null,
  enableGradient = true, // Default to true
  type = "button",
}: BtnProps) => {
  // Define the default classes
  const defaultClasses = `relative overflow-hidden flex justify-center items-center gap-1 px-5 py-2 rounded-xl text-white font-medium bg-black hover:text-white`;

  // Add gradient animation classes if enableGradient is true
  const gradientClasses = enableGradient
    ? `hover:bg-gradient-to-r hover:from-black hover:to-white hover:bg-[length:200%_100%] hover:animate-bg-slide`
    : "";

  // Merge the default classes, optional gradient classes, and any additional className
  const mergedClasses = `${defaultClasses} ${gradientClasses} ${
    className || ""
  }`;

  return (
    <MotionButton
      type={type}
      whileTap={!disabled ? { scale: 0.85 } : { scale: 1 }}
      disabled={disabled}
      className={mergedClasses}
      onClick={onClick}
    >
      {children}
    </MotionButton>
  );
};

export default DynamicPrimaryBtn;
