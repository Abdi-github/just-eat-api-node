import { query } from 'express-validator';
import {
  DATE_PRESET_VALUES,
  ANALYTICS_PERIOD_VALUES,
  ANALYTICS_CONSTANTS,
} from './analytics.types.js';

/**
 * Analytics Validators
 *
 * Validation rules for analytics query parameters.
 * All analytics endpoints are GET-only (read-only module).
 */

// ============================================================================
// Shared date range validation
// ============================================================================

const dateRangeRules = [
  query('preset')
    .optional()
    .isIn(DATE_PRESET_VALUES)
    .withMessage(`Preset must be one of: ${DATE_PRESET_VALUES.join(', ')}`),

  query('from')
    .optional()
    .isISO8601({ strict: true })
    .withMessage('From date must be a valid ISO 8601 date (YYYY-MM-DD)'),

  query('to')
    .optional()
    .isISO8601({ strict: true })
    .withMessage('To date must be a valid ISO 8601 date (YYYY-MM-DD)'),
];

// ============================================================================
// Dashboard query validation
// ============================================================================

const validateDashboardQuery = [...dateRangeRules];

// ============================================================================
// Revenue time series query validation
// ============================================================================

const validateRevenueQuery = [
  ...dateRangeRules,

  query('period')
    .optional()
    .isIn(ANALYTICS_PERIOD_VALUES)
    .withMessage(`Period must be one of: ${ANALYTICS_PERIOD_VALUES.join(', ')}`),
];

// ============================================================================
// Top items / top restaurants query validation
// ============================================================================

const validateTopQuery = [
  ...dateRangeRules,

  query('limit')
    .optional()
    .isInt({ min: 1, max: ANALYTICS_CONSTANTS.MAX_TOP_ITEMS_LIMIT })
    .withMessage(`Limit must be between 1 and ${ANALYTICS_CONSTANTS.MAX_TOP_ITEMS_LIMIT}`),
];

// ============================================================================
// Exports
// ============================================================================

export const analyticsValidators = {
  validateDashboardQuery,
  validateRevenueQuery,
  validateTopQuery,
};
