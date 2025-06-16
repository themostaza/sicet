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

    // Prima elimina dal profilo
    const { error: profileDeleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('email', email)

    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError)
      throw new Error('Errore durante l\'eliminazione del profilo')
    }

    // Poi elimina l'utente usando il client admin
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) {
      console.error('Error listing users:', listError)
      throw new Error('Errore nel recupero degli utenti')
    }

    const userToDelete = users.find(u => u.email === email)
    if (!userToDelete) {
      throw new Error('Utente non trovato')
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userToDelete.id)
    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      // Se l'eliminazione dell'utente fallisce, non possiamo fare molto
      // ma almeno il profilo è stato eliminato
      throw new Error('Errore durante l\'eliminazione dell\'utente')
    }

    // Revalidate the preregister page
    revalidatePath('/admin/preregister')

    return { success: true }
  } catch (error) {
    console.error('Error in deleteUser action:', error)
    throw error
  }
} 