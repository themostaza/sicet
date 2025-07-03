import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { template_name, file_url, field_mapping, email_autosend } = body
    console.log('[API /api/templates] Body ricevuto:', body)

    if (!template_name || !file_url || !field_mapping) {
      console.log('[API /api/templates] Mancano campi obbligatori')
      return NextResponse.json({ error: 'template_name, file_url e field_mapping sono obbligatori' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const insertData = {
      template_name,
      file_url,
      field_mapping,
      email_autosend: email_autosend || null
    }
    console.log('[API /api/templates] Dati da inserire:', insertData)
    const { data, error } = await supabase
      .from('export_templates')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.log('[API /api/templates] Errore Supabase:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    console.log('[API /api/templates] Record creato:', data)
    return NextResponse.json({ success: true, template: data }, { status: 201 })
  } catch (err) {
    console.log('[API /api/templates] Errore generico:', err)
    return NextResponse.json({ error: 'Errore nel parsing o inserimento', details: String(err) }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('export_templates')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.log('[API /api/templates] Errore GET Supabase:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, templates: data }, { status: 200 })
  } catch (err) {
    console.log('[API /api/templates] Errore generico GET:', err)
    return NextResponse.json({ error: 'Errore nel recupero dei template', details: String(err) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID mancante' }, { status: 400 })
    }
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase
      .from('export_templates')
      .delete()
      .eq('id', id)
    if (error) {
      console.log('[API /api/templates] Errore DELETE Supabase:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.log('[API /api/templates] Errore generico DELETE:', err)
    return NextResponse.json({ error: 'Errore durante l\'eliminazione', details: String(err) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, template_name, file_url, field_mapping, email_autosend } = body
    if (!id) {
      return NextResponse.json({ error: 'ID mancante' }, { status: 400 })
    }
    const supabase = await createServerSupabaseClient()
    const updateData: any = {}
    if (template_name !== undefined) updateData.template_name = template_name
    if (file_url !== undefined) updateData.file_url = file_url
    if (field_mapping !== undefined) updateData.field_mapping = field_mapping
    if (email_autosend !== undefined) updateData.email_autosend = email_autosend
    const { data, error } = await supabase
      .from('export_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    if (error) {
      console.log('[API /api/templates] Errore PUT Supabase:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, template: data }, { status: 200 })
  } catch (err) {
    console.log('[API /api/templates] Errore generico PUT:', err)
    return NextResponse.json({ error: 'Errore durante la modifica', details: String(err) }, { status: 500 })
  }
} 