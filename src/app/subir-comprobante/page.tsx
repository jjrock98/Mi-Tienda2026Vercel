'use client';
import { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Upload, CheckCircle2, FileImage, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

export default function SubirComprobantePage() {
  const router  = useRouter();
  const params  = useSearchParams();
  const orderId = params.get('orderId');
  const { user } = useAuth();
  const supabase = createClient();

  const [file,     setFile]     = useState<File | null>(null);
  const [preview,  setPreview]  = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done,     setDone]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (f.size > 10 * 1024 * 1024) { toast.error('El archivo no puede superar 10 MB'); return; }
    setFile(f);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file || !orderId || !user) return;
    setUploading(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `${user.id}/${orderId}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('comprobantes').upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('comprobantes').getPublicUrl(path);

      const res  = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, comprobanteUrl: publicUrl }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setDone(true);
      toast.success('¡Comprobante enviado!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al subir el comprobante');
    } finally {
      setUploading(false);
    }
  };

  if (!orderId) return (
    <div className="flex min-h-[60vh] items-center justify-center text-muted">
      Pedido no encontrado.
    </div>
  );

  if (done) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <CheckCircle2 size={60} className="text-green-500" />
      <h2 className="font-display text-2xl font-bold">¡Comprobante recibido!</h2>
      <p className="text-muted max-w-sm">
        Revisaremos tu pago y actualizaremos el estado de tu pedido a la brevedad. Te avisamos por email.
      </p>
      <button onClick={() => router.push('/mis-pedidos')} className="btn-primary">
        Ver mis pedidos
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-2xl font-bold mb-2">Subir comprobante</h1>
      <p className="text-sm text-muted mb-8">
        Pedido <span className="font-mono font-bold">#{orderId.slice(0, 8).toUpperCase()}</span>.
        Subí el comprobante de tu transferencia y lo confirmaremos manualmente.
      </p>

      {/* Drop zone */}
      <div
        className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed
          p-10 text-center cursor-pointer transition-colors
          ${file ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20' : 'border-border hover:border-brand-400 hover:bg-surface-2'}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Preview" className="max-h-48 rounded-xl object-contain" />
        ) : (
          <>
            {file ? <FileImage size={40} className="text-brand-500" /> : <Upload size={40} className="text-muted" />}
            <p className="text-sm font-medium">{file ? file.name : 'Arrastrá o hacé click para subir'}</p>
            <p className="text-xs text-muted">JPG, PNG o PDF · máx 10 MB</p>
          </>
        )}
      </div>

      {file && (
        <button onClick={handleUpload} disabled={uploading} className="btn-primary w-full mt-4">
          {uploading
            ? <><Loader2 size={16} className="animate-spin" /> Subiendo…</>
            : <><Upload size={16} /> Confirmar y enviar comprobante</>}
        </button>
      )}
    </div>
  );
}
