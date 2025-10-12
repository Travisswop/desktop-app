import React, { useRef, useState } from "react";
import { X } from "lucide-react";

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  width?: string;
}

const CustomModal: React.FC<CustomModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  width = "max-w-lg",
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [mouseDownOnBackdrop, setMouseDownOnBackdrop] = useState(false);

  if (!isOpen) return null;

  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only respond to left mouse button (button === 0)
    if (e.button !== 0) return;

    // Check if mousedown is on backdrop (outside modal content)
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setMouseDownOnBackdrop(true);
    }
  };

  const handleBackdropMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only respond to left mouse button (button === 0)
    if (e.button !== 0) return;

    // Only close if both mousedown and mouseup happened on backdrop
    if (
      mouseDownOnBackdrop &&
      modalRef.current &&
      !modalRef.current.contains(e.target as Node)
    ) {
      onClose();
    }
    setMouseDownOnBackdrop(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <div
        ref={modalRef}
        className={`bg-white rounded-2xl shadow-lg w-full ${width} relative max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()} // prevent bubbling from children
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3 flex-shrink-0">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto overflow-x-visible flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default CustomModal;
