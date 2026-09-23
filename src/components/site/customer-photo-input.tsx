import { useState, useRef, useEffect } from "react";
import { Camera, Upload, RefreshCw, Check, X, Sparkles, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CustomerPhotoInputProps {
  photoMode: "none" | "capture" | "upload" | "both";
  photoRequired?: boolean;
  photoLabel?: string;
  value: string;
  onChange: (photoDataUrl: string) => void;
}

export function CustomerPhotoInput({
  photoMode,
  photoRequired = false,
  photoLabel = "Profile Photo / ID Verification",
  value,
  onChange,
}: CustomerPhotoInputProps) {
  const [activeTab, setActiveTab] = useState<"capture" | "upload">(
    photoMode === "upload" ? "upload" : "capture"
  );
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (photoMode === "upload") {
      setActiveTab("upload");
    } else if (photoMode === "capture") {
      setActiveTab("capture");
    }
  }, [photoMode]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (photoMode === "none") return null;

  const startCamera = async () => {
    setCameraError(null);
    stopCamera();

    // Check if mediaDevices.getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (nativeCameraInputRef.current) {
        nativeCameraInputRef.current.click();
      } else {
        setCameraError("Live camera is not supported in this browser context. Please upload a file.");
      }
      return;
    }

    // Try multiple constraint fallbacks for iOS, Android, and Desktop
    let mediaStream: MediaStream | null = null;
    const constraintOptions = [
      { video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } }, audio: false },
      { video: { facingMode: "user" }, audio: false },
      { video: { facingMode: { ideal: "user" } }, audio: false },
      { video: true, audio: false },
    ];

    for (const constraints of constraintOptions) {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (mediaStream) break;
      } catch (e) {
        // Continue fallback loop
      }
    }

    if (!mediaStream) {
      console.warn("getUserMedia failed. Falling back to native mobile camera trigger.");
      if (nativeCameraInputRef.current) {
        nativeCameraInputRef.current.click();
      } else {
        setCameraError("Camera access unavailable over HTTP. Click 'Use Native Camera' or upload a file.");
      }
      return;
    }

    streamRef.current = mediaStream;
    setIsCameraActive(true);

    setTimeout(() => {
      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch((err) => {
          console.error("Video play failed:", err);
        });
      }
    }, 150);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const width = video.videoWidth || 480;
    const height = video.videoHeight || 480;
    const size = Math.min(width, height);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      const sx = (width - size) / 2;
      const sy = (height - size) / 2;
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      onChange(dataUrl);
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-gradient-to-b from-primary/5 via-slate-50/50 to-transparent dark:from-primary/10 dark:via-slate-900/20 dark:to-transparent border border-primary/20 space-y-3.5 text-center">
      
      {/* Hidden Native Camera Input Fallback for Mobile */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Label and Badge */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
          <Camera className="h-4 w-4 text-primary" /> {photoLabel} {photoRequired && <span className="text-destructive font-black">*</span>}
        </span>
        {photoRequired && (
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-destructive bg-destructive/10 px-2.5 py-0.5 rounded-full border border-destructive/20">
            Mandatory
          </span>
        )}
      </div>

      {/* Mode Switcher Tabs ONLY if photoMode === "both" */}
      {photoMode === "both" && !value && !isCameraActive && (
        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900 border border-border/60 p-1 gap-1 shadow-2xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab("capture");
              stopCamera();
            }}
            className={cn(
              "py-1.5 px-4 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
              activeTab === "capture"
                ? "bg-primary text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Camera className="h-3.5 w-3.5" /> Live Camera Capture
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("upload");
              stopCamera();
            }}
            className={cn(
              "py-1.5 px-4 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
              activeTab === "upload"
                ? "bg-primary text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Upload className="h-3.5 w-3.5" /> Upload Image File
          </button>
        </div>
      )}

      {/* Main Rounded Avatar Holder */}
      {value ? (
        <div className="flex flex-col items-center gap-3">
          <div className="relative group">
            <div className="h-28 w-28 rounded-full border-4 border-emerald-500 shadow-xl overflow-hidden bg-slate-100 relative">
              <img src={value} alt="Customer Photo" className="h-full w-full object-cover" />
            </div>
            <span className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900">
              <Check className="h-4 w-4 stroke-[3]" />
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 block">
              Photo Verified &amp; Attached ✓
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onChange("");
                if (photoMode === "capture" || (photoMode === "both" && activeTab === "capture")) {
                  startCamera();
                }
              }}
              className="h-8 text-xs font-bold rounded-xl gap-1.5 border-border/80 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RefreshCw className="h-3.5 w-3.5 text-primary" /> Retake / Change Photo
            </Button>
          </div>
        </div>
      ) : isCameraActive ? (
        /* Live Camera Feed inside Rounded Box */
        <div className="flex flex-col items-center gap-3 bg-slate-950 p-4 rounded-3xl border border-slate-800 shadow-2xl">
          <div className="relative h-48 w-48 rounded-full overflow-hidden border-4 border-primary shadow-2xl bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => {
                videoRef.current?.play().catch((e) => console.error("Play error:", e));
              }}
              className="h-full w-full object-cover -scale-x-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="brand"
              size="sm"
              onClick={capturePhoto}
              className="rounded-xl font-bold gap-2 text-xs h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
            >
              <Camera className="h-4 w-4" /> Snap Photo Now
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={stopCamera}
              className="rounded-xl font-bold gap-1 text-xs h-9 text-slate-300 border-slate-700 hover:bg-slate-800"
            >
              <X className="h-4 w-4" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        /* Uncaptured State: Circular Action Button */
        <div className="flex flex-col items-center gap-3">
          {(photoMode === "capture" || (photoMode === "both" && activeTab === "capture")) && (
            <div className="flex flex-col items-center gap-2.5">
              <button
                type="button"
                onClick={startCamera}
                className="group relative h-28 w-28 rounded-full border-2 border-dashed border-primary/50 hover:border-primary bg-white dark:bg-slate-900 flex flex-col items-center justify-center gap-1 shadow-sm transition-all duration-200 hover:scale-105 cursor-pointer"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                  <Camera className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-extrabold text-foreground group-hover:text-primary transition-colors">
                  Snap Live Photo
                </span>
                <span className="absolute bottom-1.5 right-1.5 h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center shadow-sm font-bold">
                  +
                </span>
              </button>
              {cameraError && (
                <div className="space-y-1">
                  <p className="text-[11px] text-destructive font-semibold max-w-xs">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="text-[11px] font-bold text-primary underline cursor-pointer"
                  >
                    Open Native Phone Camera App
                  </button>
                </div>
              )}
              <span className="text-[10px] font-medium text-muted-foreground">Click rounded camera to take live photo</span>
            </div>
          )}

          {(photoMode === "upload" || (photoMode === "both" && activeTab === "upload")) && (
            <div className="flex flex-col items-center gap-2.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative h-28 w-28 rounded-full border-2 border-dashed border-primary/50 hover:border-primary bg-white dark:bg-slate-900 flex flex-col items-center justify-center gap-1 shadow-sm transition-all duration-200 hover:scale-105 cursor-pointer"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                  <Upload className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-extrabold text-foreground group-hover:text-primary transition-colors">
                  Upload Photo
                </span>
                <span className="absolute bottom-1.5 right-1.5 h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center shadow-sm font-bold">
                  +
                </span>
              </button>
              <span className="text-[10px] font-medium text-muted-foreground">Click rounded frame to select image file</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
