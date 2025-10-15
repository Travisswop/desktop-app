"use client";
import React, { useRef, useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CustomModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onCloseModal?: any;
  children: React.ReactNode;
  title?: string;
  width?: string;
}

const CustomModal: React.FC<CustomModalProps> = ({
  isOpen,
  onClose,
  onCloseModal,
  children,
  title,
  width = "max-w-lg",
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [mouseDownOnBackdrop, setMouseDownOnBackdrop] = useState(false);

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
          {/* Animate this wrapper (it will animate when children change height) */}
          <motion.div
            ref={modalRef}
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className={`bg-white rounded-2xl shadow-lg w-full ${width} relative overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
            // IMPORTANT: don't force the modal height via flex: instead, let it size to content,
            // and put a scrollable inner area with a max-height.
            style={{ maxHeight: "90vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              {title && <h2 className="text-lg font-semibold">{title}</h2>}
              <button
                onClick={onCloseModal ? () => onCloseModal() : onClose}
                className="p-2 rounded-full hover:bg-gray-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* CONTENT: make an inner scroll area that only scrolls when needed.
                Notice: no flex-1 here; the modal will grow/shrink with content and animate. */}
            <motion.div
              layout
              transition={{ duration: 0.28, ease: "easeInOut" }}
              className="overflow-y-auto"
              // limit height of content region so very tall content scrolls
              style={{ maxHeight: "calc(90vh - 64px)" }} // subtract header height approximated
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
