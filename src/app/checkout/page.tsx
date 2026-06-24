'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCartStore } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { formatPrice } from '@/utils';
import { PACK_CONFIG } from '@/types';
import type { MetodoPago } from '@/types';
import { Wallet, Building2, AlertCircle, Loader2, ExternalLink, MapPin, Store, Truck, CheckCircle2, Percent } from 'lucide-react';
import { cn } from '@/utils';
import toast from 'react-hot-toast';
import { MP_COMMISSION } from '@/lib/constants';

type TipoEntrega = 'envio' | 'retiro';

const PAYMENT_METHODS: { id: MetodoPago; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'mercadopago',   label: 'Mercado Pago',        desc: 'Tarjetas, débito, crédito, efectivo y más', icon: <Wallet size={20} className="text-sky-500" /> },
  { id: 'transferencia', label: 'Transferencia bancaria', desc: 'Subí el comprobante para confirmar',       icon: <Building2 size={20} className="text-green-600" /> },
];

type MPStatus = 'idle' | 'opening' | 'waiting';

export default function CheckoutPage() {
  const router   = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { items, costoEnvio, codigoPostal, zonaEnvio, clearCart, setShipping } = useCartStore();

  const [metodo,      setMetodo]      = useState<MetodoPago>('mercadopago');
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>('envio');
  const [form, setForm] = useState({
    nombre: '', email: '', telefono: '',
    direccion: '', ciudad: '', codigo_postal: codigoPostal, notas: '',
  });
  const [submitting,  setSub]         = useState(false);
  const [mpStatus,    setMpStatus]    = useState<MPStatus>('idle');
  const [mpUrl,       setMpUrl]       = useState('');
  const [pendingId,   setPendingId]   = useState('');

  const subtotal = items.reduce((sum, item) => sum + (item.precioUnitario * item.cantidadPacks), 0);
  const subtotalConMP = subtotal * (1 + MP_COMMISSION);
  const envio = tipoEntrega === 'envio' ? costoEnvio : 0;
  const totalSinMP = subtotal + envio;
  const totalConMP = subtotalConMP + envio;
  const totalAPagar = metodo === 'mercadopago' ? totalConMP : totalSinMP;

  useEffect(() => {
    if (profile) {
      setForm((p) => ({
        ...p,
        nombre:        profile.nombre        ?? '',
        email:         profile.email         ?? '',
        telefono:      profile.telefono      ?? '',
        direccion:     profile.direccion     ?? '',
        ciudad:        profile.ciudad        ?? '',
        codigo_postal: profile.codigo_postal ?? codigoPostal,
      }));
    }
  }, [profile]);

  useEffect(() => {
    if (tipoEntrega === 'retiro') {
      setShipping('retiro', 0, 'Retiro en local');
    }
  }, [tipoEntrega]);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const createOrder = async () => {
    if (items.length === 0) {
      throw new Error('El carrito está vacío');
    }
    if (subtotal <= 0 || totalAPagar <= 0) {
      console.error('⚠️ subtotal o total inválidos:', { subtotal, totalAPagar, items });
      throw new Error('Error en el cálculo del total. Revisá tu carrito.');
    }

    const payload = {
      items: items.map((i) => ({ product_id: i.productId, tipo_pack: i.tipoPack, cantidad_packs: i.cantidadPacks })),
      formData: { ...form, metodo_pago: metodo, tipo_entrega: tipoEntrega },
      subtotal: Number(subtotal),
      costo_envio: Number(envio),
      total: Number(totalAPagar),
    };

    const sessionId = localStorage.getItem('cart_session_id') || '';

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data.id as string;
  };

  const openMPPopup = (url: string) => {
    if (!url || url === 'undefined' || url === 'null') {
      toast.error('La URL de pago no está disponible. Reintentá.');
      return null;
    }
    const w = 1050, h = 700;
    const left = Math.round(screen.width  / 2 - w / 2);
    const top  = Math.round(screen.height / 2 - h / 2);
    const popup = window.open(url, 'MercadoPago', `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no`);
    if (!popup || popup.closed) {
      toast('Tu navegador bloqueó la ventana. Redirigiendo…', { icon: 'ℹ️' });
      window.location.href = url;
      return null;
    }
    return popup;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) { toast.error('Tu carrito está vacío'); return; }
    if (subtotal <= 0 || totalAPagar <= 0) {
      toast.error('Error en el cálculo del total. Revisá tu carrito.');
      console.error('⚠️ subtotal o total inválidos:', { subtotal, totalAPagar, items });
      return;
    }
    setSub(true);
    try {
      const orderId = await createOrder();
      setPendingId(orderId);
      if (metodo === 'mercadopago') {
        setMpStatus('opening');
        const mpRes = await fetch('/api/checkout/mercadopago', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });
        const data = await mpRes.json();

        // 🔍 LOGS PARA DEPURAR
        console.log('🔍 Respuesta completa de MP:', data);
        console.log('initPoint:', data.initPoint);
        console.log('sandboxInitPoint:', data.sandboxInitPoint);
        console.log('error:', data.error);

        if (!mpRes.ok) {
          const errorMsg = data.error || 'Error al crear la preferencia de pago';
          throw new Error(errorMsg);
        }

        const { initPoint, sandboxInitPoint } = data;

        // ✅ Determinar entorno por hostname
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        let url = isLocal ? sandboxInitPoint : initPoint;

        // 🔥 Fallback: si initPoint vacío, usar sandboxInitPoint
        if (!url || url === 'undefined' || url === 'null') {
          console.warn('⚠️ initPoint vacío, usando sandboxInitPoint como fallback');
          url = sandboxInitPoint;
        }

        if (!url || url === 'undefined' || url === 'null') {
          throw new Error('No se pudo obtener la URL de pago. Verificá el Access Token y que la aplicación esté activa.');
        }

        console.log('✅ URL final de MP:', url);

        setMpUrl(url);
        clearCart();
        setMpStatus('waiting');
        openMPPopup(url);
      } else {
        clearCart();
        router.push(`/subir-comprobante?orderId=${orderId}`);
      }
    } catch (err: unknown) {
      console.error('❌ Error en checkout:', err);
      const msg = err instanceof Error ? err.message : 'Error al procesar';
      toast.error(msg);
      setSub(false);
      setMpStatus('idle');
    }
  };

  if (mpStatus === 'waiting' || mpStatus === 'opening') {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/20 p-6"><Wallet size={48} className="text-sky-500 mx-auto" /></div>
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold">
            {mpStatus === 'opening' ? 'Abriendo Mercado Pago…' : 'Completá el pago en la ventana de Mercado Pago'}
          </h1>
          <p className="text-muted max-w-sm text-sm">Se abrió una ventana nueva. Una vez que completes el pago, serás redirigido automáticamente.</p>
          {mpUrl && (
            <p className="text-xs text-muted break-all bg-surface-2 p-2 rounded-lg max-w-md mx-auto">
              URL: <span className="font-mono">{mpUrl}</span>
            </p>
          )}
        </div>
        {mpStatus === 'waiting' && (
          <div className="card p-4 w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted">Pedido</span><span className="font-mono font-bold">#{pendingId.slice(0,8).toUpperCase()}</span></div>
            <div className="flex justify-between"><span className="text-muted">Total</span><span className="font-bold text-brand-600">{formatPrice(totalAPagar)}</span></div>
          </div>
        )}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {mpUrl && <button onClick={() => openMPPopup(mpUrl)} className="btn-primary gap-2 w-full"><ExternalLink size={15} />Reabrir ventana de pago</button>}
          <Link href="/mis-pedidos" className="btn-secondary w-full text-center text-sm">Ver mis pedidos</Link>
        </div>
        <p className="text-xs text-muted max-w-xs">¿Ya pagaste? Revisá <Link href="/mis-pedidos" className="text-brand-600 hover:underline">tus pedidos</Link>.</p>
      </div>
    );
  }

  if (authLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-muted" size={32} /></div>;
  if (!user) return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3"><p className="text-muted">Necesitás iniciar sesión.</p><Link href="/auth/login?redirect=/checkout" className="btn-primary">Ingresar</Link></div>;
  if (items.length === 0) return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3"><p className="text-muted">No hay productos en el carrito.</p><Link href="/" className="btn-primary">Ver productos</Link></div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold mb-8">Finalizar compra</h1>

      {(!profile?.direccion || !profile?.codigo_postal || !profile?.telefono) && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <AlertCircle size={17} className="text-yellow-600 mt-0.5 shrink-0" />
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            Completá tus datos para agilizar el checkout.{' '}
            <Link href="/completar-perfil?redirect=/checkout" className="underline font-medium">Completar ahora →</Link>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">

            {/* ── Tipo de entrega ── */}
            <div className="card p-6">
              <h2 className="font-semibold mb-4">Tipo de entrega</h2>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { id: 'envio',  label: 'Envío a domicilio', desc: 'Lo recibís en tu dirección',  icon: <Truck  size={20} className="text-brand-500" /> },
                  { id: 'retiro', label: 'Retirar en local',  desc: 'Sin costo de envío',           icon: <Store  size={20} className="text-green-600" /> },
                ] as { id: TipoEntrega; label: string; desc: string; icon: React.ReactNode }[]).map((opt) => (
                  <label key={opt.id}
                    className={cn(
                      'flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all',
                      tipoEntrega === opt.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20' : 'border-border hover:border-brand-300'
                    )}>
                    <input type="radio" name="tipoEntrega" value={opt.id}
                      checked={tipoEntrega === opt.id} onChange={() => setTipoEntrega(opt.id)} className="sr-only" />
                    {opt.icon}
                    <div>
                      <p className="font-medium text-sm">{opt.label}</p>
                      <p className="text-xs text-muted">{opt.desc}</p>
                    </div>
                    {tipoEntrega === opt.id && <CheckCircle2 size={16} className="text-brand-500" />}
                  </label>
                ))}
              </div>

              {tipoEntrega === 'retiro' && (
                <div className="mt-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-4 space-y-2">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-400 flex items-center gap-2">
                    <Store size={15} /> Datos del local
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Te avisaremos cuando tu pedido esté listo para retirar. El retiro es de lunes a viernes de 9 a 18hs.
                  </p>
                  <Link href="/ubicacion" target="_blank"
                    className="inline-flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400 underline hover:no-underline">
                    <MapPin size={12} /> Ver dirección del local →
                  </Link>
                </div>
              )}
            </div>

            {/* ── Datos personales ── */}
            <div className="card p-6">
              <h2 className="font-semibold mb-4">Datos personales</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="block text-xs font-medium mb-1">Nombre *</label><input required value={form.nombre} onChange={set('nombre')} className="input-base" /></div>
                <div><label className="block text-xs font-medium mb-1">Email *</label><input required type="email" value={form.email} onChange={set('email')} className="input-base" /></div>
                <div><label className="block text-xs font-medium mb-1">Teléfono *</label><input required type="tel" value={form.telefono} onChange={set('telefono')} className="input-base" /></div>
              </div>
            </div>

            {/* ── Dirección (solo si envío) ── */}
            {tipoEntrega === 'envio' && (
              <div className="card p-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2"><MapPin size={17} className="text-brand-500" />Dirección de entrega</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2"><label className="block text-xs font-medium mb-1">Dirección *</label><input required value={form.direccion} onChange={set('direccion')} className="input-base" /></div>
                  <div><label className="block text-xs font-medium mb-1">Ciudad *</label><input required value={form.ciudad} onChange={set('ciudad')} className="input-base" /></div>
                  <div><label className="block text-xs font-medium mb-1">Código postal *</label><input required value={form.codigo_postal} onChange={set('codigo_postal')} className="input-base" /></div>
                  <div className="sm:col-span-2"><label className="block text-xs font-medium mb-1">Notas (opcional)</label><textarea value={form.notas} onChange={set('notas')} rows={2} className="input-base resize-none" placeholder="Piso, depto, referencias…" /></div>
                </div>
              </div>
            )}

            {/* ── Notas para retiro ── */}
            {tipoEntrega === 'retiro' && (
              <div className="card p-6">
                <h2 className="font-semibold mb-4">Notas para el retiro (opcional)</h2>
                <textarea value={form.notas} onChange={set('notas')} rows={2} className="input-base resize-none" placeholder="Aclaraciones, horario preferido…" />
              </div>
            )}

            {/* ── Método de pago ── */}
            <div className="card p-6">
              <h2 className="font-semibold mb-4">Método de pago</h2>
              <div className="space-y-3">
                {PAYMENT_METHODS.map((m) => (
                  <label key={m.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-all',
                      metodo === m.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20' : 'border-border hover:border-brand-300'
                    )}>
                    <input type="radio" name="metodo" value={m.id} checked={metodo === m.id} onChange={() => setMetodo(m.id)} className="accent-brand-500" />
                    {m.icon}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{m.label}</p>
                      <p className="text-xs text-muted">{m.desc}</p>
                    </div>
                    {m.id === 'mercadopago' && <span className="text-xs bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 rounded-full px-2 py-0.5 font-medium">Recomendado</span>}
                  </label>
                ))}
              </div>

              {metodo === 'transferencia' && (
                <div className="mt-4 rounded-xl bg-green-50 dark:bg-green-950/20 p-4 text-sm text-green-700 dark:text-green-400 flex items-start gap-3">
                  <Percent size={18} className="shrink-0 mt-0.5 text-green-600" />
                  <div>
                    <strong>¡Ahorrá {formatPrice(totalConMP - totalSinMP)}!</strong> Pagando por transferencia bancaria no se aplica recargo.
                  </div>
                </div>
              )}
              {metodo === 'mercadopago' && (
                <div className="mt-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-3">
                  <AlertCircle size={18} className="shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    Se aplica un recargo del <strong>{Math.round(MP_COMMISSION * 100)}%</strong> por comisión de Mercado Pago.
                    {totalSinMP < totalConMP && (
                      <span className="block mt-1">Podés ahorrar <strong>{formatPrice(totalConMP - totalSinMP)}</strong> pagando por transferencia.</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Resumen ── */}
          <div>
            <div className="card p-5 sticky top-24 space-y-4">
              <h2 className="font-semibold">Tu pedido</h2>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.tipoPack}`} className="flex justify-between text-sm gap-2">
                    <span className="text-muted line-clamp-1 flex-1">{item.nombre} · {PACK_CONFIG[item.tipoPack].label} ×{item.cantidadPacks}</span>
                    <span className="shrink-0 font-medium">{formatPrice(item.precioUnitario * item.cantidadPacks)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-muted"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>

                {metodo === 'mercadopago' && (
                  <div className="flex justify-between text-xs text-muted border-b border-dashed border-border pb-1">
                    <span>Recargo MP ({Math.round(MP_COMMISSION * 100)}%)</span>
                    <span className="text-amber-600">+{formatPrice(subtotalConMP - subtotal)}</span>
                  </div>
                )}

                <div className="flex justify-between text-muted">
                  <span>Envío</span>
                  <span>{tipoEntrega === 'retiro' ? <span className="text-green-600 font-medium">Gratis (retiro)</span> : (zonaEnvio ? formatPrice(costoEnvio) : '—')}</span>
                </div>

                {metodo === 'transferencia' && subtotalConMP > subtotal && (
                  <div className="flex justify-between text-xs text-green-600 font-medium">
                    <span>💡 Ahorro por transferencia</span>
                    <span>-{formatPrice(subtotalConMP - subtotal)}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-base border-t border-border pt-2">
                  <span>Total a pagar</span>
                  <span className="text-brand-600">{formatPrice(totalAPagar)}</span>
                </div>
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full gap-2">
                {submitting
                  ? <><Loader2 size={15} className="animate-spin" />Procesando…</>
                  : metodo === 'mercadopago'
                    ? <><Wallet size={15} />Pagar con Mercado Pago</>
                    : <><Building2 size={15} />Confirmar pedido</>}
              </button>
              <p className="text-xs text-muted text-center">
                Al confirmar aceptás nuestros <Link href="/terminos" className="underline hover:text-foreground">términos y condiciones</Link>.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}