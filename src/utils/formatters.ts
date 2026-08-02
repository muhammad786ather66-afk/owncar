/**
 * Formatters and validators for Pakistani CNIC and Mobile numbers
 */

/**
 * Format CNIC number into standard Pakistani format: XXXXX-XXXXXXX-X (13 digits)
 * Example: '3120256879873' -> '31202-5687987-3'
 */
export function formatCNIC(input: string): string {
  if (!input) return '';
  const digits = input.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) {
    return digits;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
}

/**
 * Validate Pakistani CNIC number
 * Must be exactly 13 digits
 */
export function validateCNIC(input: string): { valid: boolean; error?: string } {
  if (!input || !input.trim()) {
    return { valid: false, error: 'CNIC number is required' };
  }
  const digits = input.replace(/\D/g, '');
  if (digits.length !== 13) {
    return {
      valid: false,
      error: `CNIC must be exactly 13 digits (current length: ${digits.length} digits). Example: 35202-1234567-1`,
    };
  }
  return { valid: true };
}

/**
 * Format Mobile Number into standard Pakistani format: +923XXXXXXXXX or 03XXXXXXXXX
 * Examples:
 * '03001234567' -> '0300-1234567'
 * '923001234567' -> '+92 300 1234567'
 */
export function formatMobileNumber(input: string): string {
  if (!input) return '';
  const raw = input.trim();
  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');

  if (hasPlus || digits.startsWith('92')) {
    const clean = digits.startsWith('92') ? digits : '92' + digits;
    const trimmed = clean.slice(0, 12);
    if (trimmed.length <= 2) return `+${trimmed}`;
    if (trimmed.length <= 5) return `+${trimmed.slice(0, 2)} ${trimmed.slice(2)}`;
    return `+${trimmed.slice(0, 2)} ${trimmed.slice(2, 5)} ${trimmed.slice(5)}`;
  } else {
    const trimmed = digits.slice(0, 11);
    if (trimmed.length <= 4) return trimmed;
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4)}`;
  }
}

/**
 * Validate Pakistani Mobile Number
 * Local format: 11 digits starting with 03 (e.g., 03001234567)
 * Int'l format: 12 digits starting with 923 (e.g., +923001234567)
 */
export function validateMobileNumber(input: string): { valid: boolean; error?: string } {
  if (!input || !input.trim()) {
    return { valid: false, error: 'Mobile number is required' };
  }
  const digits = input.replace(/\D/g, '');
  if (input.trim().startsWith('+') || digits.startsWith('92')) {
    if (digits.length !== 12) {
      return {
        valid: false,
        error: `International mobile number must be 12 digits (+92 3XX XXXXXXX). Current digits: ${digits.length}`,
      };
    }
  } else if (digits.startsWith('03')) {
    if (digits.length !== 11) {
      return {
        valid: false,
        error: `Pakistani mobile number starting with 03 must be exactly 11 digits (03XX-XXXXXXX). Current digits: ${digits.length}`,
      };
    }
  } else {
    if (digits.length < 10 || digits.length > 12) {
      return {
        valid: false,
        error: 'Invalid mobile number. Please use Pakistani format: 03001234567 or +923001234567',
      };
    }
  }
  return { valid: true };
}
