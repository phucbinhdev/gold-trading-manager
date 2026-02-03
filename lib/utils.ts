import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

// 1 Chỉ = 10 Phân
export const formatGoldWeight = (chi: number) => {
  if (chi === 0) return "0 Chỉ";

  const intPart = Math.floor(chi);
  const decimalPart = chi - intPart;
  const phan = Math.round(decimalPart * 10);

  // Handle rounding edge case (e.g. 0.999 -> 10 phan -> +1 Chi)
  if (phan === 10) {
    return `${intPart + 1} Chỉ`;
  }

  let result = "";
  if (intPart > 0) result += `${intPart} Chỉ`;
  if (phan > 0) {
    if (result.length > 0) result += " ";
    result += `${phan} Phân`;
  }

  // Fallback for clean integers if needed or display formatting styling
  return result;
};

// Helper to parse "2.5" -> 2.5
// Helper to display input placeholder
