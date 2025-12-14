import sharp from 'sharp';
import { config } from '../../config/index.js';
import { logger } from '../logger/index.js';

/**
 * Image optimization presets for different use cases
 */
export interface ImageOptimizationOptions {
  /** Target width in pixels (maintains aspect ratio if height not set) */
  width?: number;
  /** Target height in pixels (maintains aspect ratio if width not set) */
  height?: number;
  /** JPEG/WebP quality 1-100 */
  quality?: number;
  /** Output format (defaults to webp for best compression) */
  format?: 'webp' | 'jpeg' | 'png';
  /** How to fit the image into the target dimensions */
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  /** Whether to generate a thumbnail alongside the main image */
  withThumbnail?: boolean;
}

export interface OptimizedImage {
  /** Optimized image buffer */
  buffer: Buffer;
  /** MIME type of the output */
  mimetype: string;
  /** File extension (without dot) */
  format: string;
  /** Width of the output image */
  width: number;
  /** Height of the output image */
  height: number;
  /** Size in bytes */
  size: number;
}

export interface OptimizedImageResult {
  /** Main optimized image */
  main: OptimizedImage;
  /** Optional thumbnail */
  thumbnail?: OptimizedImage;
}

/**
 * Predefined optimization presets
 */
export const IMAGE_PRESETS = {
  /** Restaurant logo — square, small */
  restaurantLogo: {
    width: 400,
    height: 400,
    quality: 85,
    format: 'webp' as const,
    fit: 'cover' as const,
    withThumbnail: true,
  },
  /** Restaurant cover/hero image — wide landscape */
  restaurantCover: {
    width: 1200,
    height: 600,
    quality: 80,
    format: 'webp' as const,
    fit: 'cover' as const,
    withThumbnail: true,
  },
  /** Brand logo — square, small */
  brandLogo: {
    width: 400,
    height: 400,
    quality: 85,
    format: 'webp' as const,
    fit: 'cover' as const,
    withThumbnail: true,
  },
  /** Menu item image */
  menuItem: {
    width: 800,
    height: 600,
    quality: 80,
    format: 'webp' as const,
    fit: 'cover' as const,
    withThumbnail: true,
  },
  /** User avatar — square, small */
  avatar: {
    width: 300,
    height: 300,
    quality: 85,
    format: 'webp' as const,
    fit: 'cover' as const,
    withThumbnail: false,
  },
  /** Cuisine image */
  cuisineImage: {
    width: 600,
    height: 400,
    quality: 80,
    format: 'webp' as const,
    fit: 'cover' as const,
    withThumbnail: true,
  },
  /** Generic — respects config settings */
  generic: {
    width: config.imageUpload.maxImageWidth,
    quality: config.imageUpload.imageQuality,
    format: 'webp' as const,
    fit: 'inside' as const,
    withThumbnail: false,
  },
} as const;

/**
 * Image Optimization Service
 * Uses Sharp for high-performance server-side image processing
 */
export class ImageService {
  /**
   * Optimize a single image buffer with the given options
   */
  async optimize(
    inputBuffer: Buffer,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImageResult> {
    const {
      width,
      height,
      quality = config.imageUpload.imageQuality,
      format = 'webp',
      fit = 'cover',
      withThumbnail = false,
    } = options;

    try {
      // Process main image
      const main = await this.processImage(inputBuffer, { width, height, quality, format, fit });

      // Process thumbnail if requested
      let thumbnail: OptimizedImage | undefined;
      if (withThumbnail) {
        thumbnail = await this.processImage(inputBuffer, {
          width: config.imageUpload.thumbnailWidth,
          height: config.imageUpload.thumbnailHeight,
          quality: Math.min(quality, 75),
          format,
          fit: 'cover',
        });
      }

      const savings = inputBuffer.length - main.size;
      const savingsPercent = ((savings / inputBuffer.length) * 100).toFixed(1);
      logger.debug(
        `Image optimized: ${inputBuffer.length} → ${main.size} bytes (${savingsPercent}% reduction)`
      );

      return { main, thumbnail };
    } catch (error) {
      logger.error('Image optimization failed:', error);
      throw error;
    }
  }

  /**
   * Optimize multiple image buffers with the same options
   */
  async optimizeBatch(
    inputs: Array<{ buffer: Buffer; originalname: string }>,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImageResult[]> {
    return Promise.all(inputs.map((input) => this.optimize(input.buffer, options)));
  }

  /**
   * Process a single image with Sharp
   */
  private async processImage(
    buffer: Buffer,
    opts: {
      width?: number;
      height?: number;
      quality: number;
      format: 'webp' | 'jpeg' | 'png';
      fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    }
  ): Promise<OptimizedImage> {
    let pipeline = sharp(buffer).rotate(); // Auto-rotate based on EXIF

    // Resize if dimensions specified
    if (opts.width || opts.height) {
      pipeline = pipeline.resize({
        width: opts.width,
        height: opts.height,
        fit: opts.fit,
        withoutEnlargement: true,
      });
    }

    // Apply format-specific compression
    switch (opts.format) {
      case 'webp':
        pipeline = pipeline.webp({ quality: opts.quality, effort: 4 });
        break;
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality: opts.quality, mozjpeg: true });
        break;
      case 'png':
        pipeline = pipeline.png({ quality: opts.quality, compressionLevel: 8 });
        break;
    }

    const outputBuffer = await pipeline.toBuffer();
    const metadata = await sharp(outputBuffer).metadata();

    return {
      buffer: outputBuffer,
      mimetype: `image/${opts.format}`,
      format: opts.format,
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: outputBuffer.length,
    };
  }

  /**
   * Get image metadata without processing
   */
  async getMetadata(buffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
    hasAlpha: boolean;
  }> {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size: buffer.length,
      hasAlpha: metadata.hasAlpha || false,
    };
  }

  /**
   * Validate that a buffer is a valid image
   */
  async isValidImage(buffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(buffer).metadata();
      return !!(metadata.width && metadata.height && metadata.format);
    } catch {
      return false;
    }
  }
}

export const imageService = new ImageService();
export default imageService;
