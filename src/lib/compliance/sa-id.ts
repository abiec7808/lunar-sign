/**
 * South African 13-Digit National ID Number Validator & Parser
 * 
 * Format: YYMMDD SSSS C A Z
 * - YYMMDD: Date of Birth
 * - SSSS: Sequence / Gender (0000-4999 Female, 5000-9999 Male)
 * - C: Citizenship (0 = SA Citizen, 1 = Permanent Resident)
 * - A: Usually 8 (historically race classification, now constant)
 * - Z: Luhn Algorithm Checksum Digit
 */

export interface SaIdValidationResult {
  isValid: boolean;
  error?: string;
  dob?: Date;
  gender?: 'Female' | 'Male';
  citizenship?: 'South African Citizen' | 'Permanent Resident';
}

export function validateSaId(idNumber: string): SaIdValidationResult {
  // Clean whitespace and dashes
  const cleanId = idNumber.replace(/\s+/g, '').replace(/-/g, '');

  if (!/^\d{13}$/.test(cleanId)) {
    return { isValid: false, error: 'SA ID number must be exactly 13 digits.' };
  }

  // 1. Validate Date of Birth (YYMMDD)
  const yearStr = cleanId.substring(0, 2);
  const monthStr = cleanId.substring(2, 4);
  const dayStr = cleanId.substring(4, 6);

  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12) {
    return { isValid: false, error: 'Invalid month in ID number date of birth.' };
  }

  if (day < 1 || day > 31) {
    return { isValid: false, error: 'Invalid day in ID number date of birth.' };
  }

  // Determine century: if 2-digit year is > current 2-digit year, it's 1900s, otherwise 2000s
  const currentYear2Digit = new Date().getFullYear() % 100;
  const fullYear = parseInt(yearStr, 10) > currentYear2Digit ? 1900 + parseInt(yearStr, 10) : 2000 + parseInt(yearStr, 10);
  const dob = new Date(fullYear, month - 1, day);

  // 2. Validate Gender
  const genderDigits = parseInt(cleanId.substring(6, 10), 10);
  const gender = genderDigits < 5000 ? 'Female' : 'Male';

  // 3. Validate Citizenship
  const citizenshipDigit = parseInt(cleanId.charAt(10), 10);
  if (citizenshipDigit !== 0 && citizenshipDigit !== 1) {
    return { isValid: false, error: 'Invalid citizenship digit in ID number.' };
  }
  const citizenship = citizenshipDigit === 0 ? 'South African Citizen' : 'Permanent Resident';

  // 4. South African Home Affairs Luhn Checksum Formula:
  // Step A: Sum all digits in odd positions (1st, 3rd, 5th, 7th, 9th, 11th -> indices 0, 2, 4, 6, 8, 10)
  let sumOdd = 0;
  for (let i = 0; i < 11; i += 2) {
    sumOdd += parseInt(cleanId.charAt(i), 10);
  }

  // Step B: Concatenate all digits in even positions (2nd, 4th, 6th, 8th, 10th, 12th -> indices 1, 3, 5, 7, 9, 11)
  let evenStr = '';
  for (let i = 1; i < 12; i += 2) {
    evenStr += cleanId.charAt(i);
  }

  // Step C: Multiply even number by 2 and sum its digits
  const multipliedEven = (parseInt(evenStr, 10) * 2).toString();
  let sumEvenDigits = 0;
  for (let i = 0; i < multipliedEven.length; i++) {
    sumEvenDigits += parseInt(multipliedEven.charAt(i), 10);
  }

  // Step D: Calculate expected checksum
  const totalSum = sumOdd + sumEvenDigits;
  const expectedCheckDigit = (10 - (totalSum % 10)) % 10;
  const actualCheckDigit = parseInt(cleanId.charAt(12), 10);

  if (actualCheckDigit !== expectedCheckDigit) {
    return { isValid: false, error: 'Invalid ID number checksum (Luhn check failed).' };
  }

  return {
    isValid: true,
    dob,
    gender,
    citizenship,
  };
}
