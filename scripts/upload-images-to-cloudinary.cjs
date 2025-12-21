/**
 * Upload all external images to our Cloudinary account.
 * 
 * This script:
 * 1. Reads all seed JSON files
 * 2. Extracts image URLs from restaurants, menu_items, cuisines, brands
 * 3. Uploads each to Cloudinary under structured folders
 * 4. Creates a mapping file (old URL → new URL)
 * 5. Updates seed JSON files with new Cloudinary URLs
 * 
 * Usage: node scripts/upload-images-to-cloudinary.cjs [--dry-run] [--skip-upload] [--batch-size=20]
 * 
 * Flags:
 *   --dry-run       Show what would be uploaded without uploading
 *   --skip-upload   Skip upload, only apply existing mapping
 *   --batch-size=N  Number of concurrent uploads (default: 10)
 *   --resume        Resume from last progress checkpoint
 */

const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

// ── Configuration ──────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, '..', 'data');
const MAPPING_FILE = path.join(__dirname, '..', 'data', '_image_mapping.json');
const PROGRESS_FILE = path.join(__dirname, '..', 'data', '_upload_progress.json');

// Cloudinary config
cloudinary.config({
  cloud_name: 'dzyyygr1x',
  api_key: '393749481964766',
  api_secret: 'lIQ4qNH1CRKz2P3dMSgXRxb2_CE',
});

// Folder structure in Cloudinary
const FOLDER_MAP = {
  restaurant_logo: 'justeat/restaurants/logos',
  menu_item: 'justeat/menu/items',
  cuisine: 'justeat/cuisines/images',
  brand: 'justeat/brands/logos',
};

// ── CLI Flags ──────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SKIP_UPLOAD = args.includes('--skip-upload');
const RESUME = args.includes('--resume');
const batchArg = args.find(a => a.startsWith('--batch-size='));
const BATCH_SIZE = batchArg ? parseInt(batchArg.split('=')[1], 10) : 10;

