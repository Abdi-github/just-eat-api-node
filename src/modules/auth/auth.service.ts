import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

import config from '../../config/index.js';
import { AppError, BadRequestError, UnauthorizedError } from '../../shared/errors/AppError.js';
import { logger } from '../../shared/logger/index.js';
import { getRedisClient } from '../../config/redis.js';
import {
  enqueueVerificationEmail,
  enqueueWelcomeEmail,
  enqueuePasswordResetEmail,
} from '../../shared/queue/index.js';

import { authRepository, AuthRepository } from './auth.repository.js';
import { Restaurant } from '../restaurant/restaurant.model.js';
import { User } from '../user/user.model.js';
import {
  toAuthUserResponseDto,
  toProfileResponseDto,
  AuthResponseDto,
  TokenRefreshResponseDto,
  ProfileResponseDto,
} from './auth.dto.js';
import {
  ApplicationStatusResponse,
  AuthenticatedUser,
  JwtPayload,
  LoginCredentials,
  PasswordChangeData,
  RegisterData,
  RegisterRestaurantData,
  RegisterCourierData,
  RefreshTokenPayload,
  SupportedLanguage,
  TokenPair,
  UserType,
  UserWithRolesAndPermissions,
} from './auth.types.js';

/**
 * Auth Service
 * Handles all authentication business logic
 */
export class AuthService {
  constructor(private repository: AuthRepository) {}

  // ===================================================
  // Core Authentication Methods
  // ===================================================

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponseDto> {
    const { email, password } = credentials;

    // Find user with roles and permissions
    const user = await this.repository.findByEmailWithRoles(email);
    if (!user) {
      throw UnauthorizedError('Invalid email or password');
    }

    // Check if user is active
    if (!user.is_active) {
      throw UnauthorizedError('Account is deactivated. Please contact support.');
    }

    // Check if user status allows login
    if (user.status === 'suspended') {
      throw UnauthorizedError('Account is suspended. Please contact support.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw UnauthorizedError('Invalid email or password');
    }

    // Extract roles and permissions
    const roles = user.roles.map((r) => r.code);
    const permissions = this.extractPermissions(user.roles);

    // Resolve restaurant ID for restaurant owners/staff
    const restaurantId = await this.resolveRestaurantId(user._id.toString(), roles);

    // Generate token pair
    const tokens = this.generateTokenPair(user, roles, permissions, restaurantId);

    // Store refresh token in DB
    await this.repository.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    // Update last login
    await this.repository.updateLastLogin(user._id.toString());

    logger.info(`User logged in: ${user.email}`);

    return {
      user: toAuthUserResponseDto(user, roles, permissions),
      tokens: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresIn,
        token_type: 'Bearer',
      },
    };
  }

