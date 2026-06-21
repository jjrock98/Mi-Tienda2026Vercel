'use client';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils';

const FAQS = [
  { q: '¿Cómo funcionan los packs?', a: 'Vendemos en packs de media docena (6 unidades) y docena (12 unidades). Al seleccionar un producto podés elegir el tipo de pack y la cantidad.' },
  { q: '¿Cómo calculo el envío?', a: 'En el carrito hay un calculador de envío por código postal. El costo varía según la zona de entrega.' },
  { q: '¿Cuáles son los métodos de pago?', a: 'Aceptamos Mercado Pago (tarjetas, débito, crédito, efectivo y más) y transferencia bancaria. Para transferencia podés subir el comprobante desde tu cuenta.' },
  { q: '¿El pago con Mercado Pago es seguro?', a: 'Sí. Al confirmar tu pedido se abre una ventana segura de Mercado Pago donde completás el pago. Nosotros nunca vemos los datos de tu tarjeta.' },
  { q: '¿Cuánto tarda en llegar mi pedido?', a: 'Los tiempos de entrega dependen de tu zona. Generalmente entre 3 y 7 días hábiles. Lo confirmamos al procesar tu pedido.' },
  { q: '¿Puedo cambiar o cancelar mi pedido?', a: 'Podés cancelar tu pedido mientras esté en estado "Pendiente" desde la sección Mis Pedidos, siempre que el pago no haya sido procesado. Una vez confirmado el pago ya no es posible cancelarlo. Contactanos a la brevedad si necesitás ayuda.' },
  { q: '¿Hacen envíos a todo el país?', a: 'Sí, enviamos a todo el territorio nacional. El costo se calcula automáticamente según tu código postal.' },
  { q: '¿Cómo sé el estado de mi pedido?', a: 'En "Mis Pedidos" podés ver el estado actualizado en tiempo real. También te avisamos por email ante cada cambio.' },
  { q: '¿Qué hago si mi pago no fue confirmado?', a: 'Para pagos por transferencia, asegurate de subir el comprobante desde Mis Pedidos. Para Mercado Pago, si el monto fue debitado pero el pedido no se actualizó, contactanos.' },
  { q: '¿Puedo pagar en efectivo?', a: 'Sí, a través de Mercado Pago podés pagar en efectivo en Rapipago, Pago Fácil y otros puntos habilitados. El pedido se confirma una vez acreditado el pago.' },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
        aria-expanded={open}
      >
        <span className="font-medium text-sm md:text-base">{q}</span>
        <ChevronDown size={18} className={cn('shrink-0 text-muted transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <p className="pb-5 text-sm text-muted leading-relaxed animate-fade-in">{a}</p>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold mb-3">Preguntas frecuentes</h1>
      <p className="text-muted mb-10">Todo lo que necesitás saber antes de comprar.</p>
      <div className="card px-6">
        {FAQS.map((item) => <FaqItem key={item.q} {...item} />)}
      </div>
    </div>
  );
}
