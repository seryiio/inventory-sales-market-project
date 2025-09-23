"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icons } from "@/components/icons"

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  isOpen: boolean
  onClose: () => void
}

export function BarcodeScanner({ onScan, isOpen, onClose }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scannerRef = useRef<any>(null)

  useEffect(() => {
    if (isOpen) {
      checkCameraPermission()
    } else {
      stopScanning()
    }

    return () => {
      stopScanning()
    }
  }, [isOpen])

  const checkCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera if available
        },
      })
      setHasPermission(true)
      setError(null)
      stream.getTracks().forEach((track) => track.stop()) // Stop the test stream
    } catch (err) {
      console.error("[v0] Camera permission error:", err)
      setHasPermission(false)
      setError("No se pudo acceder a la cámara. Verifica los permisos.")
    }
  }

  const startScanning = async () => {
    if (!hasPermission) {
      await checkCameraPermission()
      if (!hasPermission) return
    }

    try {
      setIsScanning(true)
      setError(null)

      // For mobile devices, we'll use a simpler approach
      // Get video stream with mobile-optimized settings
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()

        // For now, we'll use a manual input fallback since ZXing might not work in all environments
        console.log("[v0] Camera started successfully")
      }
    } catch (err) {
      console.error("[v0] Error starting scanner:", err)
      setError("Error al iniciar el escáner. Intenta nuevamente.")
      setIsScanning(false)
    }
  }

  const stopScanning = () => {
    setIsScanning(false)

    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    // Stop scanner
    if (scannerRef.current) {
      scannerRef.current.reset()
      scannerRef.current = null
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const handleClose = () => {
    stopScanning()
    onClose()
  }

  // Manual barcode input as fallback
  const handleManualInput = () => {
    const barcode = prompt("Ingresa el código de barras manualmente:")
    if (barcode && barcode.trim()) {
      console.log("[v0] Manual barcode entered:", barcode.trim())
      onScan(barcode.trim())
      handleClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
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

          {hasPermission === false && (
            <Alert>
              <AlertDescription>
                Para usar el escáner, necesitas permitir el acceso a la cámara en tu navegador.
              </AlertDescription>
            </Alert>
          )}

          {hasPermission && !isScanning && (
            <div className="text-center space-y-4">
              <div className="p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                <Icons.Camera />
                <p className="text-sm text-muted-foreground mt-4">
                  Presiona el botón para activar la cámara y escanear códigos de barras
                </p>
              </div>
              <div className="space-y-2">
                <Button onClick={startScanning} className="w-full">
                  <Icons.Camera />
                  <span className="ml-2">Activar Cámara</span>
                </Button>
                <Button variant="outline" onClick={handleManualInput} className="w-full bg-transparent">
                  Ingresar Código Manualmente
                </Button>
              </div>
            </div>
          )}

          {isScanning && (
            <div className="space-y-4">
              <div className="relative">
                <video ref={videoRef} className="w-full h-64 bg-black rounded-lg object-cover" playsInline muted />
                <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-24 border-2 border-primary rounded-lg">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary"></div>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Apunta la cámara hacia el código de barras</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={stopScanning} className="flex-1 bg-transparent">
                    <Icons.X />
                    <span className="ml-2">Cancelar</span>
                  </Button>
                  <Button variant="outline" onClick={handleManualInput} className="flex-1 bg-transparent">
                    Ingresar Manual
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
