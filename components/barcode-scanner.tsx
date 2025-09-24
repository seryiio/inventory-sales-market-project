"use client"

import { useState, useEffect, useRef } from "react"
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
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scannerRef = useRef<BrowserMultiFormatReader | null>(null)

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
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      setHasPermission(true)
      stream.getTracks().forEach((track) => track.stop()) // liberamos el test stream
    } catch (err) {
      console.error("Camera permission error:", err)
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

      const scanner = new BrowserMultiFormatReader()
      scannerRef.current = scanner

      await scanner.decodeFromVideoDevice(
        undefined, // usa la cámara trasera por defecto
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
      console.error("Error starting scanner:", err)
      setError("Error al iniciar el escáner.")
      setIsScanning(false)
    }
  }

  const stopScanning = () => {
    setIsScanning(false)
    if (scannerRef.current) {
      scannerRef.current.reset()
      scannerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const handleClose = () => {
    stopScanning()
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

          {hasPermission && !isScanning && (
            <div className="text-center space-y-4">
              <Button onClick={startScanning} className="w-full">
                <Icons.Camera />
                <span className="ml-2">Activar Cámara</span>
              </Button>
              <Button variant="outline" onClick={handleManualInput} className="w-full bg-transparent">
                Ingresar Código Manualmente
              </Button>
            </div>
          )}

          {isScanning && (
            <div className="space-y-4">
              <video ref={videoRef} className="w-full h-64 bg-black rounded-lg object-cover" playsInline muted />
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Apunta la cámara hacia el código</p>
                <Button variant="outline" onClick={stopScanning} className="w-full bg-transparent">
                  <Icons.X />
                  <span className="ml-2">Cancelar</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
