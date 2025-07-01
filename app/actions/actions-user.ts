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
      .eq('email', session.user.email)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      console.error('Profile error or not admin:', { profileError, profile })
      throw new Error('Non autorizzato: richiesto ruolo admin')
    }

    // Prima elimina dal profilo usando il client admin per bypassare RLS
    const { data: deletedProfile, error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('email', email)
      .select()

    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError)
      throw new Error('Errore durante l\'eliminazione del profilo')
    }

    console.log('Profile deleted successfully:', deletedProfile)

    // Poi elimina l'utente usando il client admin (se esiste)
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) {
      console.error('Error listing users:', listError)
    } else {
      const userToDelete = users.find(u => u.email === email)
      if (userToDelete) {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userToDelete.id)
        if (deleteError) {
          console.error('Error deleting user:', deleteError)
        }
      }
    }

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
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      throw new Error('Accesso negato. Solo gli amministratori possono preregistrare utenti.')
    }

    // Check if email already exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error('Errore durante la verifica dell\'email')
    }

    if (existingProfile) {
      throw new Error('Email già registrata')
    }

    // Insert new profile
    const { data: newProfile, error: insertError } = await supabaseAdmin
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
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      throw new Error('Accesso negato. Solo gli amministratori possono visualizzare gli utenti.')
    }

    // Get all profiles using admin client to bypass RLS
    const { data: profiles, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
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