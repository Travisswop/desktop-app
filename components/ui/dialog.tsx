"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

type DialogContentProps = React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> & {
  hideCloseButton?: boolean;
};

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(
  (
    {
      className,
      children,
      hideCloseButton,
      onPointerDownOutside,
      onFocusOutside,
      onEscapeKeyDown,
      ...props
    },
    ref
  ) => {
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [zIndex, setZIndex] = React.useState(50);

    // Combine refs
    const combinedRef = React.useCallback(
      (node: HTMLDivElement) => {
        if (contentRef.current) {
          contentRef.current = node;
        }
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    React.useEffect(() => {
      // Calculate z-index based on existing modals, but leave room for third-party modals
      const existingModals = document.querySelectorAll(
        "[data-radix-dialog-content]"
      );
      const baseZIndex = 50;
      const newZIndex = baseZIndex + existingModals.length * 10;
      setZIndex(newZIndex);

      // Don't auto-focus if there are higher z-index elements (like Privy modals)
      const timer = setTimeout(() => {
        if (contentRef.current) {
          // Check if there are any elements with higher z-index that might be third-party modals
          const allElements = Array.from(document.querySelectorAll("*"));
          const hasHigherZIndexModal = allElements.some((el) => {
            const computedStyle = window.getComputedStyle(el as Element);
            const elementZIndex = parseInt(computedStyle.zIndex);
            return (
              elementZIndex > newZIndex &&
              (computedStyle.position === "fixed" ||
                computedStyle.position === "absolute") &&
              (el.tagName.toLowerCase() === "dialog" ||
                el.getAttribute("role") === "dialog" ||
                (el as HTMLElement).style.display !== "none")
            );
          });

          // Only auto-focus if there's no higher z-index modal
          if (!hasHigherZIndexModal) {
            const focusableElement = contentRef.current.querySelector(
              'input, textarea, button, select, [tabindex]:not([tabindex="-1"])'
            ) as HTMLElement;

            if (focusableElement) {
              focusableElement.focus();
            }
          }
        }
      }, 150); // Slightly longer delay to allow third-party modals to render

      return () => clearTimeout(timer);
    }, []);

    // Enhanced handlers that respect third-party modals
    const handlePointerDownOutside = React.useCallback(
      (e: any) => {
        // Always call the custom handler first if provided
        if (onPointerDownOutside) {
          onPointerDownOutside(e);
          // If the custom handler prevented default, respect that
          if (e.defaultPrevented) {
            return;
          }
        }

        // Additional check for common third-party modal patterns
        const target = e.target as HTMLElement;
        if (target) {
          // Check for high z-index elements (likely third-party modals)
          const computedStyle = window.getComputedStyle(target);
          const targetZIndex = parseInt(computedStyle.zIndex);

          // If clicking on something with higher z-index, allow the interaction
          if (targetZIndex > zIndex) {
            return;
          }

          // Check for common modal/dialog patterns
          const isModal = target.closest(
            '[role="dialog"], dialog, .modal, [data-modal], [aria-modal="true"]'
          );
          if (isModal && !contentRef.current?.contains(isModal)) {
            return; // Allow interaction with other modals
          }
        }

        // Default behavior - prevent closing
        e.preventDefault();
      },
      [onPointerDownOutside, zIndex]
    );

    const handleFocusOutside = React.useCallback(
      (e: any) => {
        // Always call the custom handler first if provided
        if (onFocusOutside) {
          onFocusOutside(e);
          // If the custom handler prevented default, respect that
          if (e.defaultPrevented) {
            return;
          }
        }

        // Additional check for third-party modals
        const target = e.target as HTMLElement;
        if (target) {
          // Check for high z-index elements
          const computedStyle = window.getComputedStyle(target);
          const targetZIndex = parseInt(computedStyle.zIndex);

          if (targetZIndex > zIndex) {
            return; // Allow focus to move to higher z-index elements
          }

          // Check for modal patterns
          const isModal = target.closest(
            '[role="dialog"], dialog, .modal, [data-modal], [aria-modal="true"]'
          );
          if (isModal && !contentRef.current?.contains(isModal)) {
            return; // Allow focus to move to other modals
          }
        }

        // Default behavior - prevent focus outside
        e.preventDefault();
      },
      [onFocusOutside, zIndex]
    );

    const handleEscapeKeyDown = React.useCallback(
      (e: any) => {
        // Always call the custom handler first if provided
        if (onEscapeKeyDown) {
          onEscapeKeyDown(e);
          return;
        }

        // Default behavior - prevent escape key closing
        e.preventDefault();
      },
      [onEscapeKeyDown]
    );

    return (
      <DialogPortal>
        <DialogOverlay style={{ zIndex: zIndex - 1 }} />
        <DialogPrimitive.Content
          ref={combinedRef}
          className={cn(
            "fixed left-[50%] top-[50%] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
            className
          )}
          style={{ zIndex }}
          tabIndex={-1}
          onPointerDownOutside={handlePointerDownOutside}
          onFocusOutside={handleFocusOutside}
          onEscapeKeyDown={handleEscapeKeyDown}
          {...props}
        >
          {children}

          {/* Only render the built-in Close when hideCloseButton !== true */}
          {!hideCloseButton && (
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    );
  }
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
