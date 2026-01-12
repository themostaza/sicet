import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const validRoles = ['operator', 'admin', 'referrer', 'all'];

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  let role = searchParams.get('role') || 'operator';
  if (!validRoles.includes(role)) role = 'operator';

  // Prepara la data "to" con fine giornata
  let toDate: string | null = null;
  if (to) {
    const d = new Date(to);
    d.setHours(23, 59, 59, 999);
    toDate = d.toISOString();
  }

  // Usa la funzione RPC ottimizzata (singola query invece di N query)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('get_operators_completion_counts', {
    p_from: from || null,
    p_to: toDate,
    p_role: role
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Mappa i risultati nel formato atteso dal frontend
  const operators = (data || []).map((row: { profile_id: string; email: string; role: string; completed_todolists: number }) => ({
    id: row.profile_id,
    email: row.email,
    role: row.role,
    completed_todolists: row.completed_todolists
  }));

  return NextResponse.json({ operators });
}
