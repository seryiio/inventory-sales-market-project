"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Icons } from "@/components/icons"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Icons.LayoutDashboard,
  },
  {
    name: "Inventario",
    href: "/inventory",
    icon: Icons.Package,
  },
  {
    name: "Ventas",
    href: "/sales",
    icon: Icons.ShoppingCart,
  },
  {
    name: "Reportes",
    href: "/reports",
    icon: Icons.BarChart3,
  },
  {
    name: "Configuración",
    href: "/settings",
    icon: Icons.Settings,
  },
]

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = () => {
    // Remove authentication cookie
    document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    router.push("/login")
  }

  const NavigationContent = () => (
    <>
      <div className="flex items-center gap-2 p-6 border-b border-border">
        <Icons.Store />
        <div>
          <h1 className="font-bold text-lg">Sistema de Inventario</h1>
          <p className="text-xs text-muted-foreground">Control de Tiendas</p>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link href={item.href} onClick={() => setIsOpen(false)}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn("w-full justify-start gap-3", isActive && "bg-primary text-primary-foreground")}
                  >
                    <item.icon />
                    {item.name}
                  </Button>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-border space-y-4">
        <Button variant="outline" className="w-full justify-start gap-3 bg-transparent" onClick={handleLogout}>
          <Icons.LogOut />
          Cerrar Sesión
        </Button>

        <div className="text-xs text-muted-foreground">
          <p>App CyV v1.0</p>
          <p>3 tiendas activas</p>
          <p>WaynasCorp ♣</p>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden lg:flex flex-col w-64 bg-card border-r border-border">
        <NavigationContent />
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <Icons.Store />
            <h1 className="font-bold text-lg">Sistema</h1>
          </div>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Icons.Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex flex-col h-full">
                <NavigationContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  )
}
