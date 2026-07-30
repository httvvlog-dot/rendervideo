"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  closeOnBackdrop?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  closeOnBackdrop = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [render, setRender] = useState(open);

  // Handle ESC key, body scroll lock, and initial focus
  useEffect(() => {
    if (open) {
      setRender(true);
      
      // Prevent body scrolling
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      
      // Auto-focus first input
      setTimeout(() => {
        if (modalRef.current) {
          const firstInput = modalRef.current.querySelector('input:not([type="hidden"]), textarea, button') as HTMLElement;
          if (firstInput) {
            firstInput.focus();
          }
        }
      }, 50);
      
      return () => {
        document.body.style.overflow = originalStyle;
        document.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      // Delay unmounting to allow CSS exit transition
      const timeout = setTimeout(() => {
        setRender(false);
      }, 200); 
      return () => clearTimeout(timeout);
    }
  }, [open, onClose]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!render || !mounted) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "max-w-[calc(100%-2rem)]",
  };

  const modalContent = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center isolate">
      {/* Backdrop */}
      <div 
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={() => closeOnBackdrop && onClose()}
        aria-hidden="true"
      />
      
      {/* Modal Content */}
      <div 
        ref={modalRef}
        className={cn(
          "relative flex flex-col w-full bg-white dark:bg-slate-950 rounded-xl shadow-xl border overflow-hidden p-6 gap-4 transition-all duration-200 m-4 max-h-[calc(100vh-2rem)]",
          sizeClasses[size],
          open ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
        )}
        role="dialog"
        aria-modal="true"
      >
        {(title || description) && (
          <div className="flex flex-col space-y-1.5 shrink-0">
            <div className="flex items-start justify-between">
              {title && <h2 className="text-lg font-semibold leading-none tracking-tight">{title}</h2>}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 -mt-1 -mr-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 shrink-0" 
                onClick={onClose}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
            {description && <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
        )}
        
        {/* If no title/description, still provide a close button on top right */}
        {!title && !description && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 h-6 w-6 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100" 
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        )}

        <div className="overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );

  return document.body ? createPortal(modalContent, document.body) : null;
}
