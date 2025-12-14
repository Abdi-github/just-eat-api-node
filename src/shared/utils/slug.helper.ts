import slugify from 'slugify';

/**
 * Generate URL-friendly slug from a string
 */
export const generateSlug = (text: string): string => {
  return slugify(text, {
    lower: true,
    strict: true,
    trim: true,
  });
};

/**
 * Generate a unique slug by appending a random suffix if needed
 */
export const generateUniqueSlug = (text: string, suffix?: string): string => {
  const baseSlug = generateSlug(text);
  if (suffix) {
    return `${baseSlug}-${suffix}`;
  }
  return baseSlug;
};

export default { generateSlug, generateUniqueSlug };
