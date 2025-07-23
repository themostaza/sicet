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

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to dates are required' }, { status: 400 });
  }

  try {
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

    // Filtra solo profili con auth_id (utenti attivati)
    const activeProfiles = (profiles || []).filter(p => p.auth_id);

    if (activeProfiles.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Query per ottenere tutte le todolist completate nell'intervallo
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const { data: completions, error: completionsError } = await supabase
      .from('todolist')
      .select('completed_by, completion_date')
      .eq('status', 'completed')
      .not('completion_date', 'is', null)
      .not('completed_by', 'is', null)
      .gte('completion_date', from)
      .lte('completion_date', toDate.toISOString())
      .in('completed_by', activeProfiles.map(p => p.auth_id));

    if (completionsError) {
      return NextResponse.json({ error: completionsError.message }, { status: 500 });
    }

    // Crea mappa auth_id -> email per lookup veloce
    const authIdToEmail = activeProfiles.reduce((acc, profile) => {
      if (profile.auth_id) {
        acc[profile.auth_id] = profile.email;
      }
      return acc;
    }, {} as Record<string, string>);

    // Genera array di date nell'intervallo
    const dates: string[] = [];
    const startDate = new Date(from);
    const endDate = new Date(to);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().slice(0, 10));
    }

    // Inizializza struttura dati: { date: { email: count } }
    const dailyData: Record<string, Record<string, number>> = {};
    dates.forEach(date => {
      dailyData[date] = {};
      activeProfiles.forEach(profile => {
        dailyData[date][profile.email] = 0;
      });
    });

    // Popola i dati con i completamenti
    (completions || []).forEach(completion => {
      if (completion.completion_date && completion.completed_by) {
        const completionDate = completion.completion_date.slice(0, 10);
        const email = authIdToEmail[completion.completed_by];
        
        if (email && dailyData[completionDate]) {
          dailyData[completionDate][email] = (dailyData[completionDate][email] || 0) + 1;
        }
      }
    });

    // Converte in formato per Recharts
    const chartData = dates.map(date => {
      const entry: Record<string, any> = { date };
      Object.entries(dailyData[date]).forEach(([email, count]) => {
        entry[email] = count;
      });
      return entry;
    });

    return NextResponse.json({ data: chartData });

  } catch (error) {
    console.error('Error in operators daily completions API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 