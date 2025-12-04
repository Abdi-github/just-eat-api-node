import { Favorite, IFavorite } from './favorite.model.js';

/**
 * Favorite Repository
 *
 * Data access layer for favorites collection.
 */
export class FavoriteRepository {
  /**
   * Find a favorite by user_id and restaurant_id
   */
  async findByUserAndRestaurant(userId: string, restaurantId: string): Promise<IFavorite | null> {
    return Favorite.findOne({ user_id: userId, restaurant_id: restaurantId }).exec();
  }

  /**
   * Create a favorite
   */
  async create(data: { user_id: string; restaurant_id: string }): Promise<IFavorite> {
    return Favorite.create(data);
  }

  /**
   * Delete a favorite by user_id and restaurant_id
   */
  async deleteByUserAndRestaurant(userId: string, restaurantId: string): Promise<IFavorite | null> {
    return Favorite.findOneAndDelete({ user_id: userId, restaurant_id: restaurantId }).exec();
  }

  /**
   * Find all favorites for a user (paginated, with restaurant populated)
   */
  async findByUser(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ data: IFavorite[]; total: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Favorite.find({ user_id: userId })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .populate(
          'restaurant_id',
          'name slug logo_url cover_image_url rating review_count delivery_fee estimated_delivery_minutes supports_delivery supports_pickup is_active'
        )
        .exec(),
      Favorite.countDocuments({ user_id: userId }),
    ]);

    return { data, total };
  }

  /**
   * Count favorites for a restaurant
   */
  async countByRestaurant(restaurantId: string): Promise<number> {
    return Favorite.countDocuments({ restaurant_id: restaurantId });
  }

  /**
   * Check if a user has favorited a restaurant
   */
  async isFavorited(userId: string, restaurantId: string): Promise<boolean> {
    const count = await Favorite.countDocuments({ user_id: userId, restaurant_id: restaurantId });
    return count > 0;
  }
}
