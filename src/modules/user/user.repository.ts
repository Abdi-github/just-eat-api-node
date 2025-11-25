import mongoose from 'mongoose';

import { User, type IUser, USER_STATUSES } from './user.model.js';
import { UserRole } from '../admin/user-role.model.js';
import { Role } from '../admin/role.model.js';
// Ensure Permission model is registered for population
import '../admin/permission.model.js';

import type {
  UserQueryDto,
  UserFilter,
  UserResponseDto,
  UserFindResult,
  UserStatisticsDto,
  UserSettingsResponseDto,
  UserSettingsUpdateDto,
  UserProfileUpdateDto,
  UserAdminUpdateDto,
  PopulatedUserRole,
  RoleResponseDto,
  USER_SORT_FIELDS,
} from './user.types.js';

/**
 * User Repository
 * Handles all database operations related to users
 */
export class UserRepository {
  // ============================================================================
  // Query Helpers
  // ============================================================================

  /**
   * Build MongoDB filter from query DTO
   */
  private buildFilter(query: UserQueryDto): UserFilter {
    const filter: UserFilter = {};

    if (query.status) {
      filter.status = query.status;
    }

    if (query.is_active !== undefined) {
      filter.is_active = query.is_active;
    }

    if (query.is_verified !== undefined) {
      filter.is_verified = query.is_verified;
    }

    if (query.search) {
      filter.$or = [
        { first_name: { $regex: query.search, $options: 'i' } },
        { last_name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
      ];
    }

    return filter;
  }

  /**
   * Build MongoDB sort object from query DTO
   */
  private buildSort(query: UserQueryDto): Record<string, 1 | -1> {
    const sortField = query.sort || 'created_at';
    const sortOrder = query.order === 'asc' ? 1 : -1;
    return { [sortField]: sortOrder };
  }

  // ============================================================================
  // DTO Transformers
  // ============================================================================

  /**
   * Transform a user document + roles into a UserResponseDto
   */
  private toUserResponseDto(
    user: IUser | Record<string, unknown>,
    roles: RoleResponseDto[] = [],
    permissions: string[] = []
  ): UserResponseDto {
    const doc = user as Record<string, unknown>;
    const id = (doc._id as mongoose.Types.ObjectId).toString();
    const firstName = doc.first_name as string;
    const lastName = doc.last_name as string;

    return {
      id,
      email: doc.email as string,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      phone: doc.phone as string | undefined,
      avatar_url: doc.avatar_url as string | undefined,
      preferred_language: doc.preferred_language as string,
      notification_preferences:
        doc.notification_preferences as UserResponseDto['notification_preferences'],
      status: doc.status as string,
      is_active: doc.is_active as boolean,
      is_verified: doc.is_verified as boolean,
      verified_at: doc.verified_at as Date | undefined,
      last_login_at: doc.last_login_at as Date | undefined,
      roles,
      permissions,
      created_at: doc.created_at as Date,
      updated_at: doc.updated_at as Date,
    };
  }

  /**
   * Get roles and permissions for a user
   */
  private async getUserRolesAndPermissions(
    userId: mongoose.Types.ObjectId | string
  ): Promise<{ roles: RoleResponseDto[]; permissions: string[] }> {
    const userRoles = await UserRole.find({
      user_id: new mongoose.Types.ObjectId(userId.toString()),
      $or: [{ is_active: true }, { is_active: { $exists: false } }],
      $and: [{ $or: [{ expires_at: { $exists: false } }, { expires_at: { $gt: new Date() } }] }],
    })
      .populate({
        path: 'role_id',
        match: { is_active: { $ne: false } },
        populate: {
          path: 'permissions',
          match: { is_active: { $ne: false } },
          select: 'resource action',
        },
      })
      .lean();

    const typedUserRoles = userRoles as unknown as PopulatedUserRole[];
    const roles: RoleResponseDto[] = [];
    const permissionSet = new Set<string>();

    typedUserRoles.forEach((ur) => {
      if (ur.role_id) {
        roles.push({
          id: ur.role_id._id.toString(),
          name: ur.role_id.name,
          code: ur.role_id.name, // Role model uses 'name' as the code
        });

        ur.role_id.permissions?.forEach((p: any) => {
          // Virtual 'name' is not available in lean() results, build from resource:action
          const permName = p.name || `${p.resource}:${p.action}`;
          if (permName) permissionSet.add(permName);
        });
      }
    });

    return { roles, permissions: Array.from(permissionSet) };
  }

  // ============================================================================
  // Read Operations
  // ============================================================================

  /**
   * Find all users with filtering, sorting, and pagination (admin)
   */
  async findAll(query: UserQueryDto): Promise<UserFindResult> {
    const filter = this.buildFilter(query);
    const sort = this.buildSort(query);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);

    // Fetch roles and permissions for each user
    const data: UserResponseDto[] = await Promise.all(
      users.map(async (user) => {
        const { roles, permissions } = await this.getUserRolesAndPermissions(user._id);
        return this.toUserResponseDto(user, roles, permissions);
      })
    );

    return { data, total };
  }

