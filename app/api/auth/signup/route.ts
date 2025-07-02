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

    // Verifica se l'email esiste in profiles (escludendo quelli cancellati)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .neq('status', 'deleted')
      .single();

    console.log('Profile lookup result:', { profile, profileError });

    if (profileError || !profile) {
      console.error('Profile not found or error:', profileError);
      return NextResponse.json(
        { error: 'Email non autorizzata per la registrazione' },
        { status: 400 }
      );
    }

    if (profile.status === 'activated') {
      console.log('Profile already activated:', profile);
      return NextResponse.json(
        { error: 'Account già attivato' },
        { status: 400 }
      );
    }

    console.log('Profile found for registration:', { 
      id: profile.id, 
      email: profile.email, 
      status: profile.status,
      auth_id: profile.auth_id 
    });

    // Crea l'account Supabase
    const { data: { user }, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: profile.role }
    });

    if (signUpError) {
      console.error('Error creating auth user:', signUpError);
      return NextResponse.json(
        { error: signUpError.message },
        { status: 400 }
      );
    }

    if (!user) {
      console.error('No user returned from auth creation');
      return NextResponse.json(
        { error: 'Errore durante la creazione dell\'account' },
        { status: 500 }
      );
    }

    console.log('Auth user created successfully:', { userId: user.id, email: user.email });

    // Aggiorna lo stato del profilo a 'activated' e imposta auth_id
    let updateError = null;
    
    try {
      // Prova prima con auth_id
      const { error: authIdError } = await supabase
        .from('profiles')
        .update({ 
          status: 'activated', 
          auth_id: user.id 
        })
        .eq('id', profile.id);
      
      updateError = authIdError;
      console.log('Update with auth_id result:', { error: authIdError });
      
    } catch (error) {
      console.error('Exception during update with auth_id:', error);
      
      // Se fallisce, prova solo con status
      const { error: statusError } = await supabase
        .from('profiles')
        .update({ 
          status: 'activated'
        })
        .eq('id', profile.id);
      
      updateError = statusError;
      console.log('Update with status only result:', { error: statusError });
    }

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return NextResponse.json(
        { error: `Errore nell'attivazione del profilo: ${updateError.message}` },
        { status: 500 }
      );
    }

    console.log('Profile updated successfully:', { profileId: profile.id, authId: user.id });

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