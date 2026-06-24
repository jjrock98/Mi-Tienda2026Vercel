// src/app/api/cron/liberar-reservas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  // 🔒 Proteger con API Key
  const authHeader = req.headers.get('authorization');
  const expectedKey = process.env.CRON_SECRET_KEY;

  if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
    console.warn('[CRON] Intento no autorizado');
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const admin = createAdminClient();

  try {
    // Llamar a la función RPC que libera reservas expiradas
    const { data, error } = await admin.rpc('liberar_reservas_expiradas');

    if (error) {
      console.error('[CRON] Error ejecutando liberar_reservas_expiradas:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[CRON] Resultado:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[CRON] Error inesperado:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// Opcional: también aceptar POST por si Vercel lo requiere
export async function POST(req: NextRequest) {
  return GET(req);
}