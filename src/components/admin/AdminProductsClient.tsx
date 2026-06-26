'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Plus, Pencil, Trash2, X, Upload, Package, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { slugify, formatPrice } from '@/utils';
import type { Product } from '@/types';
import toast from 'react-hot-toast';

const EMPTY: Omit<Product, 'id' | 'created_at' | 'updated_at'> = {
  nombre: '', slug: '', descripcion: '', descripcion_corta: '',
  imagenes: [], stock_unidades: 0,
  precio_media_docena: 0, precio_docena: 0,
  colores: [], talles: [], activo: true, destacado: false,
};

export function AdminProductsClient({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [editing, setEditing]   = useState<Partial<Product> | null>(null);
  const [isNew, setIsNew]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState('');
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();

  const filtered = products.filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setEditing({ ...EMPTY }); setIsNew(true); };
  const openEdit = (p: Product) => { setEditing({ ...p }); setIsNew(false); };
  const close = () => { setEditing(null); setIsNew(false); };

  const setField = (k: keyof Product) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.type === 'number' ? Number(e.target.value) :
                e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setEditing((prev) => {
      const updated = { ...prev!, [k]: val };
      if (k === 'nombre' && isNew) updated.slug = slugify(String(val));
      return updated;
    });
  };

  const setArrayField = (k: 'colores' | 'talles', val: string) => {
    setEditing((prev) => ({ ...prev!, [k]: val.split(',').map((s) => s.trim()).filter(Boolean) }));
  };

  const uploadImages = async (files: FileList) => {
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const path = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      const { error } = await supabase.storage.from('products').upload(path, file, { upsert: true });
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(path);
        urls.push(publicUrl);
      }
    }
    setEditing((prev) => ({ ...prev!, imagenes: [...(prev?.imagenes ?? []), ...urls] }));
    setUploading(false);
    toast.success(`${urls.length} imagen${urls.length !== 1 ? 'es' : ''} subida${urls.length !== 1 ? 's' : ''}`);
  };

  const removeImage = (url: string) => {
    setEditing((prev) => ({ ...prev!, imagenes: prev!.imagenes!.filter((i) => i !== url) }));
  };

  const handleSave = async () => {
    if (!editing?.nombre || !editing.slug) { toast.error('Nombre y slug son requeridos'); return; }
    setSaving(true);
    try {
      const payload = {
        nombre:              editing.nombre,
        slug:                editing.slug,
        descripcion:         editing.descripcion   || null,
        descripcion_corta:   editing.descripcion_corta || null,
        imagenes:            editing.imagenes       ?? [],
        stock_unidades:      Number(editing.stock_unidades ?? 0),
        precio_media_docena: Number(editing.precio_media_docena ?? 0),
        precio_docena:       Number(editing.precio_docena ?? 0),
        colores:             editing.colores        ?? [],
        talles:              editing.talles         ?? [],
        activo:              editing.activo         ?? true,
        destacado:           editing.destacado      ?? false,
      };

      if (isNew) {
        const res = await fetch('/api/admin/products', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const { data, error } = await res.json();
        if (error) throw new Error(error);
        setProducts((prev) => [data, ...prev]);
        toast.success('Producto creado');
      } else {
        const res = await fetch(`/api/admin/products/${editing.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const { data, error } = await res.json();
        if (error) throw new Error(error);
        setProducts((prev) => prev.map((p) => p.id === editing.id ? data : p));
        toast.success('Producto actualizado');
      }
      close();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;
    const res  = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.error) { toast.error(data.error); return; }
    setProducts((prev) => prev.filter((p) => p.id !== id));
    toast.success('Producto eliminado');
  };

  return (
    <div>
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar productos…" className="input-base pl-9 py-2 text-sm" />
        </div>
        <button onClick={openNew} className="btn-primary gap-2 text-sm">
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      {/* ─── VISTA MÓVIL: CARDS ─── */}
      <div className="block sm:hidden space-y-3">
        {filtered.map((p) => (
          <div key={p.id} className="card p-4 space-y-2">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-surface-2 shrink-0">
                {p.imagenes[0]
                  ? <Image src={p.imagenes[0]} alt={p.nombre} fill className="object-cover" sizes="48px" />
                  : <Package size={18} className="m-auto text-muted absolute inset-0" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{p.nombre}</p>
                <p className="text-xs text-muted truncate">{p.slug}</p>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Stock</span>
              <span className={`font-semibold ${p.stock_unidades < 12 ? 'text-red-500' : p.stock_unidades < 30 ? 'text-yellow-500' : 'text-green-600'}`}>
                {p.stock_unidades} uds
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">½ Docena</span>
              <span className="text-brand-600 font-medium">{formatPrice(p.precio_media_docena)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Docena</span>
              <span className="text-brand-600 font-medium">{formatPrice(p.precio_docena)}</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <div>
                <span className={`badge ${p.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.activo ? 'Activo' : 'Inactivo'}
                </span>
                {p.destacado && <span className="badge bg-brand-100 text-brand-700 ml-1">★ Destacado</span>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(p)} className="btn-ghost p-1.5 text-muted hover:text-brand-600">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(p.id)} className="btn-ghost p-1.5 text-muted hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="card p-12 text-center text-sm text-muted">No hay productos.</div>
        )}
      </div>

      {/* ─── VISTA DESKTOP: TABLA ─── */}
      <div className="hidden sm:block card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-2">
              <tr className="text-left text-xs text-muted">
                <th className="p-3">Producto</th>
                <th className="p-3">Stock</th>
                <th className="p-3">½ Docena</th>
                <th className="p-3">Docena</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-surface-2 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-surface-2 shrink-0">
                        {p.imagenes[0]
                          ? <Image src={p.imagenes[0]} alt={p.nombre} fill className="object-cover" sizes="40px" />
                          : <Package size={16} className="m-auto text-muted absolute inset-0" />}
                      </div>
                      <div>
                        <p className="font-medium line-clamp-1">{p.nombre}</p>
                        <p className="text-xs text-muted">{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`font-semibold ${p.stock_unidades < 12 ? 'text-red-500' : p.stock_unidades < 30 ? 'text-yellow-500' : 'text-green-600'}`}>
                      {p.stock_unidades}
                    </span>
                  </td>
                  <td className="p-3 text-brand-600 font-medium">{formatPrice(p.precio_media_docena)}</td>
                  <td className="p-3 text-brand-600 font-medium">{formatPrice(p.precio_docena)}</td>
                  <td className="p-3">
                    <span className={`badge ${p.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    {p.destacado && <span className="badge bg-brand-100 text-brand-700 ml-1">Destacado</span>}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="btn-ghost p-1.5 text-muted hover:text-brand-600">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="btn-ghost p-1.5 text-muted hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="py-12 text-center text-sm text-muted">No hay productos.</p>
          )}
        </div>
      </div>

      {/* Edit/Create modal (sin cambios) */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-surface shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-semibold">{isNew ? 'Nuevo producto' : 'Editar producto'}</h2>
              <button onClick={close} className="btn-ghost p-1.5"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Images */}
              <div>
                <p className="text-xs font-medium mb-2">Imágenes</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(editing.imagenes ?? []).map((url) => (
                    <div key={url} className="relative h-16 w-16">
                      <Image src={url} alt="" fill className="rounded-lg object-cover" sizes="64px" />
                      <button onClick={() => removeImage(url)}
                        className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-brand-400 transition-colors">
                    <input type="file" multiple accept="image/*" className="hidden"
                      onChange={(e) => e.target.files && uploadImages(e.target.files)} />
                    {uploading ? <span className="text-xs text-muted">...</span> : <Upload size={16} className="text-muted" />}
                  </label>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Nombre *</label>
                  <input value={editing.nombre ?? ''} onChange={setField('nombre')} className="input-base" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Slug</label>
                  <input value={editing.slug ?? ''} onChange={setField('slug')} className="input-base font-mono text-xs" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Descripción corta</label>
                <input value={editing.descripcion_corta ?? ''} onChange={setField('descripcion_corta')} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Descripción completa</label>
                <textarea value={editing.descripcion ?? ''} onChange={setField('descripcion')}
                  rows={3} className="input-base resize-none" />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Stock (unidades)</label>
                  <input type="number" min="0" value={editing.stock_unidades ?? 0} onChange={setField('stock_unidades')} className="input-base" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Precio ½ docena</label>
                  <input type="number" min="0" step="0.01" value={editing.precio_media_docena ?? 0} onChange={setField('precio_media_docena')} className="input-base" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Precio docena</label>
                  <input type="number" min="0" step="0.01" value={editing.precio_docena ?? 0} onChange={setField('precio_docena')} className="input-base" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Colores (separados por coma)</label>
                  <input value={(editing.colores ?? []).join(', ')} onChange={(e) => setArrayField('colores', e.target.value)} className="input-base" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Talles (separados por coma)</label>
                  <input value={(editing.talles ?? []).join(', ')} onChange={(e) => setArrayField('talles', e.target.value)} className="input-base" />
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={editing.activo ?? true}
                    onChange={(e) => setEditing((p) => ({ ...p!, activo: e.target.checked }))}
                    className="accent-brand-500 h-4 w-4" />
                  Activo
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={editing.destacado ?? false}
                    onChange={(e) => setEditing((p) => ({ ...p!, destacado: e.target.checked }))}
                    className="accent-brand-500 h-4 w-4" />
                  Destacado en inicio
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <button onClick={close} className="btn-secondary">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Guardando…' : isNew ? 'Crear producto' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}