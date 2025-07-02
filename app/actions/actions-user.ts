'use server'

import { createServerSupabaseClient, createServerSupabaseAdminClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"

export async function deleteUser(email: string) {
  if (!email) {
    throw new Error('Email non fornita')
  }

  try {
    const supabase = await createServerSupabaseClient()
    const supabaseAdmin = createServerSupabaseAdminClient()

    // Verifica che l'utente sia autenticato e sia admin
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      console.error('Session error:', sessionError)
      throw new Error('Errore di autenticazione')
    }

    if (!session?.user?.email) {
      throw new Error('Non autorizzato')
    }

    // Verifica che l'utente sia admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_id', session.user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      console.error('Profile error or not admin:', { profileError, profile })
      throw new Error('Non autorizzato: richiesto ruolo admin')
    }

    // Trova il profilo da cancellare
    const { data: profileToDelete, error: findError } = await supabaseAdmin
      .from('profiles')
      .select('id, auth_id')
      .eq('email', email)
      .eq('status', 'reset-password')
      .single()

    if (findError) {
      console.error('Error finding profile:', findError)
      throw new Error('Profilo non trovato o già cancellato')
    }

    if (!profileToDelete) {
      throw new Error('Profilo non trovato')
    }

    // Se esiste un utente auth, cancellalo
    if (profileToDelete.auth_id) {
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(profileToDelete.auth_id)
      if (deleteAuthError) {
        console.error('Error deleting auth user:', deleteAuthError)
        // Non bloccare se la cancellazione auth fallisce
      }
    }

    // Aggiorna il profilo: imposta auth_id a null e status a 'deleted'
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        auth_id: null, 
        status: 'deleted' 
      })
      .eq('id', profileToDelete.id)
      .select()

    if (updateError) {
      console.error('Error updating profile:', updateError)
      throw new Error('Errore durante la cancellazione del profilo')
    }

    console.log('Profile deleted successfully:', updatedProfile)

    // Revalidate the preregister page
    revalidatePath('/admin/preregister')

    return { success: true }
  } catch (error) {
    console.error('Error in deleteUser action:', error)
    throw error
  }
}

export async function preregisterUser(email: string, role: 'operator' | 'admin' | 'referrer') {
  if (!email || !role) {
    throw new Error('Email e ruolo sono obbligatori')
  }

  // Validate role
  if (!['operator', 'admin', 'referrer'].includes(role)) {
    throw new Error('Ruolo non valido')
  }

  try {
    const supabase = await createServerSupabaseClient()
    const supabaseAdmin = createServerSupabaseAdminClient()

    // Verify the current user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Non autorizzato')
    }

    // Check if user has admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      throw new Error('Accesso negato. Solo gli amministratori possono preregistrare utenti.')
    }

    // Check if email already exists (including deleted profiles)
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id, status, auth_id')
      .eq('email', email)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error('Errore durante la verifica dell\'email')
    }

    let newProfile;
    if (existingProfile) {
      // Se il profilo esiste ma è cancellato, ripristinalo
      if (existingProfile.status === 'deleted') {
        const { data: restoredProfile, error: restoreError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            role, 
            status: 'reset-password',
            auth_id: null // Reset auth_id per permettere nuova registrazione
          })
          .eq('id', existingProfile.id)
          .select()
          .single()

        if (restoreError) {
          console.error('Error restoring profile:', restoreError)
          throw new Error('Errore durante il ripristino del profilo')
        }

        newProfile = restoredProfile;
      } else {
        // Se il profilo esiste e non è cancellato, errore
        throw new Error('Email già registrata')
      }
    } else {
      // Insert new profile
      const { data: insertedProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert([{ 
          email, 
          role, 
          status: 'reset-password' 
        }])
        .select()
        .single()

      if (insertError) {
        console.error('Error inserting profile:', insertError)
        throw new Error('Errore durante la registrazione del profilo')
      }

      newProfile = insertedProfile;
    }

    // Revalidate the preregister page
    revalidatePath('/admin/preregister')

    return { 
      success: true, 
      message: 'Utente pre-registrato con successo. L\'utente può ora andare su /reset per impostare la password.',
      profile: newProfile
    }

  } catch (error) {
    console.error('Error in preregisterUser action:', error)
    throw error
  }
}

export async function getPreregisteredUsers() {
  try {
    const supabase = await createServerSupabaseClient()
    const supabaseAdmin = createServerSupabaseAdminClient()

    // Verify the current user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Non autorizzato')
    }

    // Check if user has admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      throw new Error('Accesso negato. Solo gli amministratori possono visualizzare gli utenti.')
    }

    // Get all profiles except deleted ones using admin client to bypass RLS
    const { data: profiles, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching profiles:', fetchError)
      throw new Error('Errore nel recupero utenti')
    }

    console.log('Fetched profiles:', profiles)

    return { 
      success: true, 
      profiles: profiles || []
    }

  } catch (error) {
    console.error('Error in getPreregisteredUsers action:', error)
    throw error
  }
} 