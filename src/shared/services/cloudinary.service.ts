import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { config } from '../../config/index.js';
import { logger } from '../logger/index.js';
import { InternalServerError } from '../errors/AppError.js';
import { imageService, IMAGE_PRESETS, type ImageOptimizationOptions } from './image.service.js';

/**
 * Cloudinary folder structure for the just-eat platform
 */
export const CLOUDINARY_FOLDERS = {
  restaurants: {
    logos: 'restaurants/logos',
    covers: 'restaurants/covers',
  },
  brands: {
    logos: 'brands/logos',
  },
  menu: {
    items: 'menu/items',
  },
  users: {
    avatars: 'users/avatars',
  },
  cuisines: {
    images: 'cuisines/images',
  },
} as const;

/**
 * Result from a Cloudinary upload
 */
export interface CloudinaryUploadResult {
  /** Cloudinary public ID */
  public_id: string;
  /** Secure HTTPS URL */
  url: string;
  /** Thumbnail URL (if generated) */
  thumbnail_url?: string;
  /** Image width */
  width: number;
  /** Image height */
  height: number;
  /** File size in bytes */
  bytes: number;
  /** File format */
  format: string;
  /** Cloudinary resource type */
  resource_type: string;
}

/**
 * Options for uploading to Cloudinary
 */
export interface CloudinaryUploadOptions {
  /** Subfolder path within the base folder */
  folder: string;
  /** Custom public ID (auto-generated if not provided) */
  publicId?: string;
  /** Image optimization preset to apply before upload */
  preset?: keyof typeof IMAGE_PRESETS;
  /** Custom optimization options (overrides preset) */
  optimization?: ImageOptimizationOptions;
  /** Cloudinary transformation tags */
  tags?: string[];
  /** Whether to overwrite existing image with same public_id */
  overwrite?: boolean;
}

/**
 * Cloudinary Service
 * Handles image upload, optimization, and management via Cloudinary SDK
 */
export class CloudinaryService {
  private isConfigured = false;

  constructor() {
    this.configure();
  }

  /**
   * Initialize Cloudinary SDK with credentials
   */
  private configure(): void {
    const { cloudName, apiKey, apiSecret } = config.cloudinary;

    if (!cloudName || !apiKey || !apiSecret) {
      logger.warn('Cloudinary credentials not configured — uploads will fail');
      return;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    this.isConfigured = true;
    logger.info('Cloudinary configured successfully');
  }

  /**
   * Ensure Cloudinary is configured before operations
   */
  private ensureConfigured(): void {
    if (!this.isConfigured) {
      throw InternalServerError('Cloudinary is not configured. Check environment variables.');
    }
  }

  // ==========================================================================
  // UPLOAD OPERATIONS
  // ==========================================================================

  /**
   * Upload a single image buffer to Cloudinary
   * Applies Sharp optimization before upload
   */
  async uploadSingle(
    buffer: Buffer,
    originalname: string,
    options: CloudinaryUploadOptions
  ): Promise<CloudinaryUploadResult> {
    this.ensureConfigured();

    const { folder, publicId, preset, optimization, tags, overwrite = true } = options;
    const fullFolder = `${config.cloudinary.folder}/${folder}`;

    // Determine optimization settings
    const optimizationOpts =
      optimization || (preset ? IMAGE_PRESETS[preset] : IMAGE_PRESETS.generic);

    // Optimize image with Sharp before uploading
    let mainBuffer = buffer;
    let thumbnailResult: CloudinaryUploadResult | undefined;

    if (config.imageUpload.enableOptimization) {
      const optimized = await imageService.optimize(buffer, optimizationOpts);
      mainBuffer = optimized.main.buffer;

      // Upload thumbnail if generated
      if (optimized.thumbnail) {
        thumbnailResult = await this.uploadBuffer(optimized.thumbnail.buffer, {
          folder: `${fullFolder}/thumbnails`,
          publicId: publicId ? `${publicId}_thumb` : undefined,
          format: optimized.thumbnail.format,
          tags: [...(tags || []), 'thumbnail'],
          overwrite,
        });
      }
    }

    // Upload main image
    const result = await this.uploadBuffer(mainBuffer, {
      folder: fullFolder,
      publicId,
      format: 'webp',
      tags,
      overwrite,
    });

    logger.info(`Image uploaded to Cloudinary: ${result.public_id}`, {
      folder: fullFolder,
      originalname,
      size: result.bytes,
    });

    return {
      ...result,
      thumbnail_url: thumbnailResult?.url,
    };
  }

  /**
   * Upload multiple image buffers to Cloudinary
   */
  async uploadMultiple(
    files: Array<{ buffer: Buffer; originalname: string }>,
    options: CloudinaryUploadOptions
  ): Promise<CloudinaryUploadResult[]> {
    this.ensureConfigured();

    const results = await Promise.all(
      files.map((file, index) =>
        this.uploadSingle(file.buffer, file.originalname, {
          ...options,
          publicId: options.publicId ? `${options.publicId}_${index + 1}` : undefined,
        })
      )
    );

    logger.info(`Batch upload complete: ${results.length} images uploaded`, {
      folder: options.folder,
    });

    return results;
  }

  // ==========================================================================
  // DELETE OPERATIONS
  // ==========================================================================

  /**
   * Delete a single image from Cloudinary by public_id
   */
  async deleteSingle(publicId: string): Promise<boolean> {
    this.ensureConfigured();

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        invalidate: true,
      });

