'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UpdatePasswordPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw,          setShowPw]          = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [done,            setDone]            = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [sessionChecked,  setSessionChecked]  = useState(false);

  // ✅ Verificar si hay una sesión activa (token válido)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('El enlace de restablecimiento ha expirado o es inválido. Solicita uno nuevo.');
        // Opcional: redirigir automáticamente después de 3 segundos
        setTimeout(() => router.push('/auth/reset-password'), 3000);
      }
      setSessionChecked(true);
    };
    checkSession();
  }, [supabase.auth, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return; }
    if (password !== confirmPassword) { toast.error('Las contraseñas no coinciden'); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error('No se pudo actualizar la contraseña. El link puede haber expirado.');
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => router.push('/auth/login'), 2500);
    }
    setLoading(false);
  };

  // Si hay error de sesión, mostramos el mensaje
  if (error) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="card w-full max-w-md p-8 text-center animate-scale-in">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
          <h1 className="font-display text-xl font-bold mb-2">Enlace inválido o expirado</h1>
          <p className="text-sm text-muted mb-6">{error}</p>
          <button onClick={() => router.push('/auth/reset-password')} className="btn-primary w-full">
            Solicitar nuevo enlace
          </button>
        </div>
      </div>
    );
  }

  // No mostrar nada hasta verificar la sesión
  if (!sessionChecked) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm text-muted">Verificando enlace...</p>
        </div>
      </div>
    );
  }

  if (done) return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="card w-full max-w-md p-8 text-center animate-scale-in">
        <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
        <h1 className="font-display text-xl font-bold mb-2">¡Contraseña actualizada!</h1>
        <p className="text-sm text-muted">Redirigiendo al login…</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="card w-full max-w-md p-8 animate-scale-in">
        <h1 className="font-display text-2xl font-bold mb-1">Nueva contraseña</h1>
        <p className="text-sm text-muted mb-8">Elegí una contraseña segura de al menos 6 caracteres.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type={showPw ? 'text' : 'password'} required minLength={6}
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Nueva contraseña" className="input-base pl-10 pr-10"
            />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type={showPw ? 'text' : 'password'} required
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar contraseña" className="input-base pl-10"
            />
          </div>

          {password.length > 0 && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1,2,3,4].map((level) => (
                  <div key={level} className={`h-1 flex-1 rounded-full transition-colors ${
                    password.length >= level * 3 ? (
                      password.length >= 12 ? 'bg-green-500' :
                      password.length >= 9  ? 'bg-yellow-500' : 'bg-red-400'
                    ) : 'bg-surface-2'
                  }`} />
                ))}
              </div>
              <p className="text-xs text-muted">
                {password.length < 6 ? 'Muy corta' : password.length < 9 ? 'Aceptable' : password.length < 12 ? 'Buena' : '✓ Excelente'}
              </p>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Actualizando…' : 'Guardar nueva contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
