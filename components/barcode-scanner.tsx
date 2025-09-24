"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Icons } from "@/components/icons";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function BarcodeScanner({
  onScan,
  isOpen,
  onClose,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<BrowserMultiFormatReader | null>(null);
  const cancelRef = useRef<IScannerControls | null>(null);
  const scannedRef = useRef<boolean>(false);
  const scannedCodesRef = useRef<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (!isOpen) stopScanner();
  }, [isOpen]);

  const startScanner = async () => {
    setError(null);
    scannedRef.current = false;

    try {
      setIsScanning(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current
          .play()
          .catch((e) => console.warn("video.play() fallo:", e));
      }

      // ---- Mejor detección ----
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
      ]);

      const scanner = new BrowserMultiFormatReader(hints, 400);
      scannerRef.current = scanner;

      cancelRef.current = await scanner.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result, err) => {
          if (result) {
            const code = result.getText();
            if (!scannedCodesRef.current.has(code)) {
              scannedCodesRef.current.add(code);
              scannedRef.current = true;

              // ✅ Vibración en móviles
              if (navigator.vibrate) {
                navigator.vibrate(200); // vibra 200ms
              }

              stopScanner();
              onScan(code);
              onClose();
            }
          }
          if (err && !(err.name === "NotFoundException")) {
            console.error("[scanner] decode error:", err);
          }
        }
      );
    } catch (err) {
      console.error("start error:", err);
      setError("No se pudo iniciar la cámara. Verifica permisos/HTTPS.");
      setIsScanning(false);
    }
  };

  const stopScanner = () => {
    setIsScanning(false);

    try {
      if (cancelRef.current) {
        cancelRef.current.stop();
        cancelRef.current = null;
      }

      scannerRef.current = null;

      if (videoRef.current && videoRef.current.srcObject) {
        const s = videoRef.current.srcObject as MediaStream;
        s.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    } catch (e) {
      console.warn("[scanner] stopScanner unexpected error:", e);
    } finally {
      scannedRef.current = false;
      scannedCodesRef.current.clear();
    }
  };

  const handleManualInput = () => {
    const barcode = prompt("Ingresa el código de barras manualmente:");
    if (barcode && barcode.trim()) {
      const code = barcode.trim();
      if (!scannedCodesRef.current.has(code)) {
        scannedCodesRef.current.add(code);

        // ✅ Vibración también en ingreso manual
        if (navigator.vibrate) {
          navigator.vibrate(200);
        }

        onScan(code);
        stopScanner();
        onClose();
      }
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          stopScanner();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icons.Scan />
            Escáner de Códigos de Barras
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isScanning ? (
            <div className="space-y-4">
              <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                {/* Franja láser animada */}
                <div className="scanline absolute left-0 right-0 h-10"></div>

                <style jsx>{`
                  @keyframes scanline {
                    0% {
                      transform: translateY(0);
                    }
                    100% {
                      transform: translateY(256px); /* h-64 = 256px */
                    }
                  }
                  .scanline {
                    top: 0;
                    animation: scanline 3s linear infinite alternate;
                    background: linear-gradient(
                      to bottom,
                      rgba(255, 0, 0, 0) 0%,
                      rgba(255, 0, 0, 0.5) 50%,
                      rgba(255, 0, 0, 0) 100%
                    );
                    box-shadow: 0 0 16px rgba(255, 0, 0, 0.8);
                  }
                `}</style>
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Apunta el código dentro de la línea láser
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      stopScanner();
                      onClose();
                    }}
                    className="flex-1 bg-transparent"
                  >
                    <Icons.X />
                    <span className="ml-2">Cancelar</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleManualInput}
                    className="flex-1 bg-transparent"
                  >
                    Ingresar Manual
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            !error && (
              <div className="text-center space-y-4">
                <div className="p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <Icons.Camera />
                  <p className="text-sm text-muted-foreground mt-4">
                    Presiona el botón para activar la cámara y escanear
                  </p>
                </div>
                <div className="space-y-2">
                  <Button onClick={startScanner} className="w-full">
                    <Icons.Camera />
                    <span className="ml-2">Activar Cámara</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleManualInput}
                    className="w-full bg-transparent"
                  >
                    Ingresar Código Manualmente
                  </Button>
                </div>
              </div>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
