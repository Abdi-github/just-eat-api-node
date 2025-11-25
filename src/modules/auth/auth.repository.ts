import mongoose from 'mongoose';

import { Role } from '../admin/role.model.js';
import { UserRole } from '../admin/user-role.model.js';
import { User, IUser } from '../user/user.model.js';
// Import Permission model to ensure it's registered before population
import '../admin/permission.model.js';

import {
  UserWithRolesAndPermissions,
  SupportedLanguage,
  PopulatedUserRoleDoc,
} from './auth.types.js';

/**
 * Auth Repository
 * Handles all database operations related to authentication
 */
export class AuthRepository {
  /**
   * Find user by email (includes password_hash for authentication)
   */
  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() }).select('+password_hash');
  }

  /**
   * Find user by email with roles and permissions
   */
  async findByEmailWithRoles(email: string): Promise<UserWithRolesAndPermissions | null> {
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password_hash +refresh_token')
      .lean();

    if (!user) return null;

    // Get user's roles with permissions
    const userRoles = await UserRole.find({
      user_id: user._id,
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

    // Extract roles with their permissions
    const typedUserRoles = userRoles as unknown as PopulatedUserRoleDoc[];
    const roles = typedUserRoles
      .filter((ur) => ur.role_id !== null)
      .map((ur) => ({
        code: ur.role_id!.name,
        permissions: (ur.role_id!.permissions ?? []).map((p) => ({
          name: `${p.resource}:${p.action}`,
        })),
      }));

    return {
      ...user,
      roles,
    } as UserWithRolesAndPermissions;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<IUser | null> {
    return User.findById(id);
  }

  /**
   * Find user by ID with password (for password change)
   */
  async findByIdWithPassword(id: string): Promise<IUser | null> {
    return User.findById(id).select('+password_hash');
  }

  /**
   * Find user by ID with refresh token
   */
  async findByIdWithRefreshToken(id: string): Promise<IUser | null> {
    return User.findById(id).select('+refresh_token');
  }

  /**
   * Find user by refresh token
   */
  async findByRefreshToken(refreshToken: string): Promise<IUser | null> {
    return User.findOne({ refresh_token: refreshToken }).select('+refresh_token');
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const user = await User.findOne({ email: email.toLowerCase() }).select('_id').lean();
    return !!user;
  }

  /**
   * Create a new user
   */
  async create(userData: {
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    phone?: string;
    preferred_language?: SupportedLanguage;
    status?: 'active' | 'pending';
    vehicle_type?: string;
    date_of_birth?: Date;
    application_status?: string;
    application_type?: string;
    application_note?: string;
  }): Promise<IUser> {
    const user = new User({
      ...userData,
      email: userData.email.toLowerCase(),
      status: userData.status ?? 'pending',
      is_active: true,
      is_verified: false,
    });
    return user.save();
  }

  /**
   * Update user's refresh token
   */
  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      refresh_token: refreshToken,
    });
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      last_login_at: new Date(),
    });
  }

  /**
   * Update user's password
   */
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      password_hash: passwordHash,
      password_changed_at: new Date(),
    });
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
  ): Promise<IUser | null> {
    return User.findByIdAndUpdate(userId, data, { returnDocument: 'after' });
  }

  /**
   * Get user's roles
   */
  async getUserRoles(userId: string): Promise<string[]> {
    const userRoles = await UserRole.find({
      user_id: new mongoose.Types.ObjectId(userId),
      is_active: { $ne: false },
      $or: [{ expires_at: { $exists: false } }, { expires_at: { $gt: new Date() } }],
    })
      .populate({
        path: 'role_id',
        match: { is_active: { $ne: false } },
        select: 'name',
      })
      .lean();

    const typedUserRoles = userRoles as unknown as PopulatedUserRoleDoc[];
    return typedUserRoles.filter((ur) => ur.role_id !== null).map((ur) => ur.role_id!.name);
  }

  /**
   * Get user's permissions (from all roles)
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const userRoles = await UserRole.find({
      user_id: new mongoose.Types.ObjectId(userId),
      is_active: { $ne: false },
      $or: [{ expires_at: { $exists: false } }, { expires_at: { $gt: new Date() } }],
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

    const permissions = new Set<string>();
    const typedUserRoles = userRoles as unknown as PopulatedUserRoleDoc[];
    typedUserRoles.forEach((ur) => {
      if (ur.role_id?.permissions) {
        ur.role_id.permissions.forEach((p) => permissions.add(`${p.resource}:${p.action}`));
      }
    });

    return Array.from(permissions);
  }

  /**
   * Assign default role (customer) to new user
   */
  async assignDefaultRole(userId: string): Promise<void> {
    const defaultRole = await Role.findOne({ name: 'customer', is_active: true });

    if (defaultRole) {
      await UserRole.create({
        user_id: new mongoose.Types.ObjectId(userId),
        role_id: defaultRole._id,
        is_active: true,
        assigned_at: new Date(),
      });
    }
  }

  /**
   * Assign a specific role to a user by role name
   */
  async assignRole(userId: string, roleName: string): Promise<void> {
    const role = await Role.findOne({ name: roleName, is_active: true });

    if (role) {
      // Avoid duplicate role assignment
      const existing = await UserRole.findOne({
        user_id: new mongoose.Types.ObjectId(userId),
        role_id: role._id,
      });
      if (!existing) {
        await UserRole.create({
          user_id: new mongoose.Types.ObjectId(userId),
          role_id: role._id,
          is_active: true,
          assigned_at: new Date(),
        });
      }
    }
  }

  /**
   * Update application status fields on a user
   */
  async updateApplicationStatus(
    userId: string,
    data: {
      application_status: string;
      application_reviewed_by?: string;
      application_reviewed_at?: Date;
      application_rejection_reason?: string;
    }
  ): Promise<IUser | null> {
    const updateData: Record<string, unknown> = {
      application_status: data.application_status,
    };
    if (data.application_reviewed_by) {
      updateData.application_reviewed_by = new mongoose.Types.ObjectId(data.application_reviewed_by);
    }
    if (data.application_reviewed_at) {
      updateData.application_reviewed_at = data.application_reviewed_at;
    }
    if (data.application_rejection_reason !== undefined) {
      updateData.application_rejection_reason = data.application_rejection_reason;
    }
    return User.findByIdAndUpdate(userId, updateData, { returnDocument: 'after' });
  }

  /**
   * Find users by application status with pagination
   */
  async findByApplicationStatus(
    status: string,
    applicationType?: string,
    page = 1,
    limit = 20
  ): Promise<{ users: IUser[]; total: number }> {
    const filter: Record<string, unknown> = { application_status: status };
    if (applicationType) {
      filter.application_type = applicationType;
    }
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean() as unknown as IUser[];
    return { users, total };
  }

  // ===================================================
  // Email Verification Methods
  // ===================================================

  /**
   * Set email verification token
   */
  async setEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      email_verification_token: token,
      email_verification_expires: expiresAt,
    });
  }

  /**
   * Find user by email verification token
   */
  async findByEmailVerificationToken(token: string): Promise<IUser | null> {
    return User.findOne({
      email_verification_token: token,
      email_verification_expires: { $gt: new Date() },
    }).select('+email_verification_token +email_verification_expires');
  }

  /**
   * Verify user email
   */
  async verifyEmail(userId: string): Promise<IUser | null> {
    return User.findByIdAndUpdate(
      userId,
      {
        is_verified: true,
        verified_at: new Date(),
        status: 'active',
        $unset: {
          email_verification_token: 1,
          email_verification_expires: 1,
        },
      },
      { returnDocument: 'after' }
    );
  }

  // ===================================================
  // Password Reset Methods
  // ===================================================

  /**
   * Set password reset token
   */
  async setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      password_reset_token: token,
      password_reset_expires: expiresAt,
    });
  }

  /**
   * Find user by password reset token
   */
  async findByPasswordResetToken(token: string): Promise<IUser | null> {
    return User.findOne({
      password_reset_token: token,
      password_reset_expires: { $gt: new Date() },
    }).select('+password_reset_token +password_reset_expires');
  }

  /**
   * Clear password reset token after use
   */
  async clearPasswordResetToken(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      $unset: {
        password_reset_token: 1,
        password_reset_expires: 1,
      },
    });
  }
}

// Export singleton instance
export const authRepository = new AuthRepository();
