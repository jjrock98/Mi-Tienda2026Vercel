import { createClient } from '@/lib/supabase/server';
import { CheckoutClient } from './CheckoutClient';
import type { BankInfo } from '@/types';

export default async function CheckoutPage() {
  const supabase = await createClient();
  
  // Obtener datos bancarios
  const { data: bankInfo, error } = await supabase
    .from('bank_info')
    .select('*')
    .single();

  if (error) {
    console.error('Error al obtener datos bancarios:', error);
    return <div>Error al cargar los datos bancarios</div>;
  }

  return <CheckoutClient bankInfo={bankInfo as BankInfo | null} />;
}