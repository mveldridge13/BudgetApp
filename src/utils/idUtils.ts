import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a new UUID v4
 * @returns {string} A new UUID
 */
export const generateUUID = (): string => uuidv4();

/**
 * Generates a new ID with a prefix
 * @param {string} prefix - The prefix to add to the ID
 * @returns {string} A new ID with the format: prefix_uuid
 */
export const generatePrefixedId = (prefix: string): string => {
  return `${prefix}_${uuidv4()}`;
};

/**
 * Generates a new ID for a subcategory
 * @param {string} categoryId - The parent category's ID
 * @returns {string} A new ID with the format: categoryId_subcategory_uuid
 */
export const generateSubcategoryId = (categoryId: string): string => {
  return `${categoryId}_subcategory_${uuidv4()}`;
};

/**
 * Checks if a string is a valid UUID
 * @param {string} id - The ID to check
 * @returns {boolean} True if the ID is a valid UUID
 */
export const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Generates a new entity with required fields
 * @param {string} userId - The user's ID
 * @returns {Object} An object with id, userId, createdAt, and updatedAt fields
 */
export const generateBaseEntity = (userId: string) => {
  const now = new Date().toISOString();
  return {
    id: generateUUID(),
    userId,
    createdAt: now,
    updatedAt: now,
    version: 1
  };
}; 