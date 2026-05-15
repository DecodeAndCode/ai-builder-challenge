"use client";

import { useEffect, useRef, useState } from "react";

interface BarcodeScannerProps {
  onScan: (value: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "scanning" | "error">("loading");
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        await video.play();
        setStatus("scanning");

        const controls = await reader.decodeFromStream(stream, video, (result, err) => {
          if (cancelled) return;
          if (result) {
            onScan(result.getText());
            controls.stop();
            stream.getTracks().forEach((t) => t.stop());
          }
          if (err && !(err instanceof Error && err.name === "NotFoundException")) {
            // non-fatal decode error, keep going
          }
        });

        stopRef.current = () => {
          controls.stop();
          stream.getTracks().forEach((t) => t.stop());
        };
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error && e.name === "NotAllowedError"
              ? "Camera access denied. Allow camera and try again."
              : "Camera not available. Use the keyboard input instead."
          );
          setStatus("error");
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      stopRef.current?.();
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-medium text-gray-900">Scan barcode</span>
          <button
            type="button"
            onClick={() => {
              stopRef.current?.();
              onClose();
            }}
            className="text-gray-500 hover:text-gray-700 text-lg leading-none p-1"
            aria-label="Close scanner"
          >
            ✕
          </button>
        </div>

        <div className="relative bg-black aspect-square">
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {status === "scanning" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-white/70 rounded-lg" />
              <div className="absolute bottom-4 w-full text-center text-white/80 text-xs">
                Point camera at barcode
              </div>
            </div>
          )}
          {status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white text-sm">Starting camera…</div>
            </div>
          )}
        </div>

        {error && (
          <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border-t border-red-200">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
