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
  },
  lead: {
    saved: 'اتسجل ✓',
    existing: 'العميل ده متسجل قبل كده، ضفنا المنتج ده لاهتماماته',
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
