import { body, param, query, type ValidationChain } from 'express-validator';
import {
  OrderStatus,
  OrderType,
  PaymentMethod,
  ORDER_SORT_FIELDS,
  ORDER_CONSTANTS,
} from './order.types.js';

// ============================================================================
// Shared Validators
// ============================================================================

const objectIdParamValidator = (paramName = 'id'): ValidationChain =>
  param(paramName).isMongoId().withMessage(`Invalid ${paramName} format`);

const paginationValidators: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: ORDER_CONSTANTS.MAX_LIMIT })
    .withMessage(`Limit must be between 1 and ${ORDER_CONSTANTS.MAX_LIMIT}`),
];

const statusQueryValidator = (): ValidationChain =>
  query('status')
    .optional()
    .isIn(Object.values(OrderStatus))
    .withMessage(`Status must be one of: ${Object.values(OrderStatus).join(', ')}`);

const orderTypeQueryValidator = (): ValidationChain =>
  query('order_type')
    .optional()
    .isIn(Object.values(OrderType))
    .withMessage(`Order type must be one of: ${Object.values(OrderType).join(', ')}`);

const sortQueryValidator = (): ValidationChain =>
  query('sort')
    .optional()
    .custom((value: string) => {
      const field = value.startsWith('-') ? value.slice(1) : value;
      return (ORDER_SORT_FIELDS as readonly string[]).includes(field);
    })
    .withMessage(`Sort must be one of: ${ORDER_SORT_FIELDS.join(', ')}`);

// ============================================================================
// Order Validators
// ============================================================================

