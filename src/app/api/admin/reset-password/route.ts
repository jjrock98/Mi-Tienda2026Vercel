import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  console.log('🔹 API de reseteo de contraseña llamada');
  try {
    const { userId, newPassword } = await req.json();
    console.log('📌 userId:', userId, 'newPassword:', newPassword);

    if (!userId || !newPassword) {
      console.log('❌ Faltan datos');
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    console.log('✅ Cliente admin creado');

    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      console.log('❌ Error de Supabase:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Contraseña actualizada correctamente');
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('❌ Error inesperado:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}