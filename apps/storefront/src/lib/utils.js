import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Formats integer paise into Indian Rupee format (e.g., 14990000 paise -> ₹1,49,900)
 */
export function formatINR(paise) {
  if (paise === null || paise === undefined || isNaN(paise)) return "₹0"
  const rupees = paise / 100
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(rupees)
}

/**
 * Detailed format with paise decimal places
 */
export function formatINRWithDecimals(paise) {
  if (paise === null || paise === undefined || isNaN(paise)) return "₹0.00"
  const rupees = paise / 100
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(rupees)
}
