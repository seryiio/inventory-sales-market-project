"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icons } from "@/components/icons"
import { BrowserMultiFormatReader } from "@zxing/browser"

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  isOpen: boolean
  onClose: () => void
}

export function BarcodeScanner({ onScan, isOpen, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<BrowserMultiFormatReader | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  useEffect(() => {
    if (isOpen) {
      startScanner()
    } else {
      stopScanner()
    }

    return () => stopScanner()
  }, [isOpen])

  const startScanner = async () => {
    try {
      setError(null)
      setIsScanning(true)

      // debug: listar cámaras
      const devices = await navigator.mediaDevices.enumerateDevices()
      console.log("Dispositivos disponibles:", devices)

      // pedir cámara trasera
      const constraints = { video: { facingMode: "environment" } }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch((e) => console.error("No se pudo reproducir video:", e))
      }

      const scanner = new BrowserMultiFormatReader()
      scannerRef.current = scanner

      cancelRef.current = await scanner.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result, err) => {
          if (result) {
            console.log("Código detectado:", result.getText())
            onScan(result.getText())
            handleClose()
          }
          if (err && !(err.name === "NotFoundException")) {
            console.error("Error decoding:", err)
          }
        }
      )
    } catch (err) {
      console.error("Error accediendo a la cámara:", err)
      setError("No se pudo iniciar la cámara. Verifica permisos.")
      setIsScanning(false)
    }
  }

  const stopScanner = () => {
    setIsScanning(false)

    if (cancelRef.current) {
      cancelRef.current()
      cancelRef.current = null
    }

    if (scannerRef.current) {
      scannerRef.current = null
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
  }

  const handleClose = () => {
    stopScanner()
    onClose()
  }

  const handleManualInput = () => {
    const barcode = prompt("Ingresa el código de barras manualmente:")
    if (barcode && barcode.trim()) {
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

          {isScanning && (
            <div className="space-y-4">
              <video
                ref={videoRef}
                className="w-full h-64 bg-black rounded-lg object-cover"
                autoPlay
                playsInline
                muted
              />

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Apunta la cámara hacia el código de barras</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={stopScanner} className="flex-1 bg-transparent">
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

          {!isScanning && !error && (
            <div className="text-center space-y-4">
              <div className="p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                <Icons.Camera />
                <p className="text-sm text-muted-foreground mt-4">
                  Presiona el botón para activar la cámara y escanear códigos de barras
                </p>
              </div>
              <div className="space-y-2">
                <Button onClick={startScanner} className="w-full">
                  <Icons.Camera />
                  <span className="ml-2">Activar Cámara</span>
                </Button>
                <Button variant="outline" onClick={handleManualInput} className="w-full bg-transparent">
                  Ingresar Código Manualmente
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
