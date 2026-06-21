import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'En mantenimiento', robots: { index: false } };

export default function MantenimientoPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="text-6xl">🔧</div>
      <h1 className="font-display text-3xl font-bold md:text-4xl">Estamos mejorando</h1>
      <p className="text-muted text-lg max-w-md">
        {process.env.MAINTENANCE_MESSAGE ?? 'Estamos realizando mejoras. Volvemos pronto.'}
      </p>
      <p className="text-sm text-muted">Disculpá las molestias.</p>
    </div>
  );
}
