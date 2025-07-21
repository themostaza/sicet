import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const validRoles = ['operator', 'admin', 'referrer', 'all'];

type Role = 'operator' | 'admin' | 'referrer';

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  let role = searchParams.get('role') || 'operator';
  if (!validRoles.includes(role)) role = 'operator';

  // Prendi tutti i profili, eventualmente filtra per ruolo
  let profileQuery = supabase
    .from('profiles')
    .select('id, email, role, auth_id');
  if (role !== 'all') {
    profileQuery = profileQuery.eq('role', role as Role);
  }
  const { data: profiles, error: profileError } = await profileQuery;

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Per ogni profilo, conta le todolist completate nell'intervallo usando la tabella todolist
  const results = [];
  for (const profile of profiles || []) {
    // Salta profili senza auth_id (utenti non ancora attivati)
    if (!profile.auth_id) {
      results.push({
        id: profile.id,
        email: profile.email,
        role: profile.role,
        completed_todolists: 0,
      });
      continue;
    }

    let query = supabase
      .from('todolist')
      .select('id', { count: 'exact', head: true })
      .eq('completed_by', profile.auth_id)
      .eq('status', 'completed');
    
    // Filtra per completion_date nell'intervallo specificato
    if (from) query = query.gte('completion_date', from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      query = query.lte('completion_date', toDate.toISOString());
    }
    
    const { count, error: countError } = await query;
    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }
    
    results.push({
      id: profile.id,
      email: profile.email,
      role: profile.role,
      completed_todolists: count || 0,
    });
  }

  return NextResponse.json({ operators: results });
} 