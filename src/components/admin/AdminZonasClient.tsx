'use client';
import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Save, Truck } from 'lucide-react';
import { formatPrice } from '@/utils';
import type { ShippingZone } from '@/types';
import toast from 'react-hot-toast';

const EMPTY: Omit<ShippingZone, 'id' | 'created_at' | 'updated_at'> = {
  nombre: '', codigos_postales: [], costo: 0, dias_entrega: '', activo: true,
};

export function AdminZonasClient({ initialZones }: { initialZones: ShippingZone[] }) {
  const [zones, setZones]   = useState<ShippingZone[]>(initialZones);
  const [editing, setEditing] = useState<Partial<ShippingZone> | null>(null);
  const [isNew, setIsNew]     = useState(false);
  const [saving, setSaving]   = useState(false);

  const openNew  = () => { setEditing({ ...EMPTY }); setIsNew(true); };
  const openEdit = (z: ShippingZone) => { setEditing({ ...z }); setIsNew(false); };
  const close    = () => { setEditing(null); setIsNew(false); };

  const handleSave = async () => {
    if (!editing?.nombre) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    try {
      const payload = {
        ...editing,
        codigos_postales: typeof editing.codigos_postales === 'string'
          ? (editing.codigos_postales as string).split(',').map((s) => s.trim()).filter(Boolean)
          : editing.codigos_postales ?? [],
        costo: Number(editing.costo ?? 0),
      };

      const method = isNew ? 'POST' : 'PATCH';
      const body   = isNew ? payload : { id: editing.id, ...payload };

      const res  = await fetch('/api/admin/shipping-zones', {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const { data, error } = await res.json();
      if (error) throw new Error(error);

      if (isNew) {
        setZones((prev) => [...prev, data]);
      } else {
        setZones((prev) => prev.map((z) => z.id === data.id ? data : z));
      }
      toast.success(isNew ? 'Zona creada' : 'Zona actualizada');
      close();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta zona?')) return;
    const res  = await fetch('/api/admin/shipping-zones', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.error) { toast.error(data.error); return; }
    setZones((prev) => prev.filter((z) => z.id !== id));
    toast.success('Zona eliminada');
  };

  const toggleActive = async (zone: ShippingZone) => {
    const res = await fetch('/api/admin/shipping-zones', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: zone.id, activo: !zone.activo }),
    });
    const { data, error } = await res.json();
    if (error) { toast.error(error); return; }
    setZones((prev) => prev.map((z) => z.id === zone.id ? data : z));
  };

  return (
    <div>
      <div className="flex justify-end mb-5">
        <button onClick={openNew} className="btn-primary gap-2 text-sm">
          <Plus size={16} /> Nueva zona
        </button>
      </div>

      {/* ─── VISTA MÓVIL: CARDS ─── */}
      <div className="block sm:hidden space-y-3">
        {zones.map((z) => (
          <div key={z.id} className="card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium flex items-center gap-2">
                <Truck size={14} className="text-brand-500" /> {z.nombre}
              </span>
              <button onClick={() => toggleActive(z)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                  ${z.activo ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform
                  ${z.activo ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {z.codigos_postales.slice(0, 6).map((cp) => (
                <span key={cp} className="badge bg-surface-2 text-xs">{cp}</span>
              ))}
              {z.codigos_postales.length > 6 && (
                <span className="badge bg-surface-2 text-xs text-muted">+{z.codigos_postales.length - 6}</span>
              )}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Costo</span>
              <span className="font-semibold text-brand-600">{formatPrice(z.costo)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Entrega</span>
              <span className="text-muted">{z.dias_entrega ?? '—'}</span>
            </div>
            <div className="flex justify-end gap-1 pt-1 border-t border-border">
              <button onClick={() => openEdit(z)} className="btn-ghost p-1.5 text-muted hover:text-brand-600">
                <Pencil size={14} />
              </button>
              <button onClick={() => handleDelete(z.id)} className="btn-ghost p-1.5 text-muted hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {zones.length === 0 && (
          <div className="card p-12 text-center text-sm text-muted">No hay zonas de envío. Creá la primera.</div>
        )}
      </div>

      {/* ─── VISTA DESKTOP: TABLA ─── */}
      <div className="hidden sm:block card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface-2">
            <tr className="text-left text-xs text-muted">
              <th className="p-3">Zona</th>
              <th className="p-3">Códigos postales</th>
              <th className="p-3">Costo</th>
              <th className="p-3">Entrega</th>
              <th className="p-3">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {zones.map((z) => (
              <tr key={z.id} className="hover:bg-surface-2 transition-colors">
                <td className="p-3 font-medium">
                  <span className="flex items-center gap-2">
                    <Truck size={14} className="text-brand-500" />{z.nombre}
                  </span>
                </td>
                <td className="p-3 max-w-xs">
                  <div className="flex flex-wrap gap-1">
                    {z.codigos_postales.slice(0, 4).map((cp) => (
                      <span key={cp} className="badge bg-surface-2 text-xs">{cp}</span>
                    ))}
                    {z.codigos_postales.length > 4 && (
                      <span className="badge bg-surface-2 text-xs text-muted">+{z.codigos_postales.length - 4}</span>
                    )}
                  </div>
                </td>
                <td className="p-3 font-semibold text-brand-600">{formatPrice(z.costo)}</td>
                <td className="p-3 text-muted">{z.dias_entrega ?? '—'}</td>
                <td className="p-3">
                  <button onClick={() => toggleActive(z)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                      ${z.activo ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform
                      ${z.activo ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(z)} className="btn-ghost p-1.5 text-muted hover:text-brand-600">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(z.id)} className="btn-ghost p-1.5 text-muted hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {zones.length === 0 && (
          <p className="py-12 text-center text-sm text-muted">No hay zonas de envío. Creá la primera.</p>
        )}
      </div>

      {/* Modal (sin cambios) */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="w-full max-w-md rounded-2xl bg-surface shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-semibold">{isNew ? 'Nueva zona' : 'Editar zona'}</h2>
              <button onClick={close} className="btn-ghost p-1.5"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Nombre de la zona *</label>
                <input value={editing.nombre ?? ''} onChange={(e) => setEditing({ ...editing, nombre: e.target.value })}
                  placeholder="Ej: CABA, GBA Norte, Córdoba" className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Códigos postales (separados por coma)</label>
                <textarea
                  value={Array.isArray(editing.codigos_postales)
                    ? editing.codigos_postales.join(', ')
                    : (editing.codigos_postales as unknown as string) ?? ''}
                  onChange={(e) => setEditing({ ...editing, codigos_postales: e.target.value as unknown as string[] })}
                  rows={3} className="input-base resize-none text-sm font-mono"
                  placeholder="1000-1499, 1500, *" />
                <p className="text-xs text-muted mt-1">Rangos: <code>1000-1499</code> · Exacto: <code>1500</code> · Comodín: <code>*</code></p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Costo de envío ($)</label>
                  <input type="number" min="0" step="0.01" value={editing.costo ?? 0}
                    onChange={(e) => setEditing({ ...editing, costo: Number(e.target.value) })}
                    className="input-base" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Días de entrega</label>
                  <input value={editing.dias_entrega ?? ''} onChange={(e) => setEditing({ ...editing, dias_entrega: e.target.value })}
                    placeholder="3-5 días hábiles" className="input-base" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={editing.activo ?? true}
                  onChange={(e) => setEditing({ ...editing, activo: e.target.checked })}
                  className="accent-brand-500 h-4 w-4" />
                Zona activa
              </label>
            </div>
            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <button onClick={close} className="btn-secondary">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary gap-2">
                <Save size={15} />{saving ? 'Guardando…' : isNew ? 'Crear zona' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}