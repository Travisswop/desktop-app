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

    const variants: Record<string, string> = {
      primary: "bg-slate-100 text-black hover:bg-slate-200",
      secondary: "bg-black text-white hover:bg-gray-800",
      outline:
        "border border-gray-300 text-gray-800 hover:bg-gray-100 focus:ring-gray-300",
      ghost: "text-gray-700 hover:bg-gray-100 focus:ring-gray-200",
      danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    };

    return (
      <motion.button
        ref={ref}
        className={cn(baseStyles, variants[variant], "px-4 py-1.5", className)}
        disabled={disabled || loading}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.85 }}
        transition={{
          type: "tween",
          ease: "linear",
          duration: 0.1, // ⚡ instant response
        }}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </motion.button>
    );
  }
);

PrimaryButton.displayName = "PrimaryButton";
