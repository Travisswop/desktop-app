"use client";
import React, { useRef, useState, useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CustomModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onCloseModal?: any;
  children: React.ReactNode;
  title?: string;
  width?: string;
  removeCloseButton?: boolean;
}

const CustomModal: React.FC<CustomModalProps> = ({
  isOpen,
  onClose,
  onCloseModal,
  children,
  title,
  width = "max-w-lg",
  removeCloseButton = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [mouseDownOnBackdrop, setMouseDownOnBackdrop] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current overflow value
      const originalOverflow = document.body.style.overflow;
      // Prevent scrolling
      document.body.style.overflow = "hidden";

      // Restore original overflow when modal closes
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setMouseDownOnBackdrop(true);
    }
  };

  const handleBackdropMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (
      mouseDownOnBackdrop &&
      modalRef.current &&
      !modalRef.current.contains(e.target as Node) &&
      onCloseModal
    ) {
      onCloseModal();
    } else if (
      mouseDownOnBackdrop &&
      modalRef.current &&
      !modalRef.current.contains(e.target as Node) &&
      onClose
    ) {
      onClose();
    }
    setMouseDownOnBackdrop(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onMouseDown={handleBackdropMouseDown}
          onMouseUp={handleBackdropMouseUp}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            ref={modalRef}
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className={`bg-white rounded-2xl shadow-lg w-full ${width} relative overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: "90vh" }}
          >
            {/* Header */}
            {(!removeCloseButton || title) && (
              <div
                className={`flex items-center ${
                  title ? "border-b px-4 py-3 justify-between" : "justify-end"
                } `}
              >
                {title && <h2 className="text-lg font-semibold">{title}</h2>}
                {!removeCloseButton && (
                  <button
                    onClick={onCloseModal ? () => onCloseModal() : onClose}
                    className="p-2 rounded-full hover:bg-gray-100 transition"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            )}

            {/* Content with scroll */}
            <motion.div
              layout
              transition={{ layout: { duration: 0.1, ease: "easeOut" } }}
              className="overflow-y-auto"
              style={{ maxHeight: "calc(90vh - 64px)" }}
            >
              {children}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CustomModal;
