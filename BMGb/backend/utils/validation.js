/**
 * Utility functions for request validation
 */

/**
 * Validate if a string is a valid UUID
 * @param {string} id - The string to validate as UUID
 * @returns {boolean} - True if valid UUID, false otherwise
 */
const validateUUID = (id) => {
  if (!id) return false;
  
  // Regular expression for UUID v4 validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Copy only the listed fields from a request body, so clients cannot set any others
 * @param {object} source - The request body
 * @param {string[]} fields - The fields clients may set
 * @returns {object} - A new object with the fields present in source
 */
const pickFields = (source, fields) => {
  const picked = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      picked[field] = source[field];
    }
  }
  return picked;
};

module.exports = {
  validateUUID,
  pickFields
};
