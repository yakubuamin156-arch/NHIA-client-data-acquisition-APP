import React, { useRef, useState, useEffect } from "react";
import { Camera, Upload, RotateCw, RefreshCw, Sparkles, Image as ImageIcon, Check, AlertCircle } from "lucide-react";

interface CameraCaptureProps {
  onImageReady: (base64Image: string, fileName: string) => void;
  isProcessing: boolean;
}

export default function CameraCapture({ onImageReady, isProcessing }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [rotation, setRotation] = useState<number>(0); // degrees
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Stop video stream when component unmounts or camera is deactivated
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const startCamera = async (mode = facingMode) => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        stopCamera();
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      setPreviewImage(null);
      setRotation(0);
    } catch (err: any) {
      console.warn("Camera initialization failed, falling back to file upload:", err);
      setHasCamera(false);
      setCameraError("Unable to access camera. Please select or drop an image file instead.");
    }
  };

  const toggleCameraFacing = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    if (cameraActive) {
      startCamera(nextMode);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      // Draw frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL("image/jpeg", 0.9);
      setPreviewImage(base64);
      stopCamera();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
      setRotation(0);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDigitize = () => {
    if (!previewImage) return;

    if (rotation === 0) {
      onImageReady(previewImage, "notebook_scan.jpg");
    } else {
      // Create rotated canvas and pass that
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        if (rotation === 90 || rotation === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        const rotatedBase64 = canvas.toDataURL("image/jpeg", 0.9);
        onImageReady(rotatedBase64, `notebook_scan_r${rotation}.jpg`);
      };
      img.src = previewImage;
    }
  };

  useEffect(() => {
    // Check if camera is available
    navigator.mediaDevices?.enumerateDevices()
      .then((devices) => {
        const hasVideo = devices.some((d) => d.kind === "videoinput");
        setHasCamera(hasVideo);
      })
      .catch(() => setHasCamera(false));

    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="camera-capture-container">
      {/* Tab Selector */}
      <div className="flex border-b border-slate-200 bg-slate-50/50 p-2 gap-2" id="camera-tab-selectors">
        <button
          onClick={() => {
            stopCamera();
            setPreviewImage(null);
            setCameraError(null);
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
            !cameraActive ? "bg-white text-indigo-600 shadow-sm border border-slate-200/60" : "text-slate-500 hover:text-indigo-600"
          }`}
          id="btn-upload-tab"
        >
          <Upload className="w-4 h-4 text-indigo-500" />
          <span>Upload Image</span>
        </button>
        {hasCamera && (
          <button
            onClick={() => startCamera()}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              cameraActive ? "bg-white text-indigo-600 shadow-sm border border-slate-200/60" : "text-slate-500 hover:text-indigo-600"
            }`}
            id="btn-camera-tab"
          >
            <Camera className="w-4 h-4 text-indigo-500" />
            <span>Live Camera</span>
          </button>
        )}
      </div>

      {/* Main Frame Viewport */}
      <div className="relative aspect-[4/3] bg-slate-950 flex items-center justify-center overflow-hidden" id="camera-viewport">
        {/* Real-time Video View */}
        {cameraActive && !previewImage && (
          <div className="absolute inset-0 w-full h-full flex flex-col justify-between" id="video-stream-box">
            <video
              ref={videoRef}
              className="w-full h-full object-cover scale-x-[-1] md:scale-x-1"
              playsInline
              muted
              id="stream-video-element"
            />

            {/* Notebook alignment grid guide */}
            <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none" id="camera-guides">
              <div className="w-full h-full border-2 border-dashed border-indigo-400/70 rounded-xl relative">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-indigo-400/20" />
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-indigo-400/20" />
                <div className="absolute top-3 left-3 bg-indigo-600/90 text-[10px] text-white px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                  Align Notebook Page
                </div>
              </div>
            </div>

            {/* Camera Controls Layer */}
            <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-6 px-6 z-10" id="live-camera-controls">
              <button
                onClick={toggleCameraFacing}
                className="p-3 rounded-full bg-slate-900/80 text-white border border-slate-800 hover:bg-slate-800 transition active:scale-95 shadow-lg"
                title="Switch Camera Lens"
                id="btn-toggle-lens"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              <button
                onClick={capturePhoto}
                disabled={isProcessing}
                className="w-16 h-16 rounded-full bg-white border-4 border-indigo-600 flex items-center justify-center transition active:scale-90 hover:bg-slate-100 shadow-xl"
                id="btn-capture-trigger"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                  Capture
                </div>
              </button>

              <button
                onClick={stopCamera}
                className="px-4 py-2 rounded-lg bg-red-600/90 hover:bg-red-600 text-white text-xs font-semibold shadow-md border border-red-500/30"
                id="btn-cancel-camera"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Static Upload / Drag Zone */}
        {!cameraActive && !previewImage && (
          <label
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`absolute inset-0 flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all duration-300 ${
              dragActive ? "bg-indigo-50/10 border-2 border-dashed border-indigo-400" : "bg-slate-950 border-2 border-transparent"
            }`}
            id="drag-drop-label"
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload-input"
            />
            
            <div className="p-4 rounded-full bg-slate-900 border border-slate-800 text-slate-400 group-hover:scale-110 transition duration-300 mb-4" id="upload-icon-box">
              <Upload className="w-8 h-8 text-indigo-400" />
            </div>

            <h3 className="text-white font-medium text-base mb-1" id="upload-title">
              Upload Notebook Page
            </h3>
            <p className="text-slate-400 text-xs max-w-xs mb-4" id="upload-description">
              Drag and drop your handwritten sheet here, or click to browse. Supports JPG, PNG, and HEIC.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-2" id="tip-pills">
              <span className="text-[10px] font-medium bg-slate-900 text-indigo-300 px-2.5 py-1 rounded-full border border-slate-800">
                💡 High Contrast
              </span>
              <span className="text-[10px] font-medium bg-slate-900 text-indigo-300 px-2.5 py-1 rounded-full border border-slate-800">
                📝 Flat Paper
              </span>
              <span className="text-[10px] font-medium bg-slate-900 text-indigo-300 px-2.5 py-1 rounded-full border border-slate-800">
                ☀️ Good Lighting
              </span>
            </div>
          </label>
        )}

        {/* Preview Snippet View */}
        {previewImage && (
          <div className="absolute inset-0 w-full h-full flex flex-col justify-between p-4" id="image-preview-box">
            <div className="absolute inset-0 flex items-center justify-center p-4 bg-slate-950" id="preview-image-canvas">
              <img
                src={previewImage}
                alt="Snapped notebook page"
                className="max-w-full max-h-full object-contain rounded-lg transition-transform duration-300 shadow-2xl"
                style={{ transform: `rotate(${rotation}deg)` }}
                id="preview-rendered-image"
              />
            </div>

            {/* Laser scanner animation overlay during processing */}
            {isProcessing && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-20" id="scanner-laser-overlay">
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_15px_#818cf8] animate-bounce duration-1000 absolute top-0" />
                <div className="absolute inset-0 bg-indigo-500/5 mix-blend-overlay animate-pulse" />
              </div>
            )}

            {/* Quick Utility controls for captured image */}
            <div className="absolute top-4 right-4 flex gap-2 z-10" id="preview-utility-controls">
              <button
                onClick={handleRotate}
                className="p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white border border-slate-800 transition active:scale-95 shadow-md flex items-center gap-1.5 text-xs font-semibold"
                title="Rotate 90° CW"
                id="btn-rotate-image"
              >
                <RotateCw className="w-4 h-4 text-indigo-400" />
                <span>Rotate</span>
              </button>
              <button
                onClick={() => {
                  setPreviewImage(null);
                  setRotation(0);
                  if (cameraActive) {
                    startCamera();
                  }
                }}
                className="p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white border border-slate-800 transition active:scale-95 shadow-md text-xs font-semibold"
                id="btn-retake-image"
              >
                Clear / Retake
              </button>
            </div>

            {/* Digitize confirmation prompt */}
            {!isProcessing && (
              <div className="absolute bottom-4 inset-x-4 bg-slate-900/90 backdrop-blur-md rounded-xl p-4 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 z-10" id="digitize-prompt-panel">
                <div className="flex items-center gap-2" id="prompt-status-msg">
                  <div className="p-1.5 rounded-full bg-indigo-500/20 text-indigo-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-white font-medium text-xs">Ready to Digitize</h4>
                    <p className="text-slate-400 text-[10px]">Rotated {rotation}° — handwriting recognition is optimized</p>
                  </div>
                </div>

                <button
                  onClick={handleDigitize}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs shadow-lg transition duration-150 flex items-center justify-center gap-2"
                  id="btn-trigger-digitization"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Digitize Handwriting</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Camera Access Error Alert */}
      {cameraError && (
        <div className="p-4 bg-amber-50 border-t border-amber-100 flex items-start gap-2.5" id="camera-error-banner">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-left">
            <h5 className="text-sm font-semibold text-amber-800">Camera Notice</h5>
            <p className="text-xs text-amber-700 mt-0.5">{cameraError}</p>
          </div>
        </div>
      )}
    </div>
  );
}
