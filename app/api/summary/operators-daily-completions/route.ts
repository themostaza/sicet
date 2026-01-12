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

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to dates are required' }, { status: 400 });
  }

  try {
    // Prepara la data "to" con fine giornata
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    // Usa la funzione RPC ottimizzata (singola query aggregata)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_operators_daily_completions', {
      p_from: from,
      p_to: toDate.toISOString(),
      p_role: role
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Trasforma i dati in formato Recharts: un oggetto per data con email come chiavi
    const chartDataMap: Record<string, Record<string, any>> = {};
    
    (data || []).forEach((row: { completion_date: string; email: string; daily_count: number }) => {
      const dateKey = row.completion_date;
      
      if (!chartDataMap[dateKey]) {
        chartDataMap[dateKey] = { date: dateKey };
      }
      
      chartDataMap[dateKey][row.email] = row.daily_count;
    });

    // Converti in array ordinato per data
    const chartData = Object.values(chartDataMap).sort((a, b) => 
      a.date.localeCompare(b.date)
    );

    return NextResponse.json({ data: chartData });

  } catch (error) {
    console.error('Error in operators daily completions API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
