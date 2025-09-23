import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '50')
    
    const supabase = await createServerSupabaseClient()
    
    let query = supabase
      .from('kpis')
      .select('id, name, value, description, created_at')
      .eq('deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    // Se c'è un parametro di ricerca, filtra per nome o ID
    if (search.trim()) {
      query = query.or(`name.ilike.%${search}%,id.ilike.%${search}%`)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.log('[API /api/templates/kpis] Errore Supabase:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Processa i dati per includere i campi disponibili dal jsonb
    const processedData = data.map(kpi => ({
      id: kpi.id,
      name: kpi.name,
      description: kpi.description,
      created_at: kpi.created_at,
      value: kpi.value, // Include the original value field for matrix processing
      // Estrai i nomi dei campi dal jsonb value
      fields: Array.isArray(kpi.value) ? kpi.value.map((field: any) => ({
        name: field.name,
        type: field.type,
        description: field.description,
        required: field.required
      })) : []
    }))
    
    return NextResponse.json({ 
      success: true, 
      kpis: processedData,
      total: data.length
    }, { status: 200 })
    
  } catch (err) {
    console.log('[API /api/templates/kpis] Errore generico:', err)
    return NextResponse.json({ 
      error: 'Errore nel recupero dei KPI', 
      details: String(err) 
    }, { status: 500 })
  }
} 