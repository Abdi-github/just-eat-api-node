import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

import { UnauthorizedError, ForbiddenError } from '../../shared/errors/AppError.js';
import { logger } from '../../shared/logger/index.js';

import { authService } from './auth.service.js';
import { AuthenticatedRequest, UserType, ADMIN_USER_TYPES } from './auth.types.js';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const handleAuth = async (): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw UnauthorizedError('Unauthenticated. Please login.');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw UnauthorizedError('Invalid token format');
    }

    // Verify token and get user
    const user = await authService.verifyAccessToken(token);

    // Attach user to request
    (req as AuthenticatedRequest).user = user;
  };

  handleAuth()
    .then(() => next())
    .catch(next);
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require it
 */
export const optionalAuthenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const handleAuth = async (): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          const user = await authService.verifyAccessToken(token);
          (req as AuthenticatedRequest).user = user;
        } catch (error) {
          logger.debug('Optional auth: Invalid token', { error });
        }
      }
    }
  };

  handleAuth()
    .then(() => next())
    .catch(next);
};

/**
 * Check if a user has a specific permission
 * Supports wildcard (*) for super admin access
 */
const checkPermission = (userPermissions: string[], requiredPermission: string): boolean => {
  // Wildcard grants all permissions
  if (userPermissions.includes('*')) {
    return true;
  }

  // Direct permission match
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Resource wildcard (e.g., 'restaurants:*' grants 'restaurants:read')
  const [resource] = requiredPermission.split(':');
  if (userPermissions.includes(`${resource}:*`)) {
    return true;
  }

  // 'manage' permission grants all actions for a resource
  if (userPermissions.includes(`${resource}:manage`)) {
    return true;
  }

  return false;
};

/**
 * Authorization middleware factory
 * Checks if user has at least one of the required permission(s)
 */
export const requirePermission = (...permissions: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return next(UnauthorizedError('Authentication required'));
    }

    const hasPermission = permissions.some((permission) =>
      checkPermission(authReq.user.permissions, permission)
    );

    if (!hasPermission) {
      logger.warn(
        `Access denied: User ${authReq.user.id} lacks permissions: ${permissions.join(', ')}`
      );
      return next(ForbiddenError('You do not have permission to perform this action'));
    }

    next();
  };
};

/**
 * Authorization middleware factory
 * Checks if user has ALL required permissions
 */
export const requireAllPermissions = (...permissions: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return next(UnauthorizedError('Authentication required'));
    }

    const hasAllPermissions = permissions.every((permission) =>
      checkPermission(authReq.user.permissions, permission)
    );

    if (!hasAllPermissions) {
      logger.warn(
        `Access denied: User ${authReq.user.id} lacks all permissions: ${permissions.join(', ')}`
      );
      return next(ForbiddenError('You do not have permission to perform this action'));
    }

    next();
  };
};

/**
 * Authorization middleware factory
 * Checks if user has required role(s)
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return next(UnauthorizedError('Authentication required'));
    }

    const hasRole = roles.some((role) => authReq.user.roles.includes(role));

    if (!hasRole) {
      logger.warn(`Access denied: User ${authReq.user.id} lacks roles: ${roles.join(', ')}`);
      return next(ForbiddenError('You do not have the required role'));
    }

    next();
  };
};

/**
 * Authorization middleware factory
 * Checks if user has required user type(s)
 */
export const requireUserType = (...userTypes: UserType[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return next(UnauthorizedError('Authentication required'));
    }

    if (!userTypes.includes(authReq.user.userType)) {
      logger.warn(
        `Access denied: User ${authReq.user.id} has type ${authReq.user.userType}, required: ${userTypes.join(', ')}`
      );
      return next(ForbiddenError('Access denied for your user type'));
    }

    next();
  };
};

/**
 * Require admin access middleware
 * Only allows super_admin and platform_admin user types
 */
