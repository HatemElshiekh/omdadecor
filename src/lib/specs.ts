// FR-3-6: product-level override fields win; otherwise the spec template for its type.
export interface SpecTemplate {
  type: string;
  label_ar: string;
  calc_mode: string | null;
  size_material_colors: string[];
  use_yes: string[];
  use_no: string[];
  say_to_customer: string[];
  install_and_complements: string[];
}

export interface SpecFields {
  size_material_colors: string[] | null;
  use_yes: string[] | null;
  use_no: string[] | null;
  say_to_customer: string[] | null;
  install_and_complements: string[] | null;
}

export type ResolvedSpecs = { [K in keyof SpecFields]: string[] };

const KEYS: (keyof SpecFields)[] = [
  'size_material_colors',
  'use_yes',
  'use_no',
  'say_to_customer',
  'install_and_complements',
];

export function resolveSpecs(product: SpecFields, template?: SpecTemplate | null): ResolvedSpecs {
  const out = {} as ResolvedSpecs;
  for (const k of KEYS) {
    const own = product[k];
    out[k] = own && own.length > 0 ? own : (template?.[k] ?? []);
  }
  return out;
}