  /**
   * Register a new customer user
   */
  async register(data: RegisterData): Promise<AuthResponseDto> {
    const { email, password, first_name, last_name, phone, preferred_language } = data;

    // Check if email already exists
    const emailExists = await this.repository.emailExists(email);
    if (emailExists) {
      throw new AppError('Email already registered', 409, 'AUTH_EMAIL_EXISTS');
    }

    // Hash password
    const salt = await bcrypt.genSalt(config.bcrypt.saltRounds);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await this.repository.create({
      email,
      password_hash: passwordHash,
      first_name,
      last_name,
      phone,
      preferred_language: preferred_language ?? 'de',
      status: 'pending', // Pending until email verification
    });

    // Assign default role (customer)
    await this.repository.assignDefaultRole(user._id.toString());

    // Generate email verification token
    const verificationToken = this.generateSecureToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await this.repository.setEmailVerificationToken(
      user._id.toString(),
      verificationToken,
      tokenExpiry
    );

    // Get roles and permissions for response
    const roles = ['customer'];
    const permissions = await this.repository.getUserPermissions(user._id.toString());

    // Generate token pair
    const userWithRoles: UserWithRolesAndPermissions = {
      _id: user._id,
      email: user.email,
      password_hash: '',
      first_name: user.first_name,
      last_name: user.last_name,
      preferred_language: user.preferred_language,
      status: user.status,
      is_active: user.is_active,
      is_verified: user.is_verified,
      roles: [{ code: 'customer', permissions: permissions.map((p) => ({ name: p })) }],
    };

    // Customers never have a restaurantId
    const tokens = this.generateTokenPair(userWithRoles, roles, permissions);

    // Store refresh token
    await this.repository.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    // Send verification email via queue
    const verificationUrl = `${config.frontend.baseUrl}${config.frontend.verifyEmailPath}?token=${verificationToken}`;
    enqueueVerificationEmail(email, first_name, verificationUrl).catch((err) => {
      logger.error('Failed to enqueue verification email', { email, error: err });
    });
    logger.info(`Verification token for ${email}: ${verificationToken}`);

    logger.info(`New user registered: ${email}`);

    return {
      user: toAuthUserResponseDto(user, roles, permissions),
      tokens: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresIn,
        token_type: 'Bearer',
      },
    };
  }

  /**
   * Register a new restaurant owner with a DRAFT restaurant
   */
  async registerRestaurantOwner(data: RegisterRestaurantData): Promise<AuthResponseDto> {
    const {
      email,
      password,
      first_name,
      last_name,
      phone,
      preferred_language,
      restaurant_name,
      restaurant_address,
      restaurant_postal_code,
      restaurant_city_id,
      restaurant_canton_id,
      restaurant_phone,
      restaurant_email,
      application_note,
    } = data;

    // Check if email already exists
    const emailExists = await this.repository.emailExists(email);
    if (emailExists) {
      throw new AppError('Email already registered', 409, 'AUTH_EMAIL_EXISTS');
    }

    // Hash password
    const salt = await bcrypt.genSalt(config.bcrypt.saltRounds);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user with application tracking
    const user = await this.repository.create({
      email,
      password_hash: passwordHash,
      first_name,
      last_name,
      phone,
      preferred_language: preferred_language ?? 'de',
      status: 'pending',
      application_status: 'pending_approval',
      application_type: 'restaurant_owner',
      application_note,
    });

    // Assign restaurant_owner role
    await this.repository.assignRole(user._id.toString(), 'restaurant_owner');

    // Generate slug from restaurant name
    const slug = this.generateSlug(restaurant_name);

    // Create restaurant in DRAFT status
    const restaurant = new Restaurant({
      name: restaurant_name,
      slug,
      address: restaurant_address,
      postal_code: restaurant_postal_code,
      city_id: restaurant_city_id,
      canton_id: restaurant_canton_id,
      owner_id: user._id,
      phone: restaurant_phone || null,
      email: restaurant_email || null,
      status: 'DRAFT',
      is_active: false,
    });
    await restaurant.save();

    // Generate email verification token
    const verificationToken = this.generateSecureToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.repository.setEmailVerificationToken(
      user._id.toString(),
      verificationToken,
      tokenExpiry
    );

    // Get roles and permissions
    const roles = ['restaurant_owner'];
    const permissions = await this.repository.getUserPermissions(user._id.toString());

    const userWithRoles: UserWithRolesAndPermissions = {
      _id: user._id,
      email: user.email,
      password_hash: '',
      first_name: user.first_name,
      last_name: user.last_name,
      preferred_language: user.preferred_language,
      status: user.status,
      is_active: user.is_active,
      is_verified: user.is_verified,
      roles: [{ code: 'restaurant_owner', permissions: permissions.map((p) => ({ name: p })) }],
    };

    const tokens = this.generateTokenPair(
      userWithRoles,
      roles,
      permissions,
      restaurant._id.toString()
    );

    await this.repository.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    // Send verification email via queue
    const verificationUrl = `${config.frontend.baseUrl}${config.frontend.verifyEmailPath}?token=${verificationToken}`;
    enqueueVerificationEmail(email, first_name, verificationUrl).catch((err) => {
      logger.error('Failed to enqueue verification email', { email, error: err });
    });
    logger.info(`Verification token for ${email}: ${verificationToken}`);

    logger.info(`New restaurant owner registered: ${email}, restaurant: ${restaurant_name}`);

    return {
      user: toAuthUserResponseDto(user, roles, permissions),
      tokens: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresIn,
        token_type: 'Bearer',
      },
    };
  }

  /**
   * Register a new courier
   */
  async registerCourier(data: RegisterCourierData): Promise<AuthResponseDto> {
    const {
      email,
      password,
      first_name,
      last_name,
      phone,
      preferred_language,
      vehicle_type,
      date_of_birth,
      application_note,
    } = data;

    // Check if email already exists
    const emailExists = await this.repository.emailExists(email);
    if (emailExists) {
      throw new AppError('Email already registered', 409, 'AUTH_EMAIL_EXISTS');
    }

    // Hash password
    const salt = await bcrypt.genSalt(config.bcrypt.saltRounds);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user with application tracking
    const user = await this.repository.create({
      email,
      password_hash: passwordHash,
      first_name,
      last_name,
      phone,
      preferred_language: preferred_language ?? 'de',
      status: 'pending',
      vehicle_type,
      date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
      application_status: 'pending_approval',
      application_type: 'courier',
      application_note,
    });

    // Assign courier role
    await this.repository.assignRole(user._id.toString(), 'courier');

    // Generate email verification token
    const verificationToken = this.generateSecureToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.repository.setEmailVerificationToken(
      user._id.toString(),
      verificationToken,
      tokenExpiry
    );

    // Get roles and permissions
    const roles = ['courier'];
    const permissions = await this.repository.getUserPermissions(user._id.toString());

    const userWithRoles: UserWithRolesAndPermissions = {
      _id: user._id,
      email: user.email,
      password_hash: '',
      first_name: user.first_name,
      last_name: user.last_name,
      preferred_language: user.preferred_language,
      status: user.status,
      is_active: user.is_active,
      is_verified: user.is_verified,
      roles: [{ code: 'courier', permissions: permissions.map((p) => ({ name: p })) }],
    };

    const tokens = this.generateTokenPair(userWithRoles, roles, permissions);

    await this.repository.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    // Send verification email via queue
    const courierVerificationUrl = `${config.frontend.baseUrl}${config.frontend.verifyEmailPath}?token=${verificationToken}`;
    enqueueVerificationEmail(email, first_name, courierVerificationUrl).catch((err) => {
      logger.error('Failed to enqueue verification email', { email, error: err });
    });
    logger.info(`Verification token for ${email}: ${verificationToken}`);

    logger.info(`New courier registered: ${email}, vehicle: ${vehicle_type}`);

    return {
      user: toAuthUserResponseDto(user, roles, permissions),
      tokens: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresIn,
        token_type: 'Bearer',
      },
    };
  }

  /**
   * Get application status for authenticated user
   */
  async getApplicationStatus(userId: string): Promise<ApplicationStatusResponse> {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const response: ApplicationStatusResponse = {
      application_status: user.application_status || 'none',
      application_type: user.application_type || null,
      application_note: user.application_note,
      application_rejection_reason: user.application_rejection_reason,
      application_reviewed_at: user.application_reviewed_at,
    };

    // If restaurant owner, include restaurant info
    if (user.application_type === 'restaurant_owner') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const restaurant = await Restaurant.findOne({ owner_id: user._id } as any)
        .select('_id name status')
        .lean();
      if (restaurant) {
        response.restaurant = {
          id: restaurant._id.toString(),
          name: restaurant.name,
          status: restaurant.status,
        };
      }
    }

    return response;
  }

  /**
   * Approve an application (admin action)
   */
  async approveApplication(userId: string, reviewedBy: string): Promise<{ message: string }> {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (user.application_status !== 'pending_approval') {
      throw BadRequestError('Application is not pending approval');
    }

    // Update application status
    await this.repository.updateApplicationStatus(userId, {
      application_status: 'approved',
      application_reviewed_by: reviewedBy,
      application_reviewed_at: new Date(),
    });

    // Activate user — set status to active
    await User.findByIdAndUpdate(userId, { status: 'active' });

    // For restaurant owners, transition restaurant to PENDING_APPROVAL
    if (user.application_type === 'restaurant_owner') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await Restaurant.findOneAndUpdate(
        { owner_id: user._id, status: 'DRAFT' } as any,
        { status: 'PENDING_APPROVAL' }
      );
    }

    logger.info(`Application approved for user ${userId} by admin ${reviewedBy}`);

    return { message: 'Application approved successfully' };
  }

  /**
   * Reject an application (admin action)
   */
  async rejectApplication(
    userId: string,
    reviewedBy: string,
    reason: string
  ): Promise<{ message: string }> {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (user.application_status !== 'pending_approval') {
      throw BadRequestError('Application is not pending approval');
    }

    // Update application status
    await this.repository.updateApplicationStatus(userId, {
      application_status: 'rejected',
      application_reviewed_by: reviewedBy,
      application_reviewed_at: new Date(),
      application_rejection_reason: reason,
    });

    logger.info(`Application rejected for user ${userId} by admin ${reviewedBy}`);

    return { message: 'Application rejected' };
  }

  /**
   * Get applications list (admin)
   */
  async getApplications(
    status?: string,
    type?: string,
    page = 1,
    limit = 20
  ): Promise<{
    applications: Array<Record<string, unknown>>;
    pagination: { page: number; limit: number; total: number; total_pages: number };
  }> {
    const { users, total } = await this.repository.findByApplicationStatus(
      status || 'pending_approval',
      type,
      page,
      limit
    );

    const applications = await Promise.all(
      users.map(async (user) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = user as any;
        const result: Record<string, unknown> = {
          id: u._id.toString(),
          email: u.email,
          first_name: u.first_name,
          last_name: u.last_name,
          phone: u.phone,
          application_status: u.application_status,
          application_type: u.application_type,
          application_note: u.application_note,
          application_rejection_reason: u.application_rejection_reason,
          application_reviewed_at: u.application_reviewed_at,
          is_verified: u.is_verified,
          created_at: u.created_at,
        };

        // Include vehicle_type for courier applications
        if (u.application_type === 'courier') {
          result.vehicle_type = u.vehicle_type;
          result.date_of_birth = u.date_of_birth;
        }

        // Include restaurant info for restaurant owner applications
        if (u.application_type === 'restaurant_owner') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const restaurant = await Restaurant.findOne({ owner_id: u._id } as any)
            .select('_id name slug address status')
            .lean();
          if (restaurant) {
            result.restaurant = {
              id: restaurant._id.toString(),
              name: restaurant.name,
              slug: restaurant.slug,
              address: restaurant.address,
              status: restaurant.status,
            };
          }
        }

        return result;
      })
    );

    return {
      applications,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Refresh access token using refresh token
   * Implements token rotation (new refresh token issued each time)
   */
  async refreshToken(refreshToken: string): Promise<TokenRefreshResponseDto> {
    // Verify the refresh token JWT
    let payload: RefreshTokenPayload;
    try {
      payload = jwt.verify(refreshToken, config.jwt.secret) as RefreshTokenPayload;
    } catch {
      throw UnauthorizedError('Invalid or expired refresh token');
    }

    // Find user and verify stored refresh token matches
    const user = await this.repository.findByIdWithRefreshToken(payload.sub);
    if (!user || user.refresh_token !== refreshToken) {
      // Token reuse detected — possible attack. Invalidate all tokens.
      if (user) {
        await this.repository.updateRefreshToken(user._id.toString(), null);
        logger.warn(`Refresh token reuse detected for user ${user._id.toString()}`);
      }
      throw UnauthorizedError('Invalid refresh token. Please login again.');
    }

    // Get roles and permissions
    const roles = await this.repository.getUserRoles(user._id.toString());
    const permissions = await this.repository.getUserPermissions(user._id.toString());

    // Generate new token pair (rotation)
    const userWithRoles: UserWithRolesAndPermissions = {
      _id: user._id,
      email: user.email,
      password_hash: '',
      first_name: user.first_name,
      last_name: user.last_name,
      preferred_language: user.preferred_language,
      status: user.status,
      is_active: user.is_active,
      is_verified: user.is_verified,
      roles: roles.map((r) => ({
        code: r,
        permissions: permissions.map((p) => ({ name: p })),
      })),
    };

    // Resolve restaurant ID for restaurant owners/staff
    const restaurantIdForRefresh = await this.resolveRestaurantId(user._id.toString(), roles);

    const tokens = this.generateTokenPair(
      userWithRoles,
      roles,
      permissions,
      restaurantIdForRefresh
    );

    // Store new refresh token (invalidates old one)
    await this.repository.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: tokens.expiresIn,
      token_type: 'Bearer',
    };
  }

  /**
   * Logout user (blacklist access token + remove refresh token)
   */
  async logout(userId: string, accessToken: string): Promise<void> {
    // Blacklist the access token in Redis until it expires
    try {
      const decoded = jwt.decode(accessToken) as JwtPayload;
      if (decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          const redis = getRedisClient();
          await redis.set(`blacklist:${accessToken}`, '1', 'EX', ttl);
        }
      }
    } catch (err) {
      // If decode fails, token is already unusable
    }

    // Remove refresh token from DB
    await this.repository.updateRefreshToken(userId, null);

    logger.info(`User logged out: ${userId}`);
  }

  /**
   * Get user profile with roles and permissions
   */
  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const roles = await this.repository.getUserRoles(userId);
    const permissions = await this.repository.getUserPermissions(userId);

    return toProfileResponseDto(user, roles, permissions);
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    data: Partial<{
      first_name: string;
      last_name: string;
      phone: string;
      preferred_language: SupportedLanguage;
    }>
  ): Promise<ProfileResponseDto> {
    const user = await this.repository.updateProfile(userId, data);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const roles = await this.repository.getUserRoles(userId);
    const permissions = await this.repository.getUserPermissions(userId);

    return toProfileResponseDto(user, roles, permissions);
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, data: PasswordChangeData): Promise<void> {
    const user = await this.repository.findByIdWithPassword(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(data.currentPassword, user.password_hash);
    if (!isPasswordValid) {
      throw BadRequestError('Current password is incorrect');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(config.bcrypt.saltRounds);
    const passwordHash = await bcrypt.hash(data.newPassword, salt);

    // Update password
    await this.repository.updatePassword(userId, passwordHash);

    // Invalidate all refresh tokens (force re-login on all devices)
    await this.repository.updateRefreshToken(userId, null);

    logger.info(`Password changed for user ${userId}`);
  }

  /**
   * Verify access token and return authenticated user
   * Checks Redis blacklist for logged out tokens
   */
  async verifyAccessToken(token: string): Promise<AuthenticatedUser> {
    // Check if token is blacklisted (user logged out)
    const redis = getRedisClient();
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      throw UnauthorizedError('Token has been revoked');
    }

    // Verify JWT
    try {
      const payload = jwt.verify(token, config.jwt.secret, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
      }) as JwtPayload;

      return {
        id: payload.sub,
        email: payload.email,
        userType: payload.userType,
        roles: payload.roles,
        permissions: payload.permissions,
        restaurantId: payload.restaurantId,
        lang: payload.lang,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw UnauthorizedError('Token has expired');
      }
      throw UnauthorizedError('Invalid token');
    }
  }

  // ===================================================
  // Email Verification Methods
  // ===================================================

  /**
   * Verify user email using token
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.repository.findByEmailVerificationToken(token);
    if (!user) {
      throw BadRequestError('Invalid or expired verification token');
    }

    const updatedUser = await this.repository.verifyEmail(user._id.toString());
    if (!updatedUser) {
      throw new AppError('Failed to verify email', 500);
    }

    // Send welcome email via queue
    enqueueWelcomeEmail(user.email, user.first_name).catch((err) => {
      logger.error('Failed to enqueue welcome email', { email: user.email, error: err });
    });

    logger.info(`Email verified for user ${user.email}`);

    return { message: 'Email verified successfully. You can now log in.' };
  }

  /**
   * Resend email verification
   */
  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await this.repository.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not for security
      return { message: 'If your email is registered, you will receive a verification email.' };
    }

    if (user.is_verified) {
      return { message: 'Email is already verified.' };
    }

    // Generate new verification token
    const verificationToken = this.generateSecureToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.repository.setEmailVerificationToken(
      user._id.toString(),
      verificationToken,
      tokenExpiry
    );

    // Send verification email via queue
    const resendVerificationUrl = `${config.frontend.baseUrl}${config.frontend.verifyEmailPath}?token=${verificationToken}`;
    enqueueVerificationEmail(email, user.first_name, resendVerificationUrl).catch((err) => {
      logger.error('Failed to enqueue verification email', { email, error: err });
    });
    logger.info(`Verification token for ${email}: ${verificationToken}`);

    return { message: 'If your email is registered, you will receive a verification email.' };
  }

  // ===================================================
  // Password Reset Methods
  // ===================================================

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.repository.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not for security
      return { message: 'If your email is registered, you will receive a password reset email.' };
    }

    const resetToken = this.generateSecureToken();
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.repository.setPasswordResetToken(user._id.toString(), resetToken, tokenExpiry);

    // Send password reset email via queue
    const resetUrl = `${config.frontend.baseUrl}${config.frontend.resetPasswordPath}?token=${resetToken}`;
    enqueuePasswordResetEmail(email, user.first_name, resetUrl).catch((err) => {
      logger.error('Failed to enqueue password reset email', { email, error: err });
    });
    logger.info(`Password reset token for ${email}: ${resetToken}`);

    return { message: 'If your email is registered, you will receive a password reset email.' };
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.repository.findByPasswordResetToken(token);
    if (!user) {
      throw BadRequestError('Invalid or expired password reset token');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(config.bcrypt.saltRounds);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    await this.repository.updatePassword(user._id.toString(), passwordHash);

    // Clear reset token
    await this.repository.clearPasswordResetToken(user._id.toString());

    // Invalidate all refresh tokens (force re-login on all devices)
    await this.repository.updateRefreshToken(user._id.toString(), null);

    logger.info(`Password reset successful for ${user.email}`);

    return {
      message: 'Password has been reset successfully. You can now log in with your new password.',
    };
  }

  // ===================================================
  // Private Helpers
  // ===================================================

  /**
   * Resolve the restaurant ID for restaurant_owner / restaurant_staff users.
   * Queries the Restaurant collection by owner_id to populate the JWT claim.
   */
  private async resolveRestaurantId(userId: string, roles: string[]): Promise<string | undefined> {
    const restaurantRoles = ['restaurant_owner', 'restaurant_staff'];
    if (!roles.some((r) => restaurantRoles.includes(r))) {
      return undefined;
    }

    const restaurant = await Restaurant.findOne({ owner_id: userId } as any).select('_id').lean();

    return restaurant ? restaurant._id.toString() : undefined;
  }

  /**
   * Generate access and refresh token pair
   */
  private generateTokenPair(
    user: UserWithRolesAndPermissions,
    roles: string[],
    permissions: string[],
    restaurantId?: string
  ): TokenPair {
    const accessExpiresIn = this.parseExpiration(config.jwt.accessExpiration);
    const refreshExpiresIn = this.parseExpiration(config.jwt.refreshExpiration);

    // Access token payload
    const accessPayload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      userType: this.resolveUserType(roles),
      roles,
      permissions,
      restaurantId,
      lang: user.preferred_language,
    };

    // Generate access token
    const accessToken = jwt.sign(accessPayload, config.jwt.secret, {
      expiresIn: accessExpiresIn,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });

    // Refresh token payload (minimal)
    const refreshPayload = {
      sub: user._id.toString(),
      tokenId: uuidv4(),
    };

    // Generate refresh token
    const refreshToken = jwt.sign(refreshPayload, config.jwt.secret, {
      expiresIn: refreshExpiresIn,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
    };
  }

  /**
   * Resolve user type from roles
   * Priority: super_admin > platform_admin > support_agent > restaurant_owner >
   * restaurant_staff > courier > customer
   */
  private resolveUserType(roles: string[]): UserType {
    if (roles.includes('super_admin')) return 'super_admin';
    if (roles.includes('platform_admin')) return 'platform_admin';
    if (roles.includes('support_agent')) return 'support_agent';
    if (roles.includes('restaurant_owner')) return 'restaurant_owner';
    if (roles.includes('restaurant_staff')) return 'restaurant_staff';
    if (roles.includes('courier')) return 'courier';
    return 'customer';
  }

  /**
   * Extract unique permissions from roles
   */
  private extractPermissions(
    roles: Array<{ code: string; permissions: Array<{ name: string }> }>
  ): string[] {
    const permissions = new Set<string>();
    roles.forEach((role) => {
      role.permissions.forEach((p) => permissions.add(p.name));
    });
    return Array.from(permissions);
  }

  /**
   * Parse expiration string to seconds
   */
  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return 900;
    }
  }

  /**
   * Generate a URL-safe slug from a name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacritics
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100)
      + '-' + Date.now().toString(36);
  }

  /**
   * Generate a secure random token (64 hex chars = 32 bytes)
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

// Export singleton instance
export const authService = new AuthService(authRepository);
