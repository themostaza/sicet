import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e password sono obbligatori' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verifica se l'email esiste in profiles e se lo stato è 'reset-password'
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Email non trovata nel sistema' },
        { status: 400 }
      );
    }

    // Verifica che lo stato sia 'reset-password'
    if (profile.status !== 'reset-password') {
      return NextResponse.json(
        { error: 'Reset password non autorizzato. Contatta l\'amministratore.' },
        { status: 400 }
      );
    }

    // Verifica se l'utente esiste già in Supabase
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      return NextResponse.json(
        { error: 'Errore durante la verifica dell\'utente' },
        { status: 500 }
      );
    }

    const existingUser = users.find(u => u.email === email);

    if (existingUser) {
      // Utente esiste, aggiorna la password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { password: password }
      );

      if (updateError) {
        return NextResponse.json(
          { error: `Errore nell'aggiornamento della password: ${updateError.message}` },
          { status: 400 }
        );
      }
    } else {
      // Utente non esiste, crea nuovo account
      const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { role: profile.role }
      });

      if (createError) {
        return NextResponse.json(
          { error: `Errore nella creazione dell'account: ${createError.message}` },
          { status: 400 }
        );
      }

      if (!user) {
        return NextResponse.json(
          { error: 'Errore durante la creazione dell\'account' },
          { status: 500 }
        );
      }
    }

    // Aggiorna lo stato del profilo a 'activated'
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ status: 'activated' })
      .eq('email', email);

    if (updateProfileError) {
      return NextResponse.json(
        { error: `Errore nell'attivazione del profilo: ${updateProfileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Password impostata con successo!'
    });

  } catch (error) {
    console.error('Error in reset password API:', error);
    return NextResponse.json(
      { error: 'Si è verificato un errore imprevisto' },
      { status: 500 }
    );
  }
} 