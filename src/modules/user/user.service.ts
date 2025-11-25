import bcrypt from 'bcryptjs';

import { UserRepository, userRepository } from './user.repository.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../shared/errors/AppError.js';
import { cloudinaryService, CLOUDINARY_FOLDERS } from '../../shared/services/cloudinary.service.js';

import type {
  UserQueryDto,
  UserResponseDto,
  UserFindResult,
  UserProfileUpdateDto,
  UserAdminUpdateDto,
  UserSettingsUpdateDto,
  UserSettingsResponseDto,
  UserStatisticsDto,
  UserCreateDto,
  UserPasswordChangeDto,
} from './user.types.js';

import { User } from './user.model.js';

/**
 * User Service
 * Handles all business logic related to user management
 */
export class UserService {
  constructor(private repository: UserRepository) {}

  // ============================================================================
  // Admin Operations
  // ============================================================================

  /**
   * Get all users with filtering, sorting, and pagination (admin)
   */
  async findAll(query: UserQueryDto): Promise<UserFindResult> {
    return this.repository.findAll(query);
  }

  /**
   * Get user by ID (admin or self)
   */
  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw NotFoundError('User not found');
    }
    return user;
  }

  /**
   * Create a new user (admin)
   */
  async create(data: UserCreateDto): Promise<UserResponseDto> {
    // Check for duplicate email
    const emailExists = await this.repository.emailExists(data.email);
    if (emailExists) {
      throw ConflictError('A user with this email already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(data.password, salt);

    const user = await this.repository.create({
      email: data.email,
      password_hash,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      preferred_language: data.preferred_language,
      status: data.status,
      is_active: data.is_active,
    });

    return user;
  }

  /**
   * Update user (admin)
   */
  async updateAdmin(userId: string, data: UserAdminUpdateDto): Promise<UserResponseDto> {
    // Verify user exists
    const exists = await this.repository.exists(userId);
    if (!exists) {
      throw NotFoundError('User not found');
    }

    const user = await this.repository.updateAdmin(userId, data);
    if (!user) {
      throw NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Update user status (admin)
   */
  async updateStatus(userId: string, status: string, isActive?: boolean): Promise<UserResponseDto> {
    const exists = await this.repository.exists(userId);
    if (!exists) {
      throw NotFoundError('User not found');
    }

    const user = await this.repository.updateStatus(userId, status, isActive);
    if (!user) {
      throw NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Activate a user (admin)
   */
  async activate(userId: string): Promise<UserResponseDto> {
    return this.updateStatus(userId, 'active', true);
  }

  /**
   * Suspend a user (admin)
   */
  async suspend(userId: string): Promise<UserResponseDto> {
    return this.updateStatus(userId, 'suspended', false);
  }

  /**
   * Delete a user (admin)
   */
  async delete(userId: string): Promise<void> {
    const exists = await this.repository.exists(userId);
    if (!exists) {
      throw NotFoundError('User not found');
    }

    const deleted = await this.repository.delete(userId);
    if (!deleted) {
      throw NotFoundError('User not found');
    }
  }

  /**
   * Get user statistics (admin dashboard)
   */
  async getStatistics(): Promise<UserStatisticsDto> {
    return this.repository.getStatistics();
  }

  // ============================================================================
  // Role Management (Admin)
  // ============================================================================

  /**
   * Assign a role to a user
   */
  async assignRole(userId: string, roleName: string, assignedBy: string): Promise<UserResponseDto> {
    const exists = await this.repository.exists(userId);
    if (!exists) {
      throw NotFoundError('User not found');
    }

    const role = await this.repository.findRoleByName(roleName);
    if (!role) {
      throw NotFoundError(`Role '${roleName}' not found`);
    }

    await this.repository.assignRole(userId, role._id.toString(), assignedBy);

    const user = await this.repository.findById(userId);
    if (!user) {
      throw NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Remove a role from a user
   */
  async removeRole(userId: string, roleName: string): Promise<UserResponseDto> {
    const exists = await this.repository.exists(userId);
    if (!exists) {
      throw NotFoundError('User not found');
    }

    const role = await this.repository.findRoleByName(roleName);
    if (!role) {
      throw NotFoundError(`Role '${roleName}' not found`);
    }

    const removed = await this.repository.removeRole(userId, role._id.toString());
    if (!removed) {
      throw BadRequestError('User does not have this role');
    }

    const user = await this.repository.findById(userId);
    if (!user) {
      throw NotFoundError('User not found');
    }

    return user;
  }

  // ============================================================================
  // Profile Operations (Self)
  // ============================================================================

  /**
   * Get own profile
   */
  async getProfile(userId: string): Promise<UserResponseDto> {
    return this.findById(userId);
  }

  /**
   * Update own profile
   */
  async updateProfile(userId: string, data: UserProfileUpdateDto): Promise<UserResponseDto> {
    const user = await this.repository.updateProfile(userId, data);
    if (!user) {
      throw NotFoundError('User not found');
    }
    return user;
  }

  /**
   * Change own password
   */
  async changePassword(userId: string, data: UserPasswordChangeDto): Promise<void> {
    const user = await User.findById(userId).select('+password_hash');
    if (!user) {
      throw NotFoundError('User not found');
    }

    // Verify current password
    const isValid = await user.comparePassword(data.current_password);
    if (!isValid) {
      throw BadRequestError('Current password is incorrect');
    }

    // Hash new password and update
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(data.new_password, salt);

    user.password_hash = hashedPassword;
    user.password_changed_at = new Date();
    await user.save();
  }

  /**
   * Deactivate own account
   */
  async deactivateAccount(userId: string): Promise<void> {
    const exists = await this.repository.exists(userId);
    if (!exists) {
      throw NotFoundError('User not found');
    }

    await this.repository.updateStatus(userId, 'inactive', false);
  }

  // ============================================================================
  // Settings Operations (Self)
  // ============================================================================

  /**
   * Get user settings (notification preferences)
   */
  async getSettings(userId: string): Promise<UserSettingsResponseDto> {
    const settings = await this.repository.getSettings(userId);
    if (!settings) {
      throw NotFoundError('User not found');
    }
    return settings;
  }

  /**
   * Update user settings (notification preferences)
   */
  async updateSettings(
    userId: string,
    data: UserSettingsUpdateDto
  ): Promise<UserSettingsResponseDto> {
    const settings = await this.repository.updateSettings(userId, data);
    if (!settings) {
      throw NotFoundError('User not found');
    }
    return settings;
  }

  // ============================================================================
  // Avatar Operations (Self)
  // ============================================================================

  /**
   * Upload user avatar
   */
  async uploadAvatar(
    userId: string,
    buffer: Buffer,
    originalname: string
  ): Promise<{ url: string; thumbnail_url?: string }> {
    const user = await this.repository.findById(userId);
    if (!user) throw NotFoundError('User not found');

    // Delete old avatar if it exists
    if (user.avatar_url) {
      const oldPublicId = cloudinaryService.extractPublicId(user.avatar_url);
      if (oldPublicId) await cloudinaryService.deleteSingle(oldPublicId);
    }

    // Upload new avatar
    const result = await cloudinaryService.uploadSingle(buffer, originalname, {
      folder: CLOUDINARY_FOLDERS.users.avatars,
      preset: 'avatar',
      publicId: `${userId}_avatar`,
      tags: ['user', 'avatar', userId],
      overwrite: true,
    });

    // Update user with new URL
    await this.repository.updateProfile(userId, { avatar_url: result.url });

    return { url: result.url, thumbnail_url: result.thumbnail_url };
  }

  /**
   * Delete user avatar
   */
  async deleteAvatar(userId: string): Promise<void> {
    const user = await this.repository.findById(userId);
    if (!user) throw NotFoundError('User not found');

    if (user.avatar_url) {
      const publicId = cloudinaryService.extractPublicId(user.avatar_url);
      if (publicId) await cloudinaryService.deleteSingle(publicId);
    }

    await this.repository.updateProfile(userId, { avatar_url: '' });
  }
}

// Export singleton instance
export const userService = new UserService(userRepository);