export const requireAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user) {
    return next(UnauthorizedError('Authentication required'));
  }

  if (!ADMIN_USER_TYPES.includes(authReq.user.userType)) {
    logger.warn(
      `Admin access denied: User ${authReq.user.id} (type: ${authReq.user.userType}) attempted to access admin panel`
    );
    return next(
      ForbiddenError('Access denied. Admin panel is restricted to platform administrators only.')
    );
  }

  next();
};

/**
 * Self or admin access middleware
 * Allows access if user is accessing their own resource or is an admin
 */
export const selfOrAdmin = (userIdParam: string = 'userId') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return next(UnauthorizedError('Authentication required'));
    }

    const targetUserId = req.params[userIdParam];
    const adminTypes: UserType[] = ['super_admin', 'platform_admin'];

    // Allow if accessing own resource or is admin
    if (authReq.user.id === targetUserId || adminTypes.includes(authReq.user.userType)) {
      return next();
    }

    logger.warn(`Access denied: User ${authReq.user.id} attempted to access user ${targetUserId}`);
    return next(ForbiddenError('You can only access your own data'));
  };
};

/**
 * Restaurant access middleware
 * Ensures the authenticated user is associated with the specified restaurant
 * Admins bypass this check
 */
export const requireRestaurantAccess = (restaurantIdParam: string = 'restaurantId') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return next(UnauthorizedError('Authentication required'));
    }

    // Admin types bypass restaurant access check
    const adminTypes: UserType[] = ['super_admin', 'platform_admin'];
    if (adminTypes.includes(authReq.user.userType)) {
      return next();
    }

    // Get restaurant ID from params or body
    const targetRestaurantId: string | undefined =
      req.params[restaurantIdParam] ?? (req.body as { restaurant_id?: string }).restaurant_id;

    if (!targetRestaurantId) {
      return next();
    }

    // Check if user is associated with the restaurant
    if (authReq.user.restaurantId !== targetRestaurantId) {
      logger.warn(
        `Access denied: User ${authReq.user.id} attempted to access restaurant ${targetRestaurantId}`
      );
      return next(ForbiddenError('You can only access your own restaurant'));
    }

    next();
  };
};

/**
 * Restaurant ownership middleware factory
 * Ensures the authenticated user owns the restaurant they are trying to modify.
 *
 * Ownership rules:
 *   - super_admin / platform_admin → bypass (can access any restaurant)
 *   - restaurant_owner → restaurant.owner_id must match user.id
 *   - restaurant_staff → restaurant.owner_id or staff association must match
 *
 * @param restaurantIdParam - The route param name for the restaurant ID (default: 'id')
 */
export const requireRestaurantOwnership = (restaurantIdParam: string = 'id') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const handleOwnership = async (): Promise<void> => {
      const authReq = req as AuthenticatedRequest;

      if (!authReq.user) {
        throw UnauthorizedError('Authentication required');
      }

      // Platform admins can access any restaurant
      if (ADMIN_USER_TYPES.includes(authReq.user.userType)) {
        return;
      }

      const restaurantId = req.params[restaurantIdParam];
      if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
        throw ForbiddenError('Invalid restaurant ID');
      }

      // Lazy-load the Restaurant model to avoid circular dependency
      const { default: RestaurantModel } = await import('../restaurant/restaurant.model.js');
      const restaurant = await RestaurantModel.findById(restaurantId).select('owner_id').lean();

      if (!restaurant) {
        // Let the downstream handler deal with 404
        return;
      }

      const userId = authReq.user.id;
      const userType = authReq.user.userType;

      let isOwner = false;

      if (userType === 'restaurant_owner') {
        isOwner = (restaurant as any).owner_id?.toString() === userId;
      }
      // restaurant_staff access can be expanded later with a staff-restaurant junction table

      if (!isOwner) {
        logger.warn(
          `Ownership denied: User ${userId} (${userType}) attempted to access restaurant ${restaurantId}`
        );
        throw ForbiddenError('You can only manage your own restaurant');
      }

      (req as Record<string, unknown>).restaurantOwnershipVerified = true;
    };

    handleOwnership()
      .then(() => next())
      .catch(next);
  };
};
