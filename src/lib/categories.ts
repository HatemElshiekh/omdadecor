// FR-2-3: six category shortcuts. Tapping one fills the search box with its query.
// Labels are the Edara category names already in the catalog.
import { Home as HomeIcon, Layers, LayoutGrid, Mountain, PanelsTopLeft, Ruler } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface CategoryShortcut {
  label: string;
  query: string;
  icon: LucideIcon;
}

export const CATEGORY_SHORTCUTS: CategoryShortcut[] = [
  { label: 'بديل الخشب', query: 'بديل الخشب', icon: PanelsTopLeft },
  { label: 'بديل الرخام', query: 'بديل الرخام', icon: LayoutGrid },
  { label: 'بديل الحجر', query: 'بديل الحجر', icon: Mountain },
  { label: 'الباركيه والأرضيات', query: 'الباركيه والارضيات', icon: HomeIcon },
  { label: 'الألواح والبورد', query: 'الالواح والبورد', icon: Layers },
  { label: 'الاستانلس والفيوتك', query: 'الاستانلس والفيوتك', icon: Ruler },
];
