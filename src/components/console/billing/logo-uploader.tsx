import React, { useState, useRef } from "react";
import { UploadCloud, Image, Trash2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/lib/api-config";

interface LogoUploaderProps {
  logoUrl: string;
  onChange: (url: string) => void;
  className?: string;
}

export function LogoUploader({ logoUrl, onChange, className }: LogoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    // 1. Validate file format
    const validExtensions = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
    if (!validExtensions.includes(file.type)) {
      toast.error("Invalid image format. Supported formats: PNG, JPG, JPEG, SVG, WEBP.");
      return;
    }

    // 2. Validate file size (<= 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image file exceeds 2MB limit. Please choose a smaller image.");
      return;
    }

    setIsUploading(true);
    try {
      // First create local preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          onChange(reader.result);
        }
      };
      reader.readAsDataURL(file);

      // Attempt server upload
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch(getApiUrl("/api/companies/upload-logo/"), {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.logo_url) {
          onChange(data.logo_url);
          toast.success("Logo uploaded successfully!");
        }
      }
    } catch (err) {
      console.warn("Server logo upload fallback to base64", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          Company Logo
        </label>
        <span className="text-[11px] text-muted-foreground">Max 2MB · PNG, JPG, SVG</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Preview box */}
        <div
          className={cn(
            "relative h-14 w-14 rounded-2xl border flex items-center justify-center shrink-0 overflow-hidden transition-all bg-white dark:bg-slate-900",
            logoUrl
              ? "border-violet-300 dark:border-violet-800 shadow-sm"
              : "border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-400"
          )}
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
          ) : logoUrl ? (
            <img
              src={logoUrl.startsWith("/") ? getApiUrl(logoUrl) : logoUrl}
              alt="Uploaded company logo"
              className="h-full w-full object-contain p-1.5"
            />
          ) : (
            <Image className="h-6 w-6 text-slate-300 dark:text-slate-600" />
          )}
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex-1 h-14 rounded-2xl border border-dashed px-4 flex items-center justify-between cursor-pointer transition-all duration-200 select-none",
            isDragOver
              ? "border-violet-500 bg-violet-50/70 dark:bg-violet-950/40"
              : "border-slate-200 dark:border-slate-800 hover:border-violet-400 dark:hover:border-violet-700 bg-slate-50/70 dark:bg-slate-900/40"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileProcess(file);
              e.target.value = "";
            }}
          />

          <div className="flex items-center gap-2.5 min-w-0">
            <UploadCloud className="h-4 w-4 text-violet-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {logoUrl ? "Replace logo image" : "Drop logo here or browse"}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {isDragOver ? "Drop to upload" : "Click to select file"}
              </p>
            </div>
          </div>

          {logoUrl && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                toast.info("Logo removed.");
              }}
              className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer border-none bg-transparent shrink-0"
              title="Remove logo"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
