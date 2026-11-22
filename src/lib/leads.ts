import { supabase } from './supabase';

export const PHONE_RE = /^01[0125][0-9]{8}$/; // FR-5-1

export type LeadResult =
  | { status: 'saved'; existing: boolean }
  | { status: 'invalid' }
  | { status: 'offline' };

export async function createLead(input: {
  name: string;
  phone: string;
  type: 'direct' | 'engineer';
  productId: string;
  note: string;
}): Promise<LeadResult> {
  try {
    const { data, error } = await supabase.rpc('create_lead', {
      p_name: input.name.trim(),
      p_phone: input.phone,
      p_type: input.type,
      p_product_id: input.productId,
      p_note: input.note.trim() || null,
    });
    if (error) return error.code === '22023' ? { status: 'invalid' } : { status: 'offline' };
    return { status: 'saved', existing: Boolean((data as { is_existing?: boolean })?.is_existing) };
  } catch {
    return { status: 'offline' };
  }
}
