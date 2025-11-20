import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Supported languages type
export type SupportedLanguage = 'en' | 'fr' | 'de' | 'it';

// Configuration object
export const config = {
  // Application
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4005', 10),
  apiVersion: process.env.API_VERSION || 'v1',
  apiPrefix: process.env.API_PREFIX || '/api',

  // Database - MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27022/justeat_dev',
    dbName: process.env.MONGODB_DB_NAME || 'justeat_dev',
  },

  // Cache - Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  // JWT Authentication
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
    issuer: process.env.JWT_ISSUER || 'just-eat.ch',
    audience: process.env.JWT_AUDIENCE || 'just-eat.ch',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequestsGuest: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_GUEST || '100', 10),
    maxRequestsAuth: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_AUTH || '300', 10),
    maxRequestsRestaurant: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_RESTAURANT || '500', 10),
    maxRequestsAdmin: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_ADMIN || '1000', 10),
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) || ['http://localhost:3000'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'justeat',
  },

  // Image Upload Settings
  imageUpload: {
    maxFileSize: parseInt(process.env.MAX_IMAGE_SIZE || '10485760', 10),
    maxImagesPerBatch: parseInt(process.env.MAX_IMAGES_PER_BATCH || '10', 10),
    allowedMimeTypes: (
      process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/gif,image/webp'
    ).split(','),
    enableOptimization: process.env.ENABLE_IMAGE_OPTIMIZATION !== 'false',
    thumbnailWidth: parseInt(process.env.THUMBNAIL_WIDTH || '300', 10),
    thumbnailHeight: parseInt(process.env.THUMBNAIL_HEIGHT || '200', 10),
    maxImageWidth: parseInt(process.env.MAX_IMAGE_WIDTH || '2000', 10),
    imageQuality: parseInt(process.env.IMAGE_QUALITY || '85', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    dir: process.env.LOG_DIR || 'logs',
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
  },

  // i18n
  i18n: {
    defaultLanguage: (process.env.DEFAULT_LANGUAGE as SupportedLanguage) || 'de',
    supportedLanguages: (process.env.SUPPORTED_LANGUAGES?.split(',') as SupportedLanguage[]) || [
      'en',
      'fr',
      'de',
      'it',
    ],
  },

  // Bcrypt
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  },

  // Pagination
  pagination: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '20', 10),
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '100', 10),
  },

  // Email Configuration
  email: {
    host: process.env.MAIL_HOST || 'mailpit',
    port: parseInt(process.env.MAIL_PORT || '1025', 10),
    secure: process.env.MAIL_SECURE === 'true',
    auth: {
      user: process.env.MAIL_USER || '',
      pass: process.env.MAIL_PASSWORD || '',
    },
    from: {
      name: process.env.MAIL_FROM_NAME || 'just-eat.ch',
      address: process.env.MAIL_FROM || 'noreply@just-eat.ch',
    },
    replyTo: process.env.MAIL_REPLY_TO || 'support@just-eat.ch',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@just-eat.ch',
  },

  // Frontend URLs (for email links)
  frontend: {
    baseUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    adminUrl: process.env.FRONTEND_ADMIN_URL || 'http://localhost:5174',
    verifyEmailPath: '/verify-email',
    resetPasswordPath: '/reset-password',
  },

  // Payment Configuration
  payment: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      apiVersion: process.env.STRIPE_API_VERSION || '2024-12-18.acacia',
    },
    twint: {
      merchantId: process.env.TWINT_MERCHANT_ID || '',
      merchantSecret: process.env.TWINT_MERCHANT_SECRET || '',
      apiUrl: process.env.TWINT_API_URL || '',
      sandboxMode: process.env.TWINT_SANDBOX_MODE === 'true',
      sessionTimeoutMinutes: parseInt(process.env.TWINT_SESSION_TIMEOUT_MINUTES || '5', 10),
    },
    postfinance: {
      spaceId: process.env.POSTFINANCE_SPACE_ID || '',
      userId: process.env.POSTFINANCE_USER_ID || '',
      apiSecret: process.env.POSTFINANCE_API_SECRET || '',
      apiUrl: process.env.POSTFINANCE_API_URL || '',
      sandboxMode: process.env.POSTFINANCE_SANDBOX_MODE === 'true',
      sessionTimeoutMinutes: parseInt(process.env.POSTFINANCE_SESSION_TIMEOUT_MINUTES || '15', 10),
    },
    cash: {
      enabled: process.env.CASH_PAYMENT_ENABLED === 'true',
    },
    defaultCurrency: 'CHF' as const,
    maxPaymentAttempts: parseInt(process.env.MAX_PAYMENT_ATTEMPTS || '3', 10),
    paymentSessionTTL: parseInt(process.env.PAYMENT_SESSION_TTL || '1800', 10),
  },

  // Development helpers
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
} as const;

// Validate required configuration in production
export const validateConfig = (): void => {
  if (config.isProduction) {
    const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];

    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    if (config.jwt.secret === 'dev-secret-key-change-in-production') {
      throw new Error('JWT_SECRET must be changed in production');
    }
  }
};

export default config;
