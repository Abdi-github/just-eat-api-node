import multer, { type FileFilterCallback } from 'multer';
import { Request } from 'express';
import { config } from '../../config/index.js';
import { BadRequestError } from '../errors/AppError.js';

/**
 * Memory storage — files stored in buffer (no disk writes)
 * Buffers are passed to Sharp for optimization then to Cloudinary
 */
const storage = multer.memoryStorage();

/**
 * File filter — validates MIME types
 */
const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  if (config.imageUpload.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      BadRequestError(
        `Invalid file type: ${file.mimetype}. Allowed types: ${config.imageUpload.allowedMimeTypes.join(', ')}`
      )
    );
  }
};

/**
 * Base multer instance with common configuration
 */
const baseMulter = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.imageUpload.maxFileSize,
    files: config.imageUpload.maxImagesPerBatch,
  },
});

// =============================================================================
// SINGLE IMAGE UPLOAD MIDDLEWARES
// =============================================================================

/**
 * Upload a single image file
 * File available on `req.file`
 * @param fieldName - Form field name (default: 'image')
 */
export const uploadSingle = (fieldName = 'image') => baseMulter.single(fieldName);

/**
 * Preset: Restaurant logo upload
 * Field name: 'logo'
 */
export const uploadRestaurantLogo = baseMulter.single('logo');

/**
 * Preset: Restaurant cover image upload
 * Field name: 'cover_image'
 */
export const uploadRestaurantCover = baseMulter.single('cover_image');

/**
 * Preset: Brand logo upload
 * Field name: 'logo'
 */
export const uploadBrandLogo = baseMulter.single('logo');

/**
 * Preset: Menu item image upload
 * Field name: 'image'
 */
export const uploadMenuItemImage = baseMulter.single('image');

/**
 * Preset: User avatar upload
 * Field name: 'avatar'
 */
export const uploadAvatar = baseMulter.single('avatar');

// =============================================================================
// MULTIPLE IMAGE UPLOAD MIDDLEWARES
// =============================================================================

/**
 * Upload multiple images with the same field name
 * Files available on `req.files` (as array)
 * @param fieldName - Form field name (default: 'images')
 * @param maxCount - Maximum number of files (default: from config)
 */
export const uploadMultiple = (
  fieldName = 'images',
  maxCount = config.imageUpload.maxImagesPerBatch
) => baseMulter.array(fieldName, maxCount);

/**
 * Upload multiple images with different field names
 * Files available on `req.files` (as object keyed by field name)
 */
export const uploadFields = (fields: Array<{ name: string; maxCount: number }>) =>
  baseMulter.fields(fields);

/**
 * Preset: Restaurant logo + cover image in one request
 */
export const uploadRestaurantImages = baseMulter.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'cover_image', maxCount: 1 },
]);

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Middleware to require that a file was uploaded
 * Use after multer middleware to ensure the file field is present
 */
export const requireFile = (fieldName = 'image') => {
  return (req: Request, _res: unknown, next: (err?: Error) => void): void => {
    const file = req.file;

    if (!file) {
      return next(BadRequestError(`Image file is required (field: ${fieldName})`));
    }

    next();
  };
};

/**
 * Middleware to require at least one file in a multi-upload
 */
export const requireFiles = (fieldName = 'images') => {
  return (req: Request, _res: unknown, next: (err?: Error) => void): void => {
    const files = req.files;

    if (!files || (Array.isArray(files) && files.length === 0)) {
      return next(BadRequestError(`At least one image file is required (field: ${fieldName})`));
    }

    next();
  };
};

export default {
  uploadSingle,
  uploadMultiple,
  uploadFields,
  uploadRestaurantLogo,
  uploadRestaurantCover,
  uploadRestaurantImages,
  uploadBrandLogo,
  uploadMenuItemImage,
  uploadAvatar,
  requireFile,
  requireFiles,
};
