'use client';
import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CustomModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onCloseModal?: any;
  children: React.ReactNode;
  title?: string;
  width?: string;
  removeCloseButton?: boolean;
  panelClassName?: string;
  contentClassName?: string;
  ariaLabel?: string;
}

let bodyScrollLockCount = 0;
let originalBodyOverflow = '';

const CustomModal: React.FC<CustomModalProps> = ({
  isOpen,
  onClose,
  onCloseModal,
  children,
  title,
  width = 'max-w-lg',
  removeCloseButton = false,
  panelClassName,
  contentClassName,
  ariaLabel,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [mouseDownOnBackdrop, setMouseDownOnBackdrop] =
    useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (bodyScrollLockCount === 0) {
      originalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    bodyScrollLockCount += 1;

    return () => {
      bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);

      if (bodyScrollLockCount === 0) {
        document.body.style.overflow = originalBodyOverflow;
        originalBodyOverflow = '';
      }
    };
  }, [isOpen]);

  const handleBackdropMouseDown = (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    if (e.button !== 0) return;
    if (
      modalRef.current &&
      !modalRef.current.contains(e.target as Node)
    ) {
      setMouseDownOnBackdrop(true);
    }
  };

  const handleBackdropMouseUp = (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
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

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={handleBackdropMouseDown}
          onMouseUp={handleBackdropMouseUp}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel || title || 'Dialog'}
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 28,
            }}
            className={`w-full ${width} relative overflow-hidden ${
              panelClassName || 'rounded-2xl bg-white shadow-lg'
            }`}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            style={{ maxHeight: '90vh' }}
          >
            {/* Header */}
            {(!removeCloseButton || title) && (
              <div
                className={`flex items-center ${
                  title ? 'px-4 py-3 justify-between' : 'justify-end px-3 pt-2'
                } `}
              >
                {title && <h2 className="text-lg">{title}</h2>}
                {!removeCloseButton && (
                  <button
                    onClick={
                      onCloseModal ? () => onCloseModal() : onClose
                    }
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
              transition={{
                layout: { duration: 0.1, ease: 'easeOut' },
              }}
              className={contentClassName || 'overflow-y-auto'}
              style={{ maxHeight: 'calc(90vh - 64px)' }}
            >
              {children}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default CustomModal;
