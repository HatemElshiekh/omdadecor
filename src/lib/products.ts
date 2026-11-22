import { supabase } from './supabase';
import type { SpecTemplate } from './specs';

export interface Product {
  id: string;
  edara_row_no: number | null;
  edara_item_code: string | null;
  name: string;
  category_ar: string;
  spec_type: string | null;
  search_text: string;
  price: number | null;
  engineer_price: number | null;
  unit_label: string | null;
  calc_mode: 'panel' | 'sheet' | 'box' | 'tile' | 'linear' | null;
  unit_width_cm: number | null;
  unit_length_cm: number | null;
  box_area_m2: number | null;
  pieces_per_box: number | null;
  piece_length_m: number | null;
  waste_pct: number;
  facts: Record<string, string>;
  size_material_colors: string[] | null;
  use_yes: string[] | null;
  use_no: string[] | null;
  say_to_customer: string[] | null;
  install_and_complements: string[] | null;
  complement_product_ids: string[];
  specs_status: 'draft_general_by_type' | 'approved';
  is_active: boolean;
  stock_total: number;
}

const COLUMNS =
  'id, edara_row_no, edara_item_code, name, category_ar, spec_type, search_text, price, engineer_price, unit_label, calc_mode, unit_width_cm, unit_length_cm, box_area_m2, pieces_per_box, piece_length_m, waste_pct, facts, size_material_colors, use_yes, use_no, say_to_customer, install_and_complements, complement_product_ids, specs_status, is_active, stock_total';

// The whole MVP catalog (100 SKUs) is cached client-side (PLAN.md 14.3).
export const productsQuery = {
  queryKey: ['products'],
  staleTime: 10 * 60_000,
  queryFn: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from('products_for_staff')
      .select(COLUMNS)
      .eq('is_active', true)
      .limit(5000);
    if (error) throw error;
    const n = (v: unknown) => (v == null ? null : Number(v));
    return (data ?? []).map((p) => ({
      ...p,
      price: n(p.price),
      engineer_price: n(p.engineer_price),
      unit_width_cm: n(p.unit_width_cm),
      unit_length_cm: n(p.unit_length_cm),
      box_area_m2: n(p.box_area_m2),
      pieces_per_box: n(p.pieces_per_box),
      piece_length_m: n(p.piece_length_m),
      waste_pct: Number(p.waste_pct ?? 10),
      stock_total: Number(p.stock_total),
    })) as Product[];
  },
} as const;

export const templatesQuery = {
  queryKey: ['spec_templates'],
  staleTime: 60 * 60_000,
  queryFn: async (): Promise<Record<string, SpecTemplate>> => {
    const { data, error } = await supabase.from('spec_templates').select('*');
    if (error) throw error;
    return Object.fromEntries((data ?? []).map((t) => [t.type, t as SpecTemplate]));
  },
} as const;

// FR-2-7: telemetry. Fire-and-forget; never blocks or breaks the UI.
export async function logSearch(
  staffId: string,
  query: string,
  resultsCount: number,
  openedProductId: string | null = null,
): Promise<number | null> {
  const { data } = await supabase
    .from('search_logs')
    .insert({
      staff_id: staffId,
      query,
      results_count: resultsCount,
      opened_product_id: openedProductId,
    })
    .select('id')
    .single();
  return (data?.id as number | undefined) ?? null;
}

export async function logOpened(logId: number, productId: string): Promise<void> {
  await supabase.from('search_logs').update({ opened_product_id: productId }).eq('id', logId);
}
