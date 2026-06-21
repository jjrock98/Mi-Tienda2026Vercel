import { createAdminClient } from '@/lib/supabase/admin';
import { AdminZonasClient } from '@/components/admin/AdminZonasClient';
import type { ShippingZone } from '@/types';

export const metadata = { title: 'Zonas de envío – Admin' };
export const revalidate = 0;

export default async function AdminZonasPage() {
  const admin = createAdminClient();
  const { data: zones } = await admin
    .from('shipping_zones')
    .select('*')
    .order('nombre');

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Zonas de Envío</h1>
      <p className="text-sm text-muted">
        Definí zonas por código postal o rango (ej: <code className="bg-surface-2 px-1 rounded">1000-1499</code>).
        Usá <code className="bg-surface-2 px-1 rounded">*</code> como comodín para &quot;resto del país&quot;.
      </p>
      <AdminZonasClient initialZones={(zones ?? []) as ShippingZone[]} />
    </div>
  );
}