// ── Helpers ────────────────────────────────────────────────────────
function readJSON(filename) {
  const filepath = path.join(DATA_DIR, filename);
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

function writeJSON(filename, data) {
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function generatePublicId(category, item) {
  switch (category) {
    case 'restaurant_logo':
      return `${FOLDER_MAP[category]}/${item.slug || item._id}`;
    case 'menu_item':
      return `${FOLDER_MAP[category]}/${item._id}`;
    case 'cuisine':
      return `${FOLDER_MAP[category]}/${item.slug || item._id}`;
    case 'brand':
      return `${FOLDER_MAP[category]}/${item.slug || item._id}`;
    default:
      return `${FOLDER_MAP[category]}/${item._id}`;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Step 1: Collect all images ─────────────────────────────────────
function collectImages() {
  const images = [];

  // Restaurant logos
  const restaurants = readJSON('restaurants.json');
  for (const r of restaurants) {
    if (r.logo_url && r.logo_url.startsWith('http')) {
      images.push({
        category: 'restaurant_logo',
        source_url: r.logo_url,
        public_id: generatePublicId('restaurant_logo', r),
        file: 'restaurants.json',
        id_field: '_id',
        id_value: r._id,
        url_field: 'logo_url',
      });
    }
    // cover_image_url if any
    if (r.cover_image_url && r.cover_image_url.startsWith('http')) {
      images.push({
        category: 'restaurant_logo', // reuse folder or add cover folder
        source_url: r.cover_image_url,
        public_id: `justeat/restaurants/covers/${r.slug || r._id}`,
        file: 'restaurants.json',
        id_field: '_id',
        id_value: r._id,
        url_field: 'cover_image_url',
      });
    }
  }

  // Menu items
  const menuItems = readJSON('menu_items.json');
  for (const item of menuItems) {
    if (item.image_url && item.image_url.startsWith('http')) {
      images.push({
        category: 'menu_item',
        source_url: item.image_url,
        public_id: generatePublicId('menu_item', item),
        file: 'menu_items.json',
        id_field: '_id',
        id_value: item._id,
        url_field: 'image_url',
      });
    }
  }

  // Cuisines
  const cuisines = readJSON('cuisines.json');
  for (const c of cuisines) {
    if (c.image_url && c.image_url.startsWith('http')) {
      images.push({
        category: 'cuisine',
        source_url: c.image_url,
        public_id: generatePublicId('cuisine', c),
        file: 'cuisines.json',
        id_field: '_id',
        id_value: c._id,
        url_field: 'image_url',
      });
    }
  }

  // Brands
  const brands = readJSON('brands.json');
  for (const b of brands) {
    if (b.logo_url && b.logo_url.startsWith('http')) {
      images.push({
        category: 'brand',
        source_url: b.logo_url,
        public_id: generatePublicId('brand', b),
        file: 'brands.json',
        id_field: '_id',
        id_value: b._id,
        url_field: 'logo_url',
      });
    }
  }

  return images;
}

// ── Step 2: Upload images in batches ───────────────────────────────
async function uploadImage(image) {
  try {
    const result = await cloudinary.uploader.upload(image.source_url, {
      public_id: image.public_id,
      overwrite: false,       // Don't re-upload if exists
      resource_type: 'image',
      format: 'webp',         // Convert all to webp for efficiency
      transformation: getTransformation(image.category),
    });

    return {
      success: true,
      source_url: image.source_url,
      new_url: result.secure_url,
      public_id: result.public_id,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
    };
  } catch (err) {
    // If image already exists, fetch its URL
    if (err.http_code === 409 || (err.message && err.message.includes('already exists'))) {
      try {
        const existing = await cloudinary.api.resource(image.public_id, { resource_type: 'image' });
        return {
          success: true,
          source_url: image.source_url,
          new_url: existing.secure_url,
          public_id: existing.public_id,
          bytes: existing.bytes,
          width: existing.width,
          height: existing.height,
          existed: true,
        };
      } catch (fetchErr) {
        return {
          success: false,
          source_url: image.source_url,
          error: `Already exists but fetch failed: ${fetchErr.message}`,
        };
      }
    }

    return {
      success: false,
      source_url: image.source_url,
      error: err.message || String(err),
    };
  }
}

function getTransformation(category) {
  switch (category) {
    case 'restaurant_logo':
      return [{ width: 400, height: 400, crop: 'pad', background: 'white' }];
    case 'menu_item':
      return [{ width: 800, height: 600, crop: 'fill', gravity: 'auto' }];
    case 'cuisine':
      return [{ width: 600, height: 450, crop: 'fill', gravity: 'auto' }];
    case 'brand':
      return [{ width: 400, height: 400, crop: 'pad', background: 'white' }];
    default:
      return [];
  }
}

async function uploadBatch(images, mapping, startIdx) {
  const results = { success: 0, failed: 0, skipped: 0, errors: [] };

  for (let i = startIdx; i < images.length; i += BATCH_SIZE) {
    const batch = images.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(images.length / BATCH_SIZE);

    console.log(`\n📦 Batch ${batchNum}/${totalBatches} (images ${i + 1}-${Math.min(i + BATCH_SIZE, images.length)} of ${images.length})`);

    const promises = batch.map(async (img) => {
      // Skip if already in mapping
      if (mapping[img.source_url]) {
        results.skipped++;
        return;
      }

      const result = await uploadImage(img);

      if (result.success) {
        mapping[result.source_url] = result.new_url;
        results.success++;
        const status = result.existed ? '♻️' : '✅';
        console.log(`  ${status} ${img.category}: ${img.public_id.split('/').pop()} (${result.width}x${result.height}, ${(result.bytes / 1024).toFixed(1)}KB)`);
      } else {
        results.failed++;
        results.errors.push({ url: result.source_url, error: result.error });
        console.log(`  ❌ ${img.category}: ${result.error.substring(0, 80)}`);
      }
    });

    await Promise.all(promises);

    // Save progress after each batch
    fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2) + '\n');
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ lastIndex: i + BATCH_SIZE, timestamp: new Date().toISOString() }) + '\n');

    // Rate limit: pause between batches
    if (i + BATCH_SIZE < images.length) {
      console.log('  ⏳ Waiting 2s for rate limit...');
      await sleep(2000);
    }
  }

  return results;
}

