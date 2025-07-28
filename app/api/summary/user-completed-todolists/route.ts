import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get('user_id');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  
  if (!user_id) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  try {
    // Prima trova l'auth_id dell'utente dal profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('auth_id')
      .eq('id', user_id)
      .single();

    if (profileError || !profile?.auth_id) {
      return NextResponse.json({ error: 'User not found or not activated' }, { status: 404 });
    }

    // Query sulla tabella todolist usando completed_by
    let query = supabase
      .from('todolist')
      .select(`
        id,
        device_id,
        completion_date,
        scheduled_execution,
        todolist_category,
        devices!inner(name, id)
      `)
      .eq('completed_by', profile.auth_id)
      .eq('status', 'completed')
      .not('completion_date', 'is', null);

    // Applica filtri di date se specificati
    if (from) query = query.gte('completion_date', from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      query = query.lte('completion_date', toDate.toISOString());
    }

    // Ordina per completion_date discendente (più recenti prime)
    query = query.order('completion_date', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Trasforma i dati nel formato atteso dal frontend
    const todolists = (data || []).map(item => ({
      id: item.id,
      entity_id: item.devices?.name || item.devices?.id || 'Unknown',
      created_at: item.completion_date,
      metadata: {
        device_id: item.device_id,
        scheduled_execution: item.scheduled_execution,
        device_name: item.devices?.name,
        todolist_category: item.todolist_category
      }
    }));

    return NextResponse.json({ todolists });

  } catch (error) {
    console.error('Error in user-completed-todolists API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 