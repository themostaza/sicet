import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email obbligatoria' },
        { status: 400 }
      );
    }

    // Verifica autenticazione admin
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    // Verifica che l'utente sia admin
    const { data: adminProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('email', user.email || '')
      .single();

    if (profileError || !adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Non autorizzato: richiesto ruolo admin' },
        { status: 403 }
      );
    }

    // Ora usa il client admin per le operazioni sul database
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verifica se l'email esiste in profiles
    const { data: profile, error: targetProfileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (targetProfileError || !profile) {
      return NextResponse.json(
        { error: 'Email non trovata nel sistema' },
        { status: 400 }
      );
    }

    // Aggiorna lo stato del profilo a 'reset-password'
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ status: 'reset-password' })
      .eq('email', email);

    if (updateError) {
      return NextResponse.json(
        { error: `Errore nell'aggiornamento del profilo: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Reset password attivato. L\'utente può ora andare su /reset per cambiare la password.'
    });

  } catch (error) {
    console.error('Error in reset password API:', error);
    return NextResponse.json(
      { error: 'Si è verificato un errore imprevisto' },
      { status: 500 }
    );
  }
} 