// utils/sanitizer.js - Conservative input sanitization
// Only removes truly dangerous patterns while preserving legitimate special characters

/**
 * Sanitize text input - removes dangerous scripts and event handlers
 * Preserves legitimate special characters like apostrophes, quotes, $, @, etc.
 */
const sanitizeText = input => {
  if (!input || typeof input !== 'string') {
    return input;
  }

  return (
    input
      .trim()
      // Remove script tags and their content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove javascript: protocol
      .replace(/javascript:/gi, '')
      // Remove event handlers (onclick, onerror, onload, etc.)
      .replace(/on\w+\s*=/gi, '')
      // Remove iframe tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
  );
};

/**
 * Sanitize description/notes - allows more formatting
 * Just removes dangerous patterns and cleans whitespace
 */
const sanitizeDescription = input => {
  if (!input || typeof input !== 'string') {
    return input;
  }

  return (
    input
      .trim()
      // Remove script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove javascript: protocol
      .replace(/javascript:/gi, '')
      // Remove event handlers
      .replace(/on\w+\s*=/gi, '')
      // Remove iframe tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
  );
};

/**
 * Sanitize email - basic cleanup (validation happens separately)
 */
const sanitizeEmail = input => {
  if (!input || typeof input !== 'string') {
    return input;
  }

  return (
    input
      .trim()
      .toLowerCase()
      // Remove dangerous characters
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
  );
};

/**
 * Sanitize name fields (first name, last name)
 * Removes dangerous patterns but allows international characters
 */
const sanitizeName = input => {
  if (!input || typeof input !== 'string') {
    return input;
  }

  return (
    input
      .trim()
      // Remove script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove javascript: protocol
      .replace(/javascript:/gi, '')
      // Remove event handlers
      .replace(/on\w+\s*=/gi, '')
      // Remove any HTML tags
      .replace(/<[^>]*>/g, '')
  );
};

/**
 * Sanitize object - recursively sanitize all string values
 */
const sanitizeObject = (obj, sanitizeFunc = sanitizeText) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      if (typeof value === 'string') {
        sanitized[key] = sanitizeFunc(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value, sanitizeFunc);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
};

// Export sanitization functions
export const sanitizeInput = {
  text: sanitizeText,
  description: sanitizeDescription,
  email: sanitizeEmail,
  name: sanitizeName,
  object: sanitizeObject,
};

export default sanitizeInput;
