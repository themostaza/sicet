import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import QRCode from "qrcode"

export const dynamic = "force-dynamic"

// Funzione per spezzare il testo in righe che si adattano alla larghezza
function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const testWidth = font.widthOfTextAtSize(testLine, fontSize)
    
    if (testWidth <= maxWidth) {
      currentLine = testLine
    } else {
      if (currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        // La parola è troppo lunga, la tronchiamo
        lines.push(word.substring(0, Math.floor(word.length * maxWidth / testWidth)))
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine)
  }
  
  return lines
}

// Funzione per formattare la data
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export async function GET(req: NextRequest) {
  // Setup Supabase client lato server
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Leggi parametri di filtro dalla query string
  const { searchParams } = new URL(req.url)
  const deviceIds = searchParams.get("deviceIds")

  let query = supabase
    .from("devices")
    .select("id, name, created_at")
    .eq("deleted", false)

  // Se sono specificati dei device ID, filtra per quelli
  if (deviceIds) {
    const ids = deviceIds.split(",").filter(id => id.trim())
    if (ids.length > 0) {
      query = query.in("id", ids)
    }
  }

  // Ordinamento sempre dal più vecchio al più recente
  const { data: devices, error } = await query.order("created_at", { ascending: true })

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
  // Aumentato lo spazio per accomodare più righe di testo
  const cellHeight = qrSize + 80 + cellPaddingY // 80: spazio per ID + nome multiriga + data
  const rows = Math.floor((pageHeight - marginY * 2) / cellHeight)

  const fontSizeId = 16
  const fontSizeName = 9
  const fontSizeDate = 7

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

    // Nome device (con text wrapping)
    const name = device.name || ""
    const nameLines = wrapText(name, font, fontSizeName, qrSize)
    let currentY = idY - 16
    
    nameLines.forEach((line, index) => {
      const lineWidth = font.widthOfTextAtSize(line, fontSizeName)
      const lineX = x0 + (cellWidth - lineWidth) / 2
      page.drawText(line, {
        x: lineX,
        y: currentY,
        size: fontSizeName,
        font,
        color: rgb(0.2, 0.2, 0.2),
      })
      currentY -= 12 // Spazio tra le righe
    })

    // Data di creazione (centrata sotto il nome)
    const createdDate = formatDate(device.created_at)
    const dateTextWidth = font.widthOfTextAtSize(createdDate, fontSizeDate)
    const dateX = x0 + (cellWidth - dateTextWidth) / 2
    const dateY = currentY - 8
    page.drawText(createdDate, {
      x: dateX,
      y: dateY,
      size: fontSizeDate,
      font,
      color: rgb(0.5, 0.5, 0.5),
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