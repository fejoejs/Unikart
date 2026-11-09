export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-\+]/g, '');
  return cleaned.length >= 10 && /^\d+$/.test(cleaned);
}

export function isValidSku(sku) {
  if (!sku || typeof sku !== 'string') return false;
  return /^[A-Za-z0-9\-_]{3,30}$/.test(sku.trim());
}

export function isValidGstin(gstin) {
  if (!gstin || typeof gstin !== 'string') return false;
  // Indian GSTIN format: 2 digits state code, 10 chars PAN, 1 entity code, 1 Z, 1 checksum
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.trim());
}

export function isPositiveNumber(val) {
  const num = Number(val);
  return !isNaN(num) && num > 0;
}
