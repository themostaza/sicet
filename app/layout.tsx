import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import Sidebar from "@/components/sidebar"
import { Toaster } from "@/components/ui/toaster"
import { SidebarProvider } from "@/components/ui/sidebar"
import MobileMenuTrigger from "@/components/mobile-menu-trigger"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Sicet - Sistema di Gestione",
  description: "Sistema di Gestione per punti di controllo e attività",
  generator: 'v0.dev',
  icons: {
    icon: '/logo.webp',
    shortcut: '/logo.webp',
    apple: '/logo.webp',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="it">
      <body className={inter.className}>
        <SidebarProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-auto p-3 md:p-6 lg:p-8 pt-16 lg:pt-6">{children}</main>
            <MobileMenuTrigger />
          </div>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  )
}