// ── Step 3: Update seed files ──────────────────────────────────────
function updateSeedFiles(mapping) {
  const files = ['restaurants.json', 'menu_items.json', 'cuisines.json', 'brands.json'];
  const urlFields = {
    'restaurants.json': ['logo_url', 'cover_image_url'],
    'menu_items.json': ['image_url'],
    'cuisines.json': ['image_url'],
    'brands.json': ['logo_url'],
  };

  let totalUpdated = 0;

  for (const file of files) {
    const data = readJSON(file);
    let fileUpdated = 0;

    for (const item of data) {
      for (const field of urlFields[file]) {
        if (item[field] && mapping[item[field]]) {
          item[field] = mapping[item[field]];
          fileUpdated++;
        }
      }
    }

    if (fileUpdated > 0) {
      writeJSON(file, data);
      console.log(`  📝 ${file}: ${fileUpdated} URLs updated`);
      totalUpdated += fileUpdated;
    }
  }

  return totalUpdated;
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Cloudinary Image Upload Script');
  console.log('  Cloud: dzyyygr1x | Base folder: justeat/');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN' : SKIP_UPLOAD ? 'SKIP UPLOAD' : 'LIVE UPLOAD'}`);
  console.log(`  Batch size: ${BATCH_SIZE}`);
  console.log(`  Resume: ${RESUME}`);
  console.log('');

  // Collect images
  const images = collectImages();
  console.log(`📊 Found ${images.length} images to process:`);

  const byCat = {};
  for (const img of images) {
    byCat[img.category] = (byCat[img.category] || 0) + 1;
  }
  for (const [cat, count] of Object.entries(byCat)) {
    console.log(`   ${cat}: ${count}`);
  }

  if (DRY_RUN) {
    console.log('\n🔍 Dry run — listing all images:');
    for (const img of images) {
      console.log(`  ${img.category} | ${img.public_id} | ${img.source_url.substring(0, 80)}...`);
    }
    console.log('\n✅ Dry run complete. No images were uploaded.');
    return;
  }

  // Load existing mapping
  let mapping = {};
  if (fs.existsSync(MAPPING_FILE)) {
    mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf-8'));
    console.log(`\n📂 Loaded existing mapping: ${Object.keys(mapping).length} entries`);
  }

  // Resume support
  let startIdx = 0;
  if (RESUME && fs.existsSync(PROGRESS_FILE)) {
    const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    startIdx = progress.lastIndex || 0;
    console.log(`🔄 Resuming from index ${startIdx} (last run: ${progress.timestamp})`);
  }

  if (!SKIP_UPLOAD) {
    // Verify Cloudinary connection
    console.log('\n🔌 Verifying Cloudinary connection...');
    try {
      const usage = await cloudinary.api.usage();
      console.log(`  ✅ Connected! Credits: ${usage.credits.used_percent.toFixed(1)}% used, ${usage.rate_limit_remaining}/${usage.rate_limit_allowed} API calls remaining`);
    } catch (err) {
      console.error('  ❌ Cloudinary connection failed:', err.message);
      process.exit(1);
    }

    // Upload
    console.log('\n🚀 Starting uploads...');
    const results = await uploadBatch(images, mapping, startIdx);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  Upload Results:');
    console.log(`  ✅ Uploaded: ${results.success}`);
    console.log(`  ⏭️  Skipped (already mapped): ${results.skipped}`);
    console.log(`  ❌ Failed: ${results.failed}`);
    console.log('═══════════════════════════════════════════════════════');

    if (results.errors.length > 0) {
      console.log('\n❌ Failed uploads:');
      for (const err of results.errors) {
        console.log(`  ${err.url.substring(0, 70)}... → ${err.error}`);
      }
    }

    // Save final mapping
    fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2) + '\n');
    console.log(`\n💾 Mapping saved: ${Object.keys(mapping).length} entries → ${MAPPING_FILE}`);
  }

  // Update seed files
  console.log('\n📝 Updating seed files...');
  const totalUpdated = updateSeedFiles(mapping);
  console.log(`\n✅ Total URLs updated in seed files: ${totalUpdated}`);

  // Cleanup progress file
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
  }

  console.log('\n🎉 Done! Run `docker compose exec api npm run seed` to re-seed the database.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
