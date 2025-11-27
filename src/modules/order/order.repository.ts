import { Order, IOrder } from './order.model.js';
import type {
  OrderQueryDto,
  RestaurantOrderQueryDto,
  AdminOrderQueryDto,
  OrderStatus,
} from './order.types.js';
import type { PaginationMeta } from '../../shared/utils/response.helper.js';
import { calculatePaginationMeta } from '../../shared/utils/response.helper.js';

/**
 * Order Repository
 * Data access layer for order operations.
 */
export class OrderRepository {
  // ==================== QUERY METHODS ====================

  /**
   * Find orders for a specific customer
   */
  async findByUser(
    userId: string,
    query: OrderQueryDto
  ): Promise<{ orders: IOrder[]; pagination: PaginationMeta }> {
    const { page = 1, limit = 20, sort = '-created_at', status, order_type } = query;

    const filter: Record<string, unknown> = { user_id: userId };
    if (status) filter.status = status;
    if (order_type) filter.order_type = order_type;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('restaurant_id', 'name slug logo_url')
        .lean()
        .exec(),
      Order.countDocuments(filter),
    ]);

    const pagination = calculatePaginationMeta(page, limit, total);
    return { orders: orders as IOrder[], pagination };
  }

  /**
   * Find orders for a specific restaurant
   */
  async findByRestaurant(
    restaurantId: string,
    query: RestaurantOrderQueryDto
  ): Promise<{ orders: IOrder[]; pagination: PaginationMeta }> {
    const {
      page = 1,
      limit = 20,
      sort = '-created_at',
      status,
      order_type,
      date_from,
      date_to,
    } = query;

    const filter: Record<string, unknown> = { restaurant_id: restaurantId };
    if (status) filter.status = status;
    if (order_type) filter.order_type = order_type;

    // Date range filter
    if (date_from || date_to) {
      const dateFilter: Record<string, Date> = {};
      if (date_from) dateFilter.$gte = new Date(date_from);
      if (date_to) dateFilter.$lte = new Date(date_to);
      filter.placed_at = dateFilter;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user_id', 'first_name last_name email phone')
        .populate('courier_id', 'first_name last_name phone')
        .populate('delivery_address_id', 'street street_number postal_code city_id')
        .lean()
        .exec(),
      Order.countDocuments(filter),
    ]);

    const pagination = calculatePaginationMeta(page, limit, total);
    return { orders: orders as IOrder[], pagination };
  }

  /**
   * Find orders assigned to a specific courier
   */
  async findByCourier(
    courierId: string,
    query: OrderQueryDto
  ): Promise<{ orders: IOrder[]; pagination: PaginationMeta }> {
    const { page = 1, limit = 20, sort = '-created_at', status, order_type } = query;

    const filter: Record<string, unknown> = { courier_id: courierId };
    if (status) filter.status = status;
    if (order_type) filter.order_type = order_type;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('restaurant_id', 'name slug address postal_code phone')
        .populate('user_id', 'first_name last_name phone')
        .populate(
          'delivery_address_id',
          'street street_number postal_code city_id floor instructions'
        )
        .lean()
        .exec(),
      Order.countDocuments(filter),
    ]);

    const pagination = calculatePaginationMeta(page, limit, total);
    return { orders: orders as IOrder[], pagination };
  }

  /**
   * Find all orders (admin) with extensive filtering
   */
  async findAll(
    query: AdminOrderQueryDto
  ): Promise<{ orders: IOrder[]; pagination: PaginationMeta }> {
    const {
      page = 1,
      limit = 20,
      sort = '-created_at',
      status,
      order_type,
      payment_method,
      payment_status,
      restaurant_id,
      user_id,
      courier_id,
      date_from,
      date_to,
      order_number,
    } = query;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (order_type) filter.order_type = order_type;
    if (payment_method) filter.payment_method = payment_method;
    if (payment_status) filter.payment_status = payment_status;
    if (restaurant_id) filter.restaurant_id = restaurant_id;
    if (user_id) filter.user_id = user_id;
    if (courier_id) filter.courier_id = courier_id;
    if (order_number) filter.order_number = { $regex: order_number, $options: 'i' };

    // Date range filter
    if (date_from || date_to) {
      const dateFilter: Record<string, Date> = {};
      if (date_from) dateFilter.$gte = new Date(date_from);
      if (date_to) dateFilter.$lte = new Date(date_to);
      filter.placed_at = dateFilter;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('restaurant_id', 'name slug')
        .populate('user_id', 'first_name last_name email')
        .populate('courier_id', 'first_name last_name')
        .lean()
        .exec(),
      Order.countDocuments(filter),
    ]);

    const pagination = calculatePaginationMeta(page, limit, total);
    return { orders: orders as IOrder[], pagination };
  }

  /**
   * Find a single order by ID
   */
  async findById(orderId: string): Promise<IOrder | null> {
    return Order.findById(orderId)
      .populate('restaurant_id', 'name slug logo_url address postal_code phone')
      .populate('user_id', 'first_name last_name email phone')
      .populate('courier_id', 'first_name last_name phone')
      .populate(
        'delivery_address_id',
        'label street street_number floor postal_code city_id instructions'
      )
      .lean()
      .exec() as Promise<IOrder | null>;
  }

  /**
   * Find order by order number
   */
  async findByOrderNumber(orderNumber: string): Promise<IOrder | null> {
    return Order.findOne({ order_number: orderNumber })
      .populate('restaurant_id', 'name slug logo_url address postal_code phone')
      .populate('user_id', 'first_name last_name email phone')
      .populate('courier_id', 'first_name last_name phone')
      .populate(
        'delivery_address_id',
        'label street street_number floor postal_code city_id instructions'
      )
      .lean()
      .exec() as Promise<IOrder | null>;
  }

  // ==================== MUTATION METHODS ====================

  /**
   * Create a new order
   */
  async create(orderData: Partial<IOrder>): Promise<IOrder> {
    const order = await Order.create(orderData);
    return this.findById(order._id.toString()) as Promise<IOrder>;
  }

  /**
   * Update order status with corresponding timestamp
   */
  async updateStatus(
    orderId: string,
    status: OrderStatus,
    timestampField: string,
    additionalFields?: Record<string, unknown>
  ): Promise<IOrder | null> {
    const updateData: Record<string, unknown> = {
      status,
      [timestampField]: new Date(),
      ...additionalFields,
    };

    await Order.findByIdAndUpdate(
      orderId,
      { $set: updateData },
      { returnDocument: 'after' }
    ).exec();

    return this.findById(orderId);
  }

  /**
   * Assign a courier to an order
   */
  async assignCourier(orderId: string, courierId: string): Promise<IOrder | null> {
    await Order.findByIdAndUpdate(
      orderId,
      { $set: { courier_id: courierId } },
      { returnDocument: 'after' }
    ).exec();

    return this.findById(orderId);
  }

  /**
   * Get the next order number sequence
   * Generates: JE-YYYY-NNNNNN
   */
  async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `JE-${year}-`;

    // Find the latest order for this year
    const latestOrder = await Order.findOne({ order_number: { $regex: `^${prefix}` } })
      .sort({ order_number: -1 })
      .select('order_number')
      .lean()
      .exec();

    let nextSequence = 1;
    if (latestOrder) {
      const lastSequence = parseInt(latestOrder.order_number.split('-')[2], 10);
      nextSequence = lastSequence + 1;
    }

    return `${prefix}${String(nextSequence).padStart(6, '0')}`;
  }

  /**
   * Count orders by status for a restaurant (for dashboard)
   */
  async countByRestaurantAndStatus(
    restaurantId: string
  ): Promise<Array<{ _id: string; count: number }>> {
    return Order.aggregate([
      { $match: { restaurant_id: restaurantId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).exec();
  }

  /**
   * Get active orders for a restaurant (not delivered/cancelled/rejected)
   */
  async findActiveByRestaurant(restaurantId: string): Promise<IOrder[]> {
    return Order.find({
      restaurant_id: restaurantId,
      status: {
        $in: ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'PICKED_UP', 'IN_TRANSIT'],
      },
    })
      .sort({ placed_at: 1 })
      .populate('user_id', 'first_name last_name phone')
      .populate('courier_id', 'first_name last_name phone')
      .populate('delivery_address_id', 'street street_number postal_code city_id')
      .lean()
      .exec() as Promise<IOrder[]>;
  }

  /**
   * Get active deliveries for a courier
   */
  async findActiveByCourier(courierId: string): Promise<IOrder[]> {
    return Order.find({
      courier_id: courierId,
      status: { $in: ['READY', 'PICKED_UP', 'IN_TRANSIT'] },
    })
      .sort({ ready_at: 1 })
      .populate('restaurant_id', 'name slug address postal_code phone')
      .populate('user_id', 'first_name last_name phone')
      .populate(
        'delivery_address_id',
        'street street_number postal_code city_id floor instructions'
      )
      .lean()
      .exec() as Promise<IOrder[]>;
  }
}

// Singleton instance
export const orderRepository = new OrderRepository();
export default orderRepository;
