import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import { Navigation } from "@/components/navigation"
import { Suspense } from "react"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Sistema de Inventario - Gestión Integral",
  description: "Sistema completo de gestión de inventario y ventas para múltiples tiendas",
  generator: "v0.app",
  viewport: "width=device-width, initial-scale=1",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando...</p>
              </div>
            </div>
          }
        >
          <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
            <Navigation />
            <main className="flex-1 w-full overflow-y-auto">
              <div className="w-full mx-auto">{children}</div>
            </main>
          </div>
        </Suspense>
        <Toaster />
      </body>
    </html>
  )
}