export const orderValidators = {
  // ======================== CUSTOMER ========================

  /**
   * POST /orders — Place a new order
   */
  placeOrder: [
    body('restaurant_id')
      .notEmpty()
      .withMessage('Restaurant ID is required')
      .isMongoId()
      .withMessage('Invalid restaurant ID format'),
    body('order_type')
      .notEmpty()
      .withMessage('Order type is required')
      .isIn(Object.values(OrderType))
      .withMessage(`Order type must be one of: ${Object.values(OrderType).join(', ')}`),
    body('delivery_address_id')
      .optional()
      .isMongoId()
      .withMessage('Invalid delivery address ID format'),
    body('items')
      .isArray({ min: 1, max: ORDER_CONSTANTS.MAX_ITEMS_PER_ORDER })
      .withMessage(`Items must be an array with 1 to ${ORDER_CONSTANTS.MAX_ITEMS_PER_ORDER} items`),
    body('items.*.menu_item_id')
      .notEmpty()
      .withMessage('Menu item ID is required')
      .isMongoId()
      .withMessage('Invalid menu item ID format'),
    body('items.*.quantity')
      .isInt({ min: 1, max: ORDER_CONSTANTS.MAX_ITEM_QUANTITY })
      .withMessage(`Quantity must be between 1 and ${ORDER_CONSTANTS.MAX_ITEM_QUANTITY}`),
    body('items.*.special_instructions')
      .optional()
      .trim()
      .isLength({ max: ORDER_CONSTANTS.MAX_SPECIAL_INSTRUCTIONS_LENGTH })
      .withMessage(
        `Item special instructions must be at most ${ORDER_CONSTANTS.MAX_SPECIAL_INSTRUCTIONS_LENGTH} characters`
      ),
    body('items.*.options').optional().isArray().withMessage('Options must be an array'),
    body('items.*.options.*.name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Option name is required'),
    body('items.*.options.*.price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Option price must be a non-negative number'),
    body('payment_method')
      .notEmpty()
      .withMessage('Payment method is required')
      .isIn(Object.values(PaymentMethod))
      .withMessage(`Payment method must be one of: ${Object.values(PaymentMethod).join(', ')}`),
    body('tip')
      .optional()
      .isFloat({ min: ORDER_CONSTANTS.MIN_TIP, max: ORDER_CONSTANTS.MAX_TIP })
      .withMessage(
        `Tip must be between ${ORDER_CONSTANTS.MIN_TIP} and ${ORDER_CONSTANTS.MAX_TIP} CHF`
      ),
    body('special_instructions')
      .optional()
      .trim()
      .isLength({ max: ORDER_CONSTANTS.MAX_SPECIAL_INSTRUCTIONS_LENGTH })
      .withMessage(
        `Special instructions must be at most ${ORDER_CONSTANTS.MAX_SPECIAL_INSTRUCTIONS_LENGTH} characters`
      ),
  ] as ValidationChain[],

  /**
   * GET /orders/my — Get my orders
   */
  getMyOrders: [
    ...paginationValidators,
    sortQueryValidator(),
    statusQueryValidator(),
    orderTypeQueryValidator(),
  ] as ValidationChain[],

  /**
   * GET /orders/:id — Get order by ID
   */
  getById: [objectIdParamValidator()] as ValidationChain[],

  /**
   * PATCH /orders/:id/cancel — Cancel order
   */
  cancelOrder: [
    objectIdParamValidator(),
    body('cancellation_reason')
      .trim()
      .notEmpty()
      .withMessage('Cancellation reason is required')
      .isLength({ min: 3, max: 500 })
      .withMessage('Cancellation reason must be between 3 and 500 characters'),
  ] as ValidationChain[],

  // ======================== RESTAURANT ========================

  /**
   * GET /restaurant/:restaurantId/orders — Get restaurant orders
   */
  getRestaurantOrders: [
    param('restaurantId').isMongoId().withMessage('Invalid restaurant ID format'),
    ...paginationValidators,
    sortQueryValidator(),
    statusQueryValidator(),
    orderTypeQueryValidator(),
    query('date_from').optional().isISO8601().withMessage('date_from must be a valid ISO8601 date'),
    query('date_to').optional().isISO8601().withMessage('date_to must be a valid ISO8601 date'),
  ] as ValidationChain[],

  /**
   * GET /restaurant/:restaurantId/orders/active — Get active orders
   */
  getActiveRestaurantOrders: [
    param('restaurantId').isMongoId().withMessage('Invalid restaurant ID format'),
  ] as ValidationChain[],

  /**
   * PATCH /restaurant/:restaurantId/orders/:id/status — Update order status
   */
  updateOrderStatus: [
    param('restaurantId').isMongoId().withMessage('Invalid restaurant ID format'),
    objectIdParamValidator(),
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(Object.values(OrderStatus))
      .withMessage(`Status must be one of: ${Object.values(OrderStatus).join(', ')}`),
    body('rejection_reason')
      .optional()
      .trim()
      .isLength({ min: 3, max: 500 })
      .withMessage('Rejection reason must be between 3 and 500 characters'),
  ] as ValidationChain[],

  /**
   * PATCH /restaurant/:restaurantId/orders/:id/assign-courier — Assign courier
   */
  assignCourier: [
    param('restaurantId').isMongoId().withMessage('Invalid restaurant ID format'),
    objectIdParamValidator(),
    body('courier_id')
      .notEmpty()
      .withMessage('Courier ID is required')
      .isMongoId()
      .withMessage('Invalid courier ID format'),
  ] as ValidationChain[],

  // ======================== COURIER ========================

  /**
   * GET /courier/orders — Get courier orders
   */
  getCourierOrders: [
    ...paginationValidators,
    sortQueryValidator(),
    statusQueryValidator(),
  ] as ValidationChain[],

  /**
   * PATCH /courier/orders/:id/status — Update delivery status
   */
  updateDeliveryStatus: [
    objectIdParamValidator(),
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn([OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED])
      .withMessage('Courier can only update to: PICKED_UP, IN_TRANSIT, DELIVERED'),
  ] as ValidationChain[],

  // ======================== ADMIN ========================

  /**
   * GET /admin/orders — Get all orders
   */
  getAllOrders: [
    ...paginationValidators,
    sortQueryValidator(),
    statusQueryValidator(),
    orderTypeQueryValidator(),
    query('payment_method')
      .optional()
      .isIn(Object.values(PaymentMethod))
      .withMessage(`Payment method must be one of: ${Object.values(PaymentMethod).join(', ')}`),
    query('payment_status')
      .optional()
      .isIn(['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED'])
      .withMessage('Payment status must be one of: PENDING, PROCESSING, PAID, FAILED, REFUNDED'),
    query('restaurant_id').optional().isMongoId().withMessage('Invalid restaurant_id format'),
    query('user_id').optional().isMongoId().withMessage('Invalid user_id format'),
    query('courier_id').optional().isMongoId().withMessage('Invalid courier_id format'),
    query('date_from').optional().isISO8601().withMessage('date_from must be a valid ISO8601 date'),
    query('date_to').optional().isISO8601().withMessage('date_to must be a valid ISO8601 date'),
    query('order_number').optional().trim().isString().withMessage('Order number must be a string'),
  ] as ValidationChain[],

  /**
   * GET /admin/orders/:id — Get order by ID (admin)
   */
  getByIdAdmin: [objectIdParamValidator()] as ValidationChain[],

  /**
   * PATCH /admin/orders/:id/status — Update order status (admin)
   */
  updateOrderStatusAdmin: [
    objectIdParamValidator(),
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(Object.values(OrderStatus))
      .withMessage(`Status must be one of: ${Object.values(OrderStatus).join(', ')}`),
    body('rejection_reason')
      .optional()
      .trim()
      .isLength({ min: 3, max: 500 })
      .withMessage('Rejection reason must be between 3 and 500 characters'),
    body('cancellation_reason')
      .optional()
      .trim()
      .isLength({ min: 3, max: 500 })
      .withMessage('Cancellation reason must be between 3 and 500 characters'),
  ] as ValidationChain[],
};

export default orderValidators;
