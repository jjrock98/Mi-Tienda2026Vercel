'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    if (error) {
      toast.error('Error al enviar el email. Verificá que la dirección sea correcta.');
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  if (sent) return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="card w-full max-w-md p-8 text-center animate-scale-in">
        <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
        <h1 className="font-display text-xl font-bold mb-2">¡Email enviado!</h1>
        <p className="text-sm text-muted mb-6">
          Revisá tu bandeja de entrada. Te mandamos un link para restablecer tu contraseña.
          Puede tardar unos minutos.
        </p>
        <Link href="/auth/login" className="btn-primary w-full">
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="card w-full max-w-md p-8 animate-scale-in">
        <Link href="/auth/login" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground mb-6 transition-colors">
          <ArrowLeft size={16} /> Volver al login
        </Link>

        <h1 className="font-display text-2xl font-bold mb-1">Recuperar contraseña</h1>
        <p className="text-sm text-muted mb-8">
          Ingresá tu email y te mandamos un link para crear una nueva contraseña.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com" className="input-base pl-10"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Enviando…' : 'Enviar link de recuperación'}
          </button>
        </form>
      </div>
    </div>
  );
}
