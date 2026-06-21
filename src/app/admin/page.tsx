import { createAdminClient } from '@/lib/supabase/admin';
import { formatPrice } from '@/utils';
import { ShoppingBag, Package, MessageSquare, TrendingUp, AlertCircle } from 'lucide-react';

export const metadata = { title: 'Dashboard – Admin' };
export const revalidate = 60;

export default async function AdminDashboard() {
  const admin = createAdminClient();

  const [
    { count: totalOrders },
    { count: pendingOrders },
    { count: totalProducts },
    { count: lowStockCount },
    { count: unreadMessages },
    { data: recentOrders },
    { data: revenueData },
  ] = await Promise.all([
    admin.from('orders').select('*', { count: 'exact', head: true }),
    admin.from('orders').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
    admin.from('products').select('*', { count: 'exact', head: true }).eq('activo', true),
    admin.from('products').select('*', { count: 'exact', head: true }).lt('stock_unidades', 12).eq('activo', true),
    admin.from('contact_messages').select('*', { count: 'exact', head: true }).eq('leido', false),
    admin.from('orders').select('id,total,estado,nombre,created_at').order('created_at', { ascending: false }).limit(5),
    admin.from('orders').select('total,created_at').eq('estado', 'pagado').gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
  ]);

  const monthRevenue = (revenueData ?? []).reduce((acc: number, o: { total: number }) => acc + Number(o.total), 0);

  const stats = [
    { label: 'Pedidos totales',     value: totalOrders ?? 0,   icon: ShoppingBag, color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-950/20' },
    { label: 'Pendientes de pago',  value: pendingOrders ?? 0, icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
    { label: 'Productos activos',   value: totalProducts ?? 0, icon: Package,     color: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-950/20' },
    { label: 'Mensajes sin leer',   value: unreadMessages ?? 0,icon: MessageSquare,color: 'text-purple-500',bg: 'bg-purple-50 dark:bg-purple-950/20' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted">Resumen del negocio</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5">
            <div className={`inline-flex rounded-xl p-2.5 ${bg} mb-3`}>
              <Icon size={20} className={color} />
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Revenue + Low stock */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-green-500" />
            <h2 className="font-semibold">Ingresos (últimos 30 días)</h2>
          </div>
          <p className="text-3xl font-bold text-green-600">{formatPrice(monthRevenue)}</p>
          <p className="text-xs text-muted mt-1">Solo pedidos confirmados</p>
        </div>

        {(lowStockCount ?? 0) > 0 && (
          <div className="card border-yellow-200 bg-yellow-50 dark:bg-yellow-950/10 p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={18} className="text-yellow-600" />
              <h2 className="font-semibold text-yellow-800 dark:text-yellow-300">Stock bajo</h2>
            </div>
            <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">{lowStockCount}</p>
            <p className="text-xs text-yellow-700/70 dark:text-yellow-400/70 mt-1">Productos con menos de 12 unidades</p>
            <a href="/admin/productos?filter=lowstock" className="mt-3 text-xs text-yellow-700 underline dark:text-yellow-400">
              Ver productos →
            </a>
          </div>
        )}
      </div>

      {/* Recent orders */}
      <div className="card p-5">
        <h2 className="font-semibold mb-4">Pedidos recientes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="pb-2 pr-4">ID</th>
                <th className="pb-2 pr-4">Cliente</th>
                <th className="pb-2 pr-4">Total</th>
                <th className="pb-2">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(recentOrders ?? []).map((o: { id: string; nombre: string; total: number; estado: string; created_at: string }) => (
                <tr key={o.id} className="hover:bg-surface-2 transition-colors">
                  <td className="py-2.5 pr-4 font-mono text-xs text-muted">#{o.id.slice(0,8).toUpperCase()}</td>
                  <td className="py-2.5 pr-4 font-medium">{o.nombre}</td>
                  <td className="py-2.5 pr-4 text-brand-600 font-semibold">{formatPrice(o.total)}</td>
                  <td className="py-2.5">
                    <span className={`badge ${
                      o.estado === 'pagado'    ? 'bg-green-100 text-green-700' :
                      o.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'}`}>
                      {o.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(recentOrders ?? []).length === 0 && (
            <p className="py-8 text-center text-sm text-muted">No hay pedidos aún</p>
          )}
        </div>
        <a href="/admin/pedidos" className="mt-4 block text-center text-xs text-brand-600 hover:underline">
          Ver todos los pedidos →
        </a>
      </div>
    </div>
  );
}
