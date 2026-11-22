// All UI copy. PLAN.md Appendix 22, verbatim. No inline copy in components. No em dashes.
export const ar = {
  app: {
    name: 'مساعد مبيعات العمدة',
  },
  login: {
    title: 'مين بيستخدم الجهاز؟',
    pin: 'اكتب رقمك السري',
    bad_pin: 'الرقم غلط، جرّب تاني',
    locked: 'استنى 10 دقايق أو كلّم المدير',
    // Not in Appendix 22 (pending PO approval): network failure / rate limit.
    error: 'حصلت مشكلة في الاتصال، جرّب تاني',
  },
  search: {
    title: 'بتدوّر على إيه؟',
    placeholder: 'اكتب اسم المنتج… مثلاً بديل رخام',
    ask_link: 'مش لاقي اللي بتدوّر عليه؟ اسأل المساعد',
    empty: 'مفيش منتج بالاسم ده. جرّب كلمة أقصر، أو اسأل المساعد',
  },
  product: {
    // FR-3-1 metadata line: "السعر: 450 ج.م · الرصيد: 24"
    price: 'السعر: {price} ج.م',
    stock: 'الرصيد: {qty}',
    // Not in Appendix 22 (pending PO approval): shown only to permitted staff (FR-3-2).
    engineer_price: 'سعر المهندس: {price} ج.م',
    price_unknown: 'السعر: يتأكد من الكاشير',
    draft: 'مواصفات عامة للنوع، تحت مراجعة المعرض',
  },
  tabs: {
    size: 'المقاس والخامة',
    where: 'ينفع فين',
    pitch: 'قول للعميل',
    install: 'التركيب والمكملات',
  },
  cta: {
    calc: 'احسب كمية',
    lead: 'سجّل عميل مهتم',
  },
  calc: {
    missing: 'اكتب المقاسات',
    lead_cta: 'سجّل عميل مهتم بالكمية دي', // FR-4-7
    // ---- Not in Appendix 22 (pending PO approval) ----
    surface_wall: 'حيطة',
    surface_section: 'قطاع',
    surface_floor: 'أرضية أو سقف',
    surface_linear: 'طولي',
    length: 'الطول (متر)',
    height: 'الارتفاع (متر)',
    width: 'العرض (متر)',
    section_width: 'العرض (متر)',
    linear: 'المتر الطولي',
    doors: 'باب',
    windows: 'شباك',
    opening_size: '{w} × {h} سم',
    door_width: 'عرض الباب (سم)',
    door_height: 'ارتفاع الباب (سم)',
    window_width: 'عرض الشباك (سم)',
    window_height: 'ارتفاع الشباك (سم)',
    unit_size: 'مقاس الوحدة: {size}',
    unit_unknown: 'مقاس الوحدة مش متسجل',
    edit: 'تعديل',
    done: 'تمام',
    unit_width: 'عرض الوحدة (سم)',
    unit_length: 'طول الوحدة (سم)',
    box_area: 'مساحة الكرتونة (م²)',
    piece_length: 'طول العود (متر)',
    waste: 'الهالك ٪',
    net_area: 'المساحة الصافية: {v} م²',
    gross_area: 'بالهالك: {v} م²',
    net_length: 'الطول: {v} متر',
    gross_length: 'بالهالك: {v} متر',
    units_in_boxes: '{units} {unit} في {boxes} كرتونة',
    total: 'الإجمالي التقريبي: {v} ج.م',
    short: 'الرصيد مش كفاية، ناقص {n}',
    openings: 'الأبواب والشبابيك أكبر من الحيطة',
    missing_unit: 'اكتب مقاس الوحدة الأول',
    unit_panel: 'لوح',
    unit_sheet: 'لوح',
    unit_tile: 'بلاطة',
    unit_box: 'كرتونة',
    unit_linear: 'عود',
    unit_boxes: 'كرتونة',
    add: 'زوّد',
    remove: 'قلّل',
    m: 'متر',
    cm: 'سم',
    m2: 'م²',
  },
  lead: {
    saved: 'اتسجل ✓',
    existing: 'العميل ده متسجل قبل كده، ضفنا المنتج ده لاهتماماته',
    // ---- Not in Appendix 22 (pending PO approval) ----
    name: 'الاسم',
    phone: 'رقم الموبايل',
    type: 'نوع العميل',
    type_direct: 'عميل مباشر',
    type_engineer: 'مهندس',
    note: 'ملاحظة',
    add_note: 'ضيف ملاحظة',
    save: 'سجّل',
    name_error: 'اكتب اسم العميل',
    phone_error: 'رقم الموبايل لازم 11 رقم ويبدأ بـ 010 أو 011 أو 012 أو 015',
  },
  ask: {
    fallback: 'المعلومة دي مش متسجلة عندي، اسأل المدير',
  },
  followup: {
    d0: 'شكراً لزيارتك معرض العمدة، ده ملخص اللي اتفرجت عليه: {product}',
    d3: 'حبيت أبعتلك صورة مشروع مشابه لـ {product} عشان تتخيل الشكل',
    d7: 'أخبارك إيه؟ وصلت لقرار في {product}؟ لو فيه أي سؤال أنا موجود',
    d30: 'عندنا جديد في {category} ممكن يعجبك، تحب أبعتلك؟',
  },
  common: {
    back: 'رجوع',
    logout: 'خروج',
    // Not in Appendix 22 (pending PO approval): writes need internet (PLAN.md 16 Offline).
    offline: 'مفيش نت دلوقتي، جرّب تاني',
  },
  // Accessible labels for icon-only keys (screen readers only, not visible copy).
  a11y: {
    backspace: 'امسح رقم',
    clear: 'امسح الكل',
    decimal: 'علامة عشرية',
    pin_dots: 'الأرقام المكتوبة',
  },
} as const;

export type Strings = typeof ar;
