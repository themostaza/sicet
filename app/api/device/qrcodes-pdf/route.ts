import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import QRCode from "qrcode"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  // Setup Supabase client lato server
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Prendi tutti i device non eliminati
  const { data: devices, error } = await supabase
    .from("devices")
    .select("id, name")
    .eq("deleted", false)
    .order("id")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // PDF A4 portrait: 595 x 842 pt
  const pageWidth = 595
  const pageHeight = 842
  const cols = 3
  const marginX = 30
  const marginY = 30
  const cellWidth = (pageWidth - marginX * 2) / cols
  const qrSize = 120
  const cellPaddingY = 20
  const cellHeight = qrSize + 44 + cellPaddingY // 44: spazio per testi
  const rows = Math.floor((pageHeight - marginY * 2) / cellHeight)

  const fontSizeId = 16
  const fontSizeName = 9

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  let page: any = null
  let col = 0
  let row = 0

  for (let i = 0; i < devices.length; i++) {
    if (col === 0 && row === 0) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
    }
    const device = devices[i]
    // Genera QR code come data URL
    const qrUrl = `${req.nextUrl.origin}/device/${device.id}/scan`
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: qrSize, margin: 1 })
    const imageBytes = Buffer.from(qrDataUrl.split(",")[1], "base64")
    const pngImage = await pdfDoc.embedPng(imageBytes)

    // Calcola posizione cella
    const x0 = marginX + col * cellWidth
    const y0 = pageHeight - marginY - (row + 1) * cellHeight

    // Centra QR code nella cella
    const qrX = x0 + (cellWidth - qrSize) / 2
    const qrY = y0 + cellHeight - qrSize - cellPaddingY / 2
    page.drawImage(pngImage, { x: qrX, y: qrY, width: qrSize, height: qrSize })

    // ID device (centrato sotto QR)
    const idTextWidth = font.widthOfTextAtSize(device.id, fontSizeId)
    const idX = x0 + (cellWidth - idTextWidth) / 2
    const idY = qrY - 18
    page.drawText(device.id, {
      x: idX,
      y: idY,
      size: fontSizeId,
      font,
      color: rgb(0, 0, 0),
    })

    // Nome device (centrato sotto ID)
    const name = device.name || ""
    const nameTextWidth = font.widthOfTextAtSize(name, fontSizeName)
    const nameX = x0 + (cellWidth - nameTextWidth) / 2
    const nameY = idY - 14
    page.drawText(name, {
      x: nameX,
      y: nameY,
      size: fontSizeName,
      font,
      color: rgb(0.2, 0.2, 0.2),
    })

    // Avanza colonna/riga
    col++
    if (col >= cols) {
      col = 0
      row++
      if (row >= rows) {
        row = 0
        col = 0
        // nuova pagina
      }
    }
  }

  const pdfBytes = await pdfDoc.save()
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, "0")
  const fileName = `qrcodes-dispositivi-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.pdf`

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"${fileName}\"`,
    },
  })
} 