      const success = result.result === 'ok';
      if (success) {
        logger.info(`Image deleted from Cloudinary: ${publicId}`);
      } else {
        logger.warn(`Failed to delete image from Cloudinary: ${publicId}`, { result });
      }
      return success;
    } catch (error) {
      logger.error(`Cloudinary delete error for ${publicId}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple images from Cloudinary
   */
  async deleteMultiple(publicIds: string[]): Promise<{ deleted: string[]; failed: string[] }> {
    this.ensureConfigured();

    if (publicIds.length === 0) return { deleted: [], failed: [] };

    try {
      const result = await cloudinary.api.delete_resources(publicIds, {
        invalidate: true,
      });

      const deleted: string[] = [];
      const failed: string[] = [];

      for (const [id, status] of Object.entries(result.deleted)) {
        if (status === 'deleted') {
          deleted.push(id);
        } else {
          failed.push(id);
        }
      }

      logger.info(`Batch delete: ${deleted.length} deleted, ${failed.length} failed`);
      return { deleted, failed };
    } catch (error) {
      logger.error('Cloudinary batch delete error:', error);
      return { deleted: [], failed: publicIds };
    }
  }

  /**
   * Delete all images in a folder
   */
  async deleteFolder(folderPath: string): Promise<boolean> {
    this.ensureConfigured();
    const fullFolder = `${config.cloudinary.folder}/${folderPath}`;

    try {
      // Delete all resources in the folder
      await cloudinary.api.delete_resources_by_prefix(fullFolder);
      // Delete the (now empty) folder itself
      await cloudinary.api.delete_folder(fullFolder);
      logger.info(`Cloudinary folder deleted: ${fullFolder}`);
      return true;
    } catch (error) {
      logger.error(`Cloudinary folder delete error for ${fullFolder}:`, error);
      return false;
    }
  }

  // ==========================================================================
  // URL GENERATION
  // ==========================================================================

  /**
   * Generate a Cloudinary URL with transformations
   */
  generateUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string;
      format?: string;
    } = {}
  ): string {
    return cloudinary.url(publicId, {
      secure: true,
      width: options.width,
      height: options.height,
      crop: options.crop || 'fill',
      quality: options.quality || 'auto',
      format: options.format || 'webp',
      fetch_format: 'auto',
    });
  }

  /**
   * Generate a thumbnail URL for a given public_id
   */
  generateThumbnailUrl(publicId: string, width = 300, height = 200): string {
    return cloudinary.url(publicId, {
      secure: true,
      width,
      height,
      crop: 'fill',
      quality: 'auto:low',
      format: 'webp',
    });
  }

  // ==========================================================================
  // FOLDER MANAGEMENT
  // ==========================================================================

  /**
   * List all sub-folders under the base project folder
   */
  async listFolders(prefix?: string): Promise<string[]> {
    this.ensureConfigured();
    const path = prefix ? `${config.cloudinary.folder}/${prefix}` : config.cloudinary.folder;

    try {
      const result = await cloudinary.api.sub_folders(path);
      return result.folders.map((f: { name: string }) => f.name);
    } catch (error) {
      logger.error('Cloudinary list folders error:', error);
      return [];
    }
  }

  /**
   * Get resource details by public_id
   */
  async getResource(
    publicId: string
  ): Promise<{ public_id: string; url: string; bytes: number; format: string } | null> {
    this.ensureConfigured();

    try {
      const result = await cloudinary.api.resource(publicId);
      return {
        public_id: result.public_id,
        url: result.secure_url,
        bytes: result.bytes,
        format: result.format,
      };
    } catch {
      return null;
    }
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Extract public_id from a Cloudinary URL
   * e.g., "https://res.cloudinary.com/.../v123/justeat/restaurants/logos/abc.webp"
   *     → "justeat/restaurants/logos/abc"
   */
  extractPublicId(url: string): string | null {
    if (!url) return null;

    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      // Remove version prefix (v123...) and file extension
      const uploadIndex = pathParts.indexOf('upload');
      if (uploadIndex === -1) return null;

      const relevantParts = pathParts.slice(uploadIndex + 1);
      // Skip version segment if present
      const startIndex = relevantParts[0]?.startsWith('v') ? 1 : 0;
      const publicIdWithExt = relevantParts.slice(startIndex).join('/');
      // Remove file extension
      return publicIdWithExt.replace(/\.[^.]+$/, '');
    } catch {
      return null;
    }
  }

  /**
   * Upload raw buffer to Cloudinary (internal helper)
   */
  private async uploadBuffer(
    buffer: Buffer,
    options: {
      folder: string;
      publicId?: string;
      format?: string;
      tags?: string[];
      overwrite?: boolean;
    }
  ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      const uploadOptions: Record<string, unknown> = {
        folder: options.folder,
        overwrite: options.overwrite ?? true,
        resource_type: 'image' as const,
        format: options.format || 'webp',
        tags: options.tags,
        unique_filename: !options.publicId,
      };

      if (options.publicId) {
        uploadOptions.public_id = options.publicId;
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            logger.error('Cloudinary upload error:', error);
            reject(InternalServerError(error?.message || 'Failed to upload image to Cloudinary'));
            return;
          }

          resolve({
            public_id: result.public_id,
            url: result.secure_url,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            format: result.format,
            resource_type: result.resource_type,
          });
        }
      );

      uploadStream.end(buffer);
    });
  }
}

export const cloudinaryService = new CloudinaryService();
export default cloudinaryService;
