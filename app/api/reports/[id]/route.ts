import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Funzione di validazione per verificare che le celle non siano nella riga 1 o colonna A
function validateMappingExcel(mapping_excel: any): { valid: boolean, error?: string } {
  if (!mapping_excel || !mapping_excel.mappings || !Array.isArray(mapping_excel.mappings)) {
    return { valid: true } // Se non c'è mapping, è valido (opzionale)
  }

  for (const mapping of mapping_excel.mappings) {
    const cellPosition = mapping.cellPosition
    if (!cellPosition || typeof cellPosition !== 'string') {
      continue
    }

    const cellMatch = cellPosition.match(/^([A-Z]+)(\d+)$/)
    if (!cellMatch) {
      return { 
        valid: false, 
        error: `Formato cella non valido: ${cellPosition}. Usa il formato Excel (es. B2, C3, ecc.).` 
      }
    }

    const column = cellMatch[1]
    const row = parseInt(cellMatch[2])

    if (column === 'A') {
      return { 
        valid: false, 
        error: `La cella ${cellPosition} non è valida. La colonna A è riservata per gli header.` 
      }
    }

    if (row === 1) {
      return { 
        valid: false, 
        error: `La cella ${cellPosition} non è valida. La riga 1 è riservata per gli header.` 
      }
    }
  }

  return { valid: true }
}

// GET - Recupera un singolo report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('report_to_excel')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 })
      }
      console.log('[API /api/reports/[id]] Errore Supabase:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      report: data
    }, { status: 200 })
    
  } catch (err) {
    console.log('[API /api/reports/[id]] Errore generico:', err)
    return NextResponse.json({ 
      error: 'Errore nel recupero del report', 
      details: String(err) 
    }, { status: 500 })
  }
}

// PUT - Aggiorna un report esistente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, todolist_params_linked, mapping_excel } = body
    
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome del report obbligatorio' }, { status: 400 })
    }

    // Valida il mapping_excel
    if (mapping_excel) {
      const validation = validateMappingExcel(mapping_excel)
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }
    }
    
    const supabase = await createServerSupabaseClient()
    
    // Verifica che il report esista
    const { data: existingReport, error: fetchError } = await supabase
      .from('report_to_excel')
      .select('id')
      .eq('id', id)
      .single()
    
    if (fetchError || !existingReport) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }
    
    // Aggiorna il report
    const { data, error } = await supabase
      .from('report_to_excel')
      .update({
        name: name.trim(),
        todolist_params_linked,
        mapping_excel
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.log('[API /api/reports/[id]] Errore aggiornamento:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      report: data,
      message: 'Report aggiornato con successo'
    }, { status: 200 })
    
  } catch (err) {
    console.log('[API /api/reports/[id]] Errore generico:', err)
    return NextResponse.json({ 
      error: 'Errore nell\'aggiornamento del report', 
      details: String(err) 
    }, { status: 500 })
  }
}

// DELETE - Elimina un report
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('report_to_excel')
      .delete()
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 })
      }
      console.log('[API /api/reports/[id]] Errore eliminazione:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Report eliminato con successo'
    }, { status: 200 })
    
  } catch (err) {
    console.log('[API /api/reports/[id]] Errore generico:', err)
    return NextResponse.json({ 
      error: 'Errore nell\'eliminazione del report', 
      details: String(err) 
    }, { status: 500 })
  }
}