import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const cp = req.nextUrl.searchParams.get('cp')?.trim();
  if (!cp) return NextResponse.json({ error: 'Código postal requerido' }, { status: 400 });

  const supabase = await createClient();
  const { data: zones } = await supabase
    .from('shipping_zones')
    .select('*')
    .eq('activo', true);

  if (!zones?.length) {
    return NextResponse.json({ costo: 0, zona: 'Nacional', dias: '5-7 días hábiles' });
  }

  const match = zones.find((z) =>
    z.codigos_postales.some((zcp: string) => {
      if (zcp.includes('-')) {
        const [min, max] = zcp.split('-').map(Number);
        const num = parseInt(cp);
        return num >= min && num <= max;
      }
      return zcp === cp;
    })
  );

  if (!match) {
    // Check for wildcard zone
    const wildcard = zones.find((z) => z.codigos_postales.includes('*'));
    if (wildcard) {
      return NextResponse.json({ costo: wildcard.costo, zona: wildcard.nombre, dias: wildcard.dias_entrega });
    }
    return NextResponse.json({ error: 'No realizamos envíos a ese código postal' }, { status: 404 });
  }

  return NextResponse.json({ costo: match.costo, zona: match.nombre, dias: match.dias_entrega });
}
