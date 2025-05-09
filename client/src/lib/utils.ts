import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

export const calculateDiscount = (listPrice: number, finalPrice: number): number => {
  if (listPrice <= 0 || finalPrice <= 0) return 0;
  return ((listPrice - finalPrice) / listPrice) * 100;
};

export const formatPercentage = (percentage: number): string => {
  return `${percentage.toFixed(1).replace('.', ',')}%`;
};
