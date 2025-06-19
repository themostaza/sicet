import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password, role } = await request.json();

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Email, password e ruolo sono obbligatori' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verifica se l'email esiste in profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Email non autorizzata per la registrazione' },
        { status: 400 }
      );
    }

    if (profile.status === 'activated') {
      return NextResponse.json(
        { error: 'Account già attivato' },
        { status: 400 }
      );
    }

    // Crea l'account Supabase
    const { data: { user }, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: profile.role }
    });

    if (signUpError) {
      return NextResponse.json(
        { error: signUpError.message },
        { status: 400 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Errore durante la creazione dell\'account' },
        { status: 500 }
      );
    }

    // Aggiorna lo stato del profilo a 'activated'
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ status: 'activated' })
      .eq('email', email);

    if (updateError) {
      return NextResponse.json(
        { error: `Errore nell'attivazione del profilo: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Registrazione completata con successo',
      user: { id: user.id, email: user.email }
    });

  } catch (error) {
    console.error('Error in signup API:', error);
    return NextResponse.json(
      { error: 'Si è verificato un errore imprevisto' },
      { status: 500 }
    );
  }
} 