import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import config from '../config/index.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { logger } from '../shared/logger/index.js';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load JSON data from a file
 */
const loadJsonData = <T>(filename: string): T[] => {
  const filePath = path.join(__dirname, '../../data', filename);
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data) as T[];
};

/**
 * Convert string _id to ObjectId
 */
const toObjectId = (id: string): mongoose.Types.ObjectId => {
  return new mongoose.Types.ObjectId(id);
};

/**
 * Process a record: convert _id and all *_id fields to ObjectId
 */
const processRecord = (record: Record<string, unknown>): Record<string, unknown> => {
  const processed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (key === '_id' && typeof value === 'string') {
      processed[key] = toObjectId(value);
    } else if (key.endsWith('_id') && typeof value === 'string') {
      processed[key] = toObjectId(value);
    } else if (key === 'assigned_by' && typeof value === 'string') {
      processed[key] = toObjectId(value);
    } else {
      processed[key] = value;
    }
  }

  return processed;
};

/**
 * Seed a single collection from a JSON file
 */
const seedCollection = async (
  collectionName: string,
  filename: string,
  batchSize = 500
): Promise<number> => {
  logger.info(`Seeding ${collectionName}...`);
  const data = loadJsonData<Record<string, unknown>>(filename);

  if (data.length === 0) {
    logger.warn(`No data found in ${filename}`);
    return 0;
  }

  const collection = mongoose.connection.collection(collectionName);
  let processed = 0;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize).map(processRecord);
    await collection.insertMany(batch, { ordered: false });
    processed += batch.length;

    if (data.length > batchSize) {
      logger.info(`  ${processed}/${data.length} ${collectionName} seeded`);
    }
  }

  logger.info(`Seeded ${processed} ${collectionName}`);
  return processed;
};

/**
 * Seed order for data integrity (respects foreign key dependencies)
 * From copilot-instructions.md §7.3
 */
const SEED_ORDER: Array<{ collection: string; file: string }> = [
  { collection: 'cantons', file: 'cantons.json' },
  { collection: 'cities', file: 'cities.json' },
  { collection: 'cuisines', file: 'cuisines.json' },
  { collection: 'brands', file: 'brands.json' },
  { collection: 'users', file: 'users.json' },
  { collection: 'permissions', file: 'permissions.json' },
  { collection: 'roles', file: 'roles.json' },
  { collection: 'role_permissions', file: 'role_permissions.json' },
  { collection: 'user_roles', file: 'user_roles.json' },
  { collection: 'restaurants', file: 'restaurants.json' },
  { collection: 'restaurant_cuisines', file: 'restaurant_cuisines.json' },
  { collection: 'menu_categories', file: 'menu_categories.json' },
  { collection: 'menu_items', file: 'menu_items.json' },
  { collection: 'opening_hours', file: 'opening_hours.json' },
  { collection: 'delivery_zones', file: 'delivery_zones.json' },
  { collection: 'addresses', file: 'addresses.json' },
  { collection: 'orders', file: 'orders.json' },
  { collection: 'reviews', file: 'reviews.json' },
  { collection: 'favorites', file: 'favorites.json' },
];

/**
 * Clear all collections
 */
const clearCollections = async (): Promise<void> => {
  logger.info('Clearing existing data...');

  const collections = SEED_ORDER.map((s) => s.collection);

  await Promise.all(
    collections.map(async (name) => {
      try {
        await mongoose.connection.collection(name).deleteMany({});
      } catch {
        // Collection might not exist yet — that's fine
      }
    })
  );

  logger.info('All collections cleared');
};

/**
 * Back-populate permissions array into Role documents from role_permissions junction table.
 * This allows Mongoose populate() on Role.permissions to work efficiently.
 */
const backPopulateRolePermissions = async (): Promise<void> => {
  logger.info('Back-populating permissions into Role documents...');

  const rolePermissions = await mongoose.connection
    .collection('role_permissions')
    .find({})
    .toArray();

  // Group permission_ids by role_id
  const permissionsByRole = new Map<string, mongoose.Types.ObjectId[]>();
  for (const rp of rolePermissions) {
    const roleId = rp.role_id.toString();
    if (!permissionsByRole.has(roleId)) {
      permissionsByRole.set(roleId, []);
    }
    permissionsByRole.get(roleId)!.push(rp.permission_id);
  }

  // Update each role with its permissions array
  const rolesCollection = mongoose.connection.collection('roles');
  for (const [roleId, permissionIds] of permissionsByRole) {
    await rolesCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(roleId) },
      { $set: { permissions: permissionIds } }
    );
  }

  logger.info(`Back-populated permissions for ${permissionsByRole.size} roles`);
};

/**
 * Main seed function
 */
const seed = async (): Promise<void> => {
  try {
    logger.info('Starting database seeding...');
    logger.info(`Environment: ${config.env}`);

    // Connect to database
    await connectDatabase();

    // Always clear existing data first (--fresh is default behavior)
    await clearCollections();

    // Seed in order (respecting foreign key dependencies)
    const summary: Array<{ collection: string; count: number }> = [];

    for (const { collection, file } of SEED_ORDER) {
      const dataFilePath = path.join(__dirname, '../../data', file);

      if (!fs.existsSync(dataFilePath)) {
        logger.warn(`Skipping ${collection} — ${file} not found`);
        continue;
      }

      const count = await seedCollection(collection, file);
      summary.push({ collection, count });

      // After seeding role_permissions, back-populate permissions into Role documents
      if (collection === 'role_permissions') {
        await backPopulateRolePermissions();
      }
    }

    // Print summary
    logger.info('');
    logger.info('Database seeding completed successfully!');
    logger.info('');
    logger.info('Summary:');

    for (const { collection, count } of summary) {
      logger.info(`   - ${collection}: ${count}`);
    }

    // Verify counts from database
    logger.info('');
    logger.info('Verification (from database):');

    for (const { collection } of summary) {
      try {
        const count = await mongoose.connection.collection(collection).countDocuments();
        logger.info(`   - ${collection}: ${count}`);
      } catch {
        logger.warn(`   - ${collection}: could not verify`);
      }
    }

    logger.info('');
    logger.info('Test Credentials:');
    logger.info('   Super Admin: admin@justeat-clone.ch / Password123!');
    logger.info('   Customer: customer1@example.ch / Password123!');
  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  } finally {
    await disconnectDatabase();
  }
};

// Run seed
seed().catch((error) => {
  logger.error('Seed script error:', error);
  process.exit(1);
});

export { seed };
