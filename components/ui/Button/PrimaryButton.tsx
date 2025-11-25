"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { motion, type HTMLMotionProps } from "framer-motion";
import React from "react";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  loading?: boolean;
  children?: React.ReactNode;
}

export const PrimaryButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      loading = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed";

    const variantBase: Record<string, string> = {
      primary: "bg-gray-100 text-black",
      secondary: "bg-black text-white",
      outline: "border border-gray-300 text-gray-800 focus:ring-gray-300",
      ghost: "text-gray-700 focus:ring-gray-200",
      danger: "bg-red-600 text-white focus:ring-red-500",
    };

    const variantHover: Record<string, string> = {
      primary: "hover:bg-gray-200",
      secondary: "hover:bg-gray-800",
      outline: "hover:bg-gray-100",
      ghost: "hover:bg-gray-100",
      danger: "hover:bg-red-700",
    };

    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        className={cn(
          baseStyles,
          variantBase[variant],
          !isDisabled && variantHover[variant],
          "px-4 py-1.5",
          className
        )}
        disabled={isDisabled}
        initial={!isDisabled ? { opacity: 0, scale: 0.98 } : false}
        animate={!isDisabled ? { opacity: 1, scale: 1 } : false}
        whileHover={!isDisabled ? { scale: 1.04 } : undefined}
        whileTap={!isDisabled ? { scale: 0.85 } : undefined}
        transition={
          !isDisabled
            ? {
                type: "tween",
                ease: "linear",
                duration: 0.1,
              }
            : undefined
        }
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </motion.button>
    );
  }
);

PrimaryButton.displayName = "PrimaryButton";
