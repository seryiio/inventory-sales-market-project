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
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const scannerRef = useRef<BrowserMultiFormatReader | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  useEffect(() => {
    // No arrancamos automáticamente la cámara al abrir el modal por seguridad;
    // el usuario presiona "Activar Cámara". Si prefieres auto-start, llama startScanner() aquí.
    if (!isOpen) {
      // cuando se cierra el modal por cualquier vía, aseguramos detener todo
      stopScanner()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const startScanner = async () => {
    setError(null)
    try {
      setIsScanning(true)

      // debug: enumerar dispositivos para ver si el navegador reporta la cámara
      const devices = await navigator.mediaDevices.enumerateDevices()
      console.log("[scanner] devices:", devices)

      // pedimos el stream (trasera preferida)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })

      // forzamos el stream al <video>
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // atributos HTML (autoplay/playsinline/muted) ya en JSX; forzamos play por si acaso
        await videoRef.current.play().catch((e) => console.warn("[scanner] video.play() fallo:", e))
      }

      // inicializamos el lector
      const scanner = new BrowserMultiFormatReader()
      scannerRef.current = scanner

      // decodeFromVideoDevice devuelve una función de cancelación (que guardamos)
      cancelRef.current = await scanner.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result, err) => {
          if (result) {
            console.log("[scanner] result:", result.getText())
            onScan(result.getText())
            // cerramos modal y detenemos scanner después de reportar el resultado
            handleClose()
          }
          if (err && !(err.name === "NotFoundException")) {
            console.error("[scanner] decode error:", err)
          }
        }
      )
      console.log("[scanner] started")
    } catch (err: any) {
      console.error("[scanner] start error:", err)
      setError("No se pudo iniciar la cámara. Verifica permisos/HTTPS y que el navegador permita acceder.")
      setIsScanning(false)
    }
  }

  const stopScanner = () => {
    console.log("[scanner] stopScanner called")
    setIsScanning(false)

    try {
      // si existe la función cancel, la ejecutamos
      if (cancelRef.current) {
        try {
          cancelRef.current()
        } catch (e) {
          console.warn("[scanner] cancelRef error:", e)
        }
        cancelRef.current = null
      }

      // cleanup del scanner instance
      scannerRef.current = null

      // detener cualquier track del video
      if (videoRef.current && videoRef.current.srcObject) {
        const s = videoRef.current.srcObject as MediaStream
        s.getTracks().forEach((t) => {
          try {
            t.stop()
          } catch (e) {
            // ignore
          }
        })
        videoRef.current.srcObject = null
      }
    } catch (e) {
      console.warn("[scanner] stopScanner unexpected error:", e)
    }
  }

  // handleClose que usa el resto del código (sin parámetros)
  const handleClose = () => {
    console.log("[scanner] handleClose called")
    stopScanner()
    onClose()
  }

  const handleManualInput = () => {
    const barcode = prompt("Ingresa el código de barras manualmente:")
    if (barcode && barcode.trim()) {
      console.log("[scanner] manual barcode:", barcode.trim())
      onScan(barcode.trim())
      handleClose()
    }
  }

  return (
    <Dialog
      open={isOpen}
      // IMPORTANT: aquí capturamos el booleano que pasa Dialog
      onOpenChange={(open) => {
        console.log("[Dialog] onOpenChange:", open)
        // si el usuario cierra (open === false) hacemos la misma lógica que handleClose
        if (!open) {
          stopScanner()
          onClose()
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
          ) : (
            !error && (
              <div className="text-center space-y-4">
                <div className="p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <Icons.Camera />
                  <p className="text-sm text-muted-foreground mt-4">Presiona el botón para activar la cámara y escanear</p>
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
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
