"use client"

import { useState, useRef } from "react"
import { X, Download, Copy, Check } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"

interface QRCodeModalProps {
  isOpen: boolean
  onClose: () => void
  deviceId: string
  deviceName: string
}

export function QRCodeModal({ isOpen, onClose, deviceId, deviceName }: QRCodeModalProps) {
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  if (!isOpen) return null

  const scanUrl = `/device/${deviceId}/scan`
  const fullUrl = `${window.location.origin}${scanUrl}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadQR = () => {
    const svg = qrRef.current?.querySelector("svg")
    if (svg) {
      // Create a canvas element
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      // Set canvas dimensions to include space for the ID text
      const qrSize = 200
      const padding = 20
      const fontSize = 16
      const textHeight = 30

      canvas.width = qrSize + padding * 2
      canvas.height = qrSize + padding + textHeight

      if (ctx) {
        // Fill background
        ctx.fillStyle = "#FFFFFF"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Create an image from the SVG
        const img = new Image()
        const svgData = new XMLSerializer().serializeToString(svg)
        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
        const url = URL.createObjectURL(svgBlob)

        img.onload = () => {
          // Draw QR code image on canvas with padding
          ctx.drawImage(img, padding, padding, qrSize, qrSize)

          // Add the device ID text below the QR code
          ctx.font = `${fontSize}px Arial`
          ctx.fillStyle = "#000000"
          ctx.textAlign = "center"
          ctx.fillText(deviceId, canvas.width / 2, qrSize + padding + textHeight / 2)

          // Convert canvas to PNG
          const pngUrl = canvas.toDataURL("image/png")

          // Download PNG
          const link = document.createElement("a")
          link.href = pngUrl
          link.download = `qrcode-${deviceId}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)

          // Clean up
          URL.revokeObjectURL(url)
        }

        img.src = url
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
          aria-label="Chiudi"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold">Codice QR per {deviceName}</h2>
        <p className="mt-2 text-sm text-gray-500">
          Scansiona questo codice per visualizzare e completare le attività per questo dispositivo.
        </p>

        <div className="my-6 flex justify-center" ref={qrRef}>
          <QRCodeSVG value={fullUrl} size={200} />
        </div>

        <div className="text-center text-sm font-medium">{deviceId}</div>
        <div className="mt-1 text-center text-xs">
          <a
            href={scanUrl}
            className="text-blue-500 hover:underline"
            onClick={(e) => {
              e.preventDefault()
              window.location.href = scanUrl
            }}
          >
            {scanUrl}
          </a>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Button variant="outline" className="flex w-full items-center justify-center" onClick={handleCopyLink}>
            {copied ? (
              <>
                <Check size={16} className="mr-2 text-green-500" /> Link copiato
              </>
            ) : (
              <>
                <Copy size={16} className="mr-2" /> Copia link completo
              </>
            )}
          </Button>

          <Button
            className="flex w-full items-center justify-center bg-black hover:bg-gray-800"
            onClick={handleDownloadQR}
          >
            <Download size={16} className="mr-2" /> Scarica Codice QR
          </Button>
        </div>
      </div>
    </div>
  )
}
