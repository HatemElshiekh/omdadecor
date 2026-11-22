// Default unit dimensions until the client sends real catalog sizes (PLAN.md 20, Q3):
//   WPC: width-from-name x 290 cm; marble alt: 122x280; board/chipboard: 122x244;
//   floor box: 2.2 m²; strips/cornice: length-from-name, else 2.4 m.
// Everything else stays null: the calc screen then asks for the unit size (Edit).
export interface UnitDims {
  unit_width_cm: number | null;
  unit_length_cm: number | null;
  box_area_m2: number | null;
  piece_length_m: number | null;
}

const num = (s: string | undefined) => {
  const m = s?.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
};

/** Piece length in metres from facts or name ("طول 2.44 م", "2.40 متر"); <= 6 m only. */
export function lengthFromName(name: string, facts: Record<string, string>): number | null {
  const fromFacts = num(facts['الطول']);
  if (fromFacts && fromFacts <= 6) return fromFacts;
  const m =
    name.match(/طول\s*(\d+(?:\.\d+)?)/) ?? name.match(/(\d+(?:\.\d+)?)\s*(?:متر|م(?:\s|$))/);
  const v = m ? Number(m[1]) : null;
  return v && v <= 6 ? v : null;
}

export function unitDefaults(
  specType: string | null,
  name: string,
  facts: Record<string, string>,
): UnitDims {
  const d: UnitDims = {
    unit_width_cm: null,
    unit_length_cm: null,
    box_area_m2: null,
    piece_length_m: null,
  };
  switch (specType) {
    case 'wallpanel': {
      const w = num(facts['العرض']);
      if (w) Object.assign(d, { unit_width_cm: w, unit_length_cm: 290 });
      break;
    }
    case 'marble':
      Object.assign(d, { unit_width_cm: 122, unit_length_cm: 280 });
      break;
    case 'board':
    case 'chipboard':
      Object.assign(d, { unit_width_cm: 122, unit_length_cm: 244 });
      break;
    case 'floor':
      d.box_area_m2 = 2.2;
      break;
    case 'steelstrip':
    case 'cornice':
      d.piece_length_m = lengthFromName(name, facts) ?? 2.4;
      break;
  }
  return d;
}
