/**
 * South African VAT (Value Added Tax) Number Validator
 * 
 * In South Africa, SARS VAT registration numbers consist of 10 digits
 * and always start with the digit 4.
 */

export interface SaVatValidationResult {
  isValid: boolean;
  error?: string;
  formatted?: string;
}

export function validateSaVat(vatNumber: string): SaVatValidationResult {
  if (!vatNumber) {
    return { isValid: false, error: 'VAT number is required.' };
  }

  const cleanVat = vatNumber.replace(/\s+/g, '').replace(/-/g, '');

  if (!/^\d{10}$/.test(cleanVat)) {
    return { isValid: false, error: 'South African VAT number must be exactly 10 digits.' };
  }

  if (!cleanVat.startsWith('4')) {
    return { isValid: false, error: 'South African VAT numbers issued by SARS must start with 4.' };
  }

  return {
    isValid: true,
    formatted: cleanVat,
  };
}
