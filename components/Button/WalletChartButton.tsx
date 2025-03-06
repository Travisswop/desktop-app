import React from "react";

interface WalletChartButtonProps {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}

const WalletChartButton = ({
  children,
  disabled = false,
  onClick = () => {},
}: WalletChartButtonProps) => {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={
        "rounded-lg font-medium drop-shadow-[0_6px_6px_#452A7C40] bg-[#F2F2F2] flex items-center gap-1 px-4 py-2"
      }
    >
      {children}
    </button>
  );
};

export default WalletChartButton;
