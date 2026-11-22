import { createContext, useContext } from 'react';
import type { ToastKind } from './Toast';

type ShowToast = (message: string, kind?: ToastKind) => void;

export const ToastContext = createContext<ShowToast>(() => {});

export function useToast(): ShowToast {
  return useContext(ToastContext);
}
