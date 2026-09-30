"use client";

import { useState, useRef, useEffect, DragEvent, KeyboardEvent } from "react";
import { X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  file: File | null;
  onFileChange: (file: File | null) => void;
  className?: string;
  id: string;
}

export function ImageUploadCard({
  title,
  subtitle,
  icon,
  file,
  onFileChange,
  className,
  id
}: ImageUploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      onFileChange(droppedFile);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    inputRef.current?.click();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-label={title}
      className={cn(
        "relative overflow-hidden flex flex-col items-center justify-center w-full min-h-[180px] p-6 rounded-2xl border transition-all duration-300 ease-out cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        isDragging
          ? "border-primary bg-primary/5 shadow-lg scale-[1.02]"
          : "border-border hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900 hover:shadow-lg hover:-translate-y-1",
        file ? "border-solid shadow-md bg-white dark:bg-slate-950" : "border-dashed",
        className
      )}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const selectedFile = e.target.files?.[0];
          if (selectedFile) {
            onFileChange(selectedFile);
          }
        }}
      />

      {file && previewUrl ? (
        <div className="absolute inset-0 w-full h-full group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-cover opacity-90 group-hover:opacity-30 transition-opacity duration-300"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 gap-3 bg-black/40">
            <button
              type="button"
              onClick={handleClick}
              className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 text-sm font-medium rounded-full shadow-md transition-transform hover:scale-105"
            >
              <RefreshCw className="w-4 h-4" /> Đổi ảnh
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-full shadow-md transition-transform hover:scale-105"
            >
              <X className="w-4 h-4" /> Xóa
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-xs text-white text-center truncate px-2 font-medium drop-shadow-md">{file.name}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center space-y-4 pointer-events-none">
          <div className={cn(
            "p-5 rounded-2xl shadow-sm transition-transform duration-300",
            isDragging ? "bg-primary/10 text-primary scale-110" : "bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)]"
          )}>
            {icon}
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-700 dark:text-slate-200">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px] leading-relaxed">
              {subtitle}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