  /**
   * Find user by ID and return as DTO
   */
  async findById(id: string): Promise<UserResponseDto | null> {
    const user = await User.findById(id).lean();
    if (!user) return null;

    const { roles, permissions } = await this.getUserRolesAndPermissions(user._id);
    return this.toUserResponseDto(user, roles, permissions);
  }

  /**
   * Find user by email and return as DTO
   */
  async findByEmail(email: string): Promise<UserResponseDto | null> {
    const user = await User.findOne({ email: email.toLowerCase() }).lean();
    if (!user) return null;

    const { roles, permissions } = await this.getUserRolesAndPermissions(user._id);
    return this.toUserResponseDto(user, roles, permissions);
  }

  /**
   * Check if email exists (excluding a specific user ID for updates)
   */
  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    const filter: Record<string, unknown> = { email: email.toLowerCase() };
    if (excludeUserId) {
      filter._id = { $ne: new mongoose.Types.ObjectId(excludeUserId) };
    }
    const user = await User.findOne(filter).select('_id').lean();
    return !!user;
  }

  // ============================================================================
  // Create Operations
  // ============================================================================

  /**
   * Create a new user (admin)
   */
  async create(data: {
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    phone?: string;
    preferred_language?: string;
    status?: string;
    is_active?: boolean;
  }): Promise<UserResponseDto> {
    const user = new User({
      ...data,
      email: data.email.toLowerCase(),
      status: data.status || 'pending',
      is_active: data.is_active ?? true,
      is_verified: false,
    });

    const savedUser = await user.save();
    const userObj = savedUser.toObject();
    return this.toUserResponseDto(userObj);
  }

  // ============================================================================
  // Update Operations
  // ============================================================================

  /**
   * Update user profile (self)
   */
  async updateProfile(userId: string, data: UserProfileUpdateDto): Promise<UserResponseDto | null> {
    const user = await User.findByIdAndUpdate(userId, data, {
      returnDocument: 'after',
    }).lean();

    if (!user) return null;

    const { roles, permissions } = await this.getUserRolesAndPermissions(user._id);
    return this.toUserResponseDto(user, roles, permissions);
  }

  /**
   * Update user (admin)
   */
  async updateAdmin(userId: string, data: UserAdminUpdateDto): Promise<UserResponseDto | null> {
    const user = await User.findByIdAndUpdate(userId, data, {
      returnDocument: 'after',
    }).lean();

    if (!user) return null;

    const { roles, permissions } = await this.getUserRolesAndPermissions(user._id);
    return this.toUserResponseDto(user, roles, permissions);
  }

  /**
   * Update user status
   */
  async updateStatus(
    userId: string,
    status: string,
    isActive?: boolean
  ): Promise<UserResponseDto | null> {
    const updateData: Record<string, unknown> = { status };
    if (isActive !== undefined) {
      updateData.is_active = isActive;
    }

    const user = await User.findByIdAndUpdate(userId, updateData, {
      returnDocument: 'after',
    }).lean();

    if (!user) return null;

    const { roles, permissions } = await this.getUserRolesAndPermissions(user._id);
    return this.toUserResponseDto(user, roles, permissions);
  }

  /**
   * Update notification preferences
   */
  async updateSettings(
    userId: string,
    data: UserSettingsUpdateDto
  ): Promise<UserSettingsResponseDto | null> {
    const updateData: Record<string, unknown> = {};

    if (data.email_order_updates !== undefined) {
      updateData['notification_preferences.email_order_updates'] = data.email_order_updates;
    }
    if (data.email_promotions !== undefined) {
      updateData['notification_preferences.email_promotions'] = data.email_promotions;
    }
    if (data.email_newsletter !== undefined) {
      updateData['notification_preferences.email_newsletter'] = data.email_newsletter;
    }
    if (data.push_enabled !== undefined) {
      updateData['notification_preferences.push_enabled'] = data.push_enabled;
    }

    const user = await User.findByIdAndUpdate(userId, updateData, {
      returnDocument: 'after',
    }).lean();

    if (!user) return null;

    return {
      notification_preferences: user.notification_preferences,
      preferred_language: user.preferred_language,
    };
  }

  // ============================================================================
  // Delete Operations
  // ============================================================================

  /**
   * Delete user (admin)
   */
  async delete(userId: string): Promise<boolean> {
    const result = await User.findByIdAndDelete(userId);
    if (result) {
      // Clean up user roles
      await UserRole.deleteMany({ user_id: new mongoose.Types.ObjectId(userId) });
    }
    return !!result;
  }

  // ============================================================================
  // Role Management
  // ============================================================================

  /**
   * Assign a role to a user
   */
  async assignRole(userId: string, roleId: string, assignedBy?: string): Promise<void> {
    const existing = await UserRole.findOne({
      user_id: new mongoose.Types.ObjectId(userId),
      role_id: new mongoose.Types.ObjectId(roleId),
    });

    if (existing) {
      // Reactivate if deactivated
      if (!existing.is_active) {
        existing.is_active = true;
        existing.assigned_by = assignedBy ? new mongoose.Types.ObjectId(assignedBy) : undefined;
        existing.assigned_at = new Date();
        await existing.save();
      }
      return;
    }

    await UserRole.create({
      user_id: new mongoose.Types.ObjectId(userId),
      role_id: new mongoose.Types.ObjectId(roleId),
      assigned_by: assignedBy ? new mongoose.Types.ObjectId(assignedBy) : undefined,
      assigned_at: new Date(),
      is_active: true,
    });
  }

  /**
   * Remove a role from a user
   */
  async removeRole(userId: string, roleId: string): Promise<boolean> {
    const result = await UserRole.findOneAndDelete({
      user_id: new mongoose.Types.ObjectId(userId),
      role_id: new mongoose.Types.ObjectId(roleId),
    });
    return !!result;
  }

  /**
   * Find a role by its name/code
   */
  async findRoleByName(
    name: string
  ): Promise<{ _id: mongoose.Types.ObjectId; name: string } | null> {
    return Role.findOne({ name, is_active: true }).select('_id name').lean();
  }

  // ============================================================================
  // Settings & Preferences
  // ============================================================================

  /**
   * Get user settings (notification preferences + language)
   */
  async getSettings(userId: string): Promise<UserSettingsResponseDto | null> {
    const user = await User.findById(userId)
      .select('notification_preferences preferred_language')
      .lean();

    if (!user) return null;

    return {
      notification_preferences: user.notification_preferences,
      preferred_language: user.preferred_language,
    };
  }

  // ============================================================================
  // Statistics (Admin)
  // ============================================================================

  /**
   * Get user statistics for admin dashboard
   */
  async getStatistics(): Promise<UserStatisticsDto> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [total, byStatusResult, active, verified, newLast30Days] = await Promise.all([
      User.countDocuments(),
      User.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      User.countDocuments({ is_active: true }),
      User.countDocuments({ is_verified: true }),
      User.countDocuments({ created_at: { $gte: thirtyDaysAgo } }),
    ]);

    const by_status: Record<string, number> = {};
    // Initialize all statuses to 0
    USER_STATUSES.forEach((s) => {
      by_status[s] = 0;
    });
    // Fill with actual counts
    byStatusResult.forEach((item: { _id: string; count: number }) => {
      by_status[item._id] = item.count;
    });

    return {
      total,
      by_status,
      active,
      verified,
      new_last_30_days: newLast30Days,
    };
  }

  /**
   * Check if a user exists by ID
   */
  async exists(userId: string): Promise<boolean> {
    const user = await User.findById(userId).select('_id').lean();
    return !!user;
  }
}

// Export singleton instance
export const userRepository = new UserRepository();
