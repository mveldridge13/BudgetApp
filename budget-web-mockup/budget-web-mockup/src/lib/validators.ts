// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Password validation
export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const colors = ['#F87171', '#F59E0B', '#EAB308', '#22C55E', '#10B981'];

  return {
    score,
    label: labels[Math.min(score, 4)],
    color: colors[Math.min(score, 4)],
  };
}

// Amount validation
export function isValidAmount(amount: number | string): boolean {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(num) && num > 0;
}

export function parseAmount(value: string): number | null {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Date validation
export function isValidDate(date: string): boolean {
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
}

export function isFutureDate(date: string): boolean {
  return new Date(date) > new Date();
}

export function isPastDate(date: string): boolean {
  return new Date(date) < new Date();
}

// Input sanitization (matching mobile app)
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';

  // Remove dangerous patterns while keeping legitimate special characters
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

// Form validation helpers
export interface ValidationRule {
  validate: (value: unknown) => boolean;
  message: string;
}

export function validateField(
  value: unknown,
  rules: ValidationRule[]
): string | null {
  for (const rule of rules) {
    if (!rule.validate(value)) {
      return rule.message;
    }
  }
  return null;
}

export const rules = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value) => value !== null && value !== undefined && value !== '',
    message,
  }),

  email: (message = 'Please enter a valid email'): ValidationRule => ({
    validate: (value) => isValidEmail(String(value)),
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value) => String(value).length >= min,
    message: message || `Must be at least ${min} characters`,
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value) => String(value).length <= max,
    message: message || `Must be at most ${max} characters`,
  }),

  positiveNumber: (message = 'Must be a positive number'): ValidationRule => ({
    validate: (value) => {
      const num = typeof value === 'string' ? parseFloat(value) : Number(value);
      return !isNaN(num) && num > 0;
    },
    message,
  }),
};
