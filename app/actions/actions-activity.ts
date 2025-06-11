'use server'

import { createServerSupabaseClient } from "../../lib/supabase-server";
import type { Database } from "@/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

// Define the types manually since they might not be in the database types yet
type UserActionType = 'create_device' | 'create_kpi' | 'create_todolist' | 'complete_task' | 
                     'update_device' | 'update_kpi' | 'update_todolist' | 
                     'delete_device' | 'delete_kpi' | 'delete_todolist';
type EntityType = 'device' | 'kpi' | 'todolist' | 'task';

const supabase = async (): Promise<SupabaseClient<Database>> =>
  await createServerSupabaseClient();

/**
 * Logs a user activity in the database
 */
export async function logActivity(
  userId: string,
  actionType: UserActionType,
  entityType: EntityType,
  entityId: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  console.log('Attempting to log activity:', {
    userId,
    actionType,
    entityType,
    entityId,
    metadata
  });

  try {
    const { data, error } = await (await supabase())
      .from('user_activities')
      .insert({
        user_id: userId,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        metadata
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging activity:', {
        error,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details
      });
      return;
    }

    console.log('Successfully logged activity:', data);
  } catch (e) {
    console.error('Unexpected error while logging activity:', e);
  }
}

/**
 * Helper function to get the current user's ID
 */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { user }, error } = await (await supabase()).auth.getUser();
    
    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }

    if (!user) {
      console.error('No user found in session');
      return null;
    }

    console.log('Current user found:', user.id);
    return user.id;
  } catch (e) {
    console.error('Unexpected error getting current user:', e);
    return null;
  }
}

/**
 * Logs an activity for the current user
 */
export async function logCurrentUserActivity(
  actionType: UserActionType,
  entityType: EntityType,
  entityId: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  console.log('Starting logCurrentUserActivity for:', {
    actionType,
    entityType,
    entityId,
    metadata
  });

  const userId = await getCurrentUserId();
  if (!userId) {
    console.error('No user found when trying to log activity');
    return;
  }
  
  await logActivity(userId, actionType, entityType, entityId, metadata);
} 