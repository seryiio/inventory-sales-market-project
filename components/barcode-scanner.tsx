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
import { BrowserMultiFormatReader } from "@zxing/browser";

interface BarcodeScannerProps {
  onScan: (barcode: string) => Promise<void> | void;
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
  const cancelRef = useRef<(() => void) | null>(null);
  const scannedRef = useRef<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (!isOpen) stopScanner();
  }, [isOpen]);

  const startScanner = async () => {
    if (!isOpen) return;
    setError(null);
    scannedRef.current = false;

    try {
      setIsScanning(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      // 🔹 Pequeño delay para asegurar que el <video> esté en el DOM
      setTimeout(async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current
            .play()
            .catch((e) => console.warn("video.play() fallo:", e));
        }

        const scanner = new BrowserMultiFormatReader();
        scannerRef.current = scanner;

        cancelRef.current = scanner.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result, err) => {
            if (!isOpen) return;

            if (result && !scannedRef.current) {
              scannedRef.current = true;
              onScan(result.getText());
              stopScanner();
              onClose();
            }

            if (err && !(err.name === "NotFoundException")) {
              console.error("[scanner] decode error:", err);
            }
          }
        );
      }, 100);
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
        cancelRef.current();
        cancelRef.current = null;
      }
      if (scannerRef.current) {
        scannerRef.current.reset(); // 🔹 Resetea ZXing
        scannerRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const s = videoRef.current.srcObject as MediaStream;
        s.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    } catch (e) {
      console.warn("[scanner] stopScanner error:", e);
    } finally {
      scannedRef.current = false;
    }
  };

  const handleManualInput = () => {
    const barcode = prompt("Ingresa el código de barras manualmente:");
    if (barcode && barcode.trim()) {
      onScan(barcode.trim());
      stopScanner();
      onClose();
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
              <video
                ref={videoRef}
                className="w-full h-64 bg-black rounded-lg object-cover"
                autoPlay
                playsInline
                muted
              />
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Apunta la cámara hacia el código de barras
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
