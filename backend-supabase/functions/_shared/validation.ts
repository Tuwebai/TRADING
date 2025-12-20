/**
 * Validation utilities for Edge Functions
 * Simple validation helpers (for complex validation, consider using Zod)
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate required fields in an object
 */
export function validateRequired(
  data: Record<string, any>,
  requiredFields: string[]
): ValidationResult {
  const errors: string[] = [];
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate string is not empty
 */
export function validateNonEmpty(value: any, fieldName: string): ValidationResult {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return {
      valid: false,
      errors: [`${fieldName} must be a non-empty string`],
    };
  }
  return { valid: true, errors: [] };
}

/**
 * Validate number is within range
 */
export function validateNumberRange(
  value: any,
  fieldName: string,
  min?: number,
  max?: number
): ValidationResult {
  const num = typeof value === 'number' ? value : parseFloat(value);
  
  if (isNaN(num)) {
    return {
      valid: false,
      errors: [`${fieldName} must be a valid number`],
    };
  }
  
  const errors: string[] = [];
  if (min !== undefined && num < min) {
    errors.push(`${fieldName} must be at least ${min}`);
  }
  if (max !== undefined && num > max) {
    errors.push(`${fieldName} must be at most ${max}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate value is one of allowed values
 */
export function validateEnum<T>(
  value: any,
  fieldName: string,
  allowedValues: readonly T[]
): ValidationResult {
  if (!allowedValues.includes(value)) {
    return {
      valid: false,
      errors: [`${fieldName} must be one of: ${allowedValues.join(', ')}`],
    };
  }
  return { valid: true, errors: [] };
}

/**
 * Sanitize string input (basic XSS prevention)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .trim()
    .substring(0, 10000); // Max length
}

/**
 * Validate trade side
 */
export function validateTradeSide(side: any): ValidationResult {
  return validateEnum(side, 'side', ['buy', 'sell'] as const);
}

/**
 * Validate account mode
 */
export function validateAccountMode(mode: any): ValidationResult {
  return validateEnum(mode, 'account_mode', ['simulation', 'demo', 'live'] as const);
}

/**
 * Validate timestamp (Unix timestamp in seconds)
 */
export function validateTimestamp(timestamp: any, fieldName: string): ValidationResult {
  const num = typeof timestamp === 'number' ? timestamp : parseFloat(timestamp);
  
  if (isNaN(num)) {
    return {
      valid: false,
      errors: [`${fieldName} must be a valid number`],
    };
  }
  
  // Reasonable range: between 2000-01-01 and 2100-01-01
  const minTimestamp = 946684800; // 2000-01-01
  const maxTimestamp = 4102444800; // 2100-01-01
  
  if (num < minTimestamp || num > maxTimestamp) {
    return {
      valid: false,
      errors: [`${fieldName} must be a valid Unix timestamp`],
    };
  }
  
  return { valid: true, errors: [] };
}

