// Demo data for the /_kit gallery only. Not product copy and never shipped to rep screens.
// Spec bullets come straight from data/spec_templates_by_type.json (wallpanel) and the
// facts from data/demo_products_100.json (edara_row_no 6). Nothing here is invented.
import templates from '../../data/spec_templates_by_type.json';

export const kitTemplate = templates.wallpanel;

export const kitProduct = {
  name: 'بديل خشب 20 سم كود 20-80901',
  facts: { العرض: '20 سم', 'كود الموديل': '20-80901' } as Record<string, string>,
  stock: 528,
};

export const kitRepName = 'بائع 1';

export const kitLabels = {
  name: 'الاسم',
  phone: 'رقم الموبايل',
  length: 'الطول (متر)',
  phoneError: 'اكتب رقم موبايل صحيح',
  stock: 'الرصيد',
};
