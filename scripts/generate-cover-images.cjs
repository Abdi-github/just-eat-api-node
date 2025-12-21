/**
 * Generate restaurant cover images:
 * 1. Fetch food images from free APIs (TheMealDB, Foodish)
 * 2. Upload to Cloudinary
 * 3. Assign cover images to all 380 restaurants based on cuisine
 * 4. Update restaurants.json
 *
 * Usage: node scripts/generate-cover-images.cjs [--dry-run] [--skip-upload]
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');

// ── Cloudinary config ───────────────────────────────────────────
const CLOUD_NAME = 'dzyyygr1x';
const API_KEY = '393749481964766';
const API_SECRET = 'lIQ4qNH1CRKz2P3dMSgXRxb2_CE';
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_UPLOAD = process.argv.includes('--skip-upload');

// ── Helpers ─────────────────────────────────────────────────────
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'JustEat-CoverGen/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Invalid JSON from ${url}: ${data.substring(0, 200)}`)); }
      });
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function generateSignature(params) {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return crypto.createHash('sha1').update(sorted + API_SECRET).digest('hex');
}

async function uploadToCloudinary(imageUrl, publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    public_id: publicId,
    timestamp: String(timestamp),
    folder: 'justeat/restaurants/covers',
    overwrite: 'false',
  };
  const signature = generateSignature(params);

  const formData = new URLSearchParams({
    file: imageUrl,
    api_key: API_KEY,
    signature: signature,
    ...params,
  });

  return new Promise((resolve, reject) => {
    const postData = formData.toString();
    const options = {
      hostname: 'api.cloudinary.com',
      port: 443,
      path: `/v1_1/${CLOUD_NAME}/image/upload`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.secure_url) {
            resolve(json.secure_url);
          } else if (json.error && json.error.message && json.error.message.includes('already exists')) {
            // Already uploaded, construct the URL
            resolve(`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/justeat/restaurants/covers/${publicId}`);
          } else {
            reject(new Error(`Upload failed: ${JSON.stringify(json)}`));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${data.substring(0, 300)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// ── TheMealDB cuisine area mappings ─────────────────────────────
// These map to TheMealDB's "area" parameter
const MEALDB_AREAS = {
  Italian: 'Italian',
  Indian: 'Indian',
  Chinese: 'Chinese',
  Mexican: 'Mexican',
  Thai: 'Thai',
  Greek: 'Greek',
  Turkish: 'Turkish',
  Vietnamese: 'Vietnamese',
  // Japanese covers sushi
  Sushi: 'Japanese',
  // British for fish & chips, American for burgers
  American: 'American',
  // French as fallback for generic European
  French: 'French',
};

// TheMealDB category mappings for cuisine types without area
const MEALDB_CATEGORIES = {
  Burger: 'Beef',
  Chicken: 'Chicken',
  Fish: 'Seafood',
  Desserts: 'Dessert',
  Pasta: 'Pasta',
  Steak: 'Beef',
};

// Foodish API categories
const FOODISH_CATEGORIES = ['pizza', 'burger', 'pasta', 'biryani', 'rice', 'dessert'];

// ── Fetch images from TheMealDB ─────────────────────────────────
async function fetchMealDBImages(area, count = 5) {
  try {
    const data = await fetchJSON(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${area}`);
    if (!data.meals) return [];
    // Shuffle and pick
    const shuffled = data.meals.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(m => ({
      url: m.strMealThumb,
      name: m.strMeal,
    }));
  } catch (e) {
    console.error(`  Failed to fetch TheMealDB area ${area}:`, e.message);
    return [];
  }
}

async function fetchMealDBByCategory(category, count = 5) {
  try {
    const data = await fetchJSON(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${category}`);
    if (!data.meals) return [];
    const shuffled = data.meals.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(m => ({
      url: m.strMealThumb,
      name: m.strMeal,
    }));
  } catch (e) {
    console.error(`  Failed to fetch TheMealDB category ${category}:`, e.message);
    return [];
  }
}

// ── Fetch images from Foodish ───────────────────────────────────
async function fetchFoodishImages(category, count = 5) {
  const images = [];
  const seen = new Set();
  let attempts = 0;
  while (images.length < count && attempts < count * 3) {
    attempts++;
    try {
      const data = await fetchJSON(`https://foodish-api.com/api/images/${category}`);
      if (data.image && !seen.has(data.image)) {
        seen.add(data.image);
        images.push({ url: data.image, name: `${category}-${images.length + 1}` });
      }
    } catch (e) {
      // Skip
    }
    await sleep(200); // Be polite
  }
  return images;
}

// ── Main logic ──────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Restaurant Cover Image Generator');
  console.log('═══════════════════════════════════════════════════════');
  if (DRY_RUN) console.log('  MODE: DRY RUN (no uploads)');
  if (SKIP_UPLOAD) console.log('  MODE: SKIP UPLOAD (use mapping file)');
  console.log('');

  // ── Step 1: Collect food images by cuisine ──
  console.log('Step 1: Fetching food images from free APIs...');

  const cuisineImages = {};

  // TheMealDB by area
  for (const [cuisine, area] of Object.entries(MEALDB_AREAS)) {
    console.log(`  Fetching ${cuisine} (TheMealDB area: ${area})...`);
    cuisineImages[cuisine] = await fetchMealDBImages(area, 6);
    console.log(`    Got ${cuisineImages[cuisine].length} images`);
    await sleep(500);
  }

  // TheMealDB by category (for cuisines without area mapping)
  for (const [cuisine, category] of Object.entries(MEALDB_CATEGORIES)) {
    if (!cuisineImages[cuisine] || cuisineImages[cuisine].length === 0) {
      console.log(`  Fetching ${cuisine} (TheMealDB category: ${category})...`);
      cuisineImages[cuisine] = await fetchMealDBByCategory(category, 6);
      console.log(`    Got ${cuisineImages[cuisine].length} images`);
      await sleep(500);
    }
  }

  // Foodish API for additional variety
  for (const category of FOODISH_CATEGORIES) {
    const cuisineName = category.charAt(0).toUpperCase() + category.slice(1);
    if (!cuisineImages[cuisineName] || cuisineImages[cuisineName].length < 3) {
      console.log(`  Fetching ${cuisineName} (Foodish API)...`);
      const foodishImgs = await fetchFoodishImages(category, 4);
      cuisineImages[cuisineName] = [...(cuisineImages[cuisineName] || []), ...foodishImgs];
      console.log(`    Got ${foodishImgs.length} additional images`);
    }
  }

  // Add some general/default food images using TheMealDB miscellaneous
  console.log('  Fetching default/general food images...');
  cuisineImages['_default'] = await fetchMealDBByCategory('Miscellaneous', 8);
  const sideDishes = await fetchMealDBByCategory('Side', 4);
  cuisineImages['_default'] = [...cuisineImages['_default'], ...sideDishes];
  console.log(`    Got ${cuisineImages['_default'].length} default images`);
  await sleep(500);

  // Swiss → use French + Beef as Swiss isn't in TheMealDB
  if (!cuisineImages['Swiss'] || cuisineImages['Swiss'].length === 0) {
    console.log('  Swiss cuisine: using French + Beef images...');
    cuisineImages['Swiss'] = [
      ...(cuisineImages['French'] || []).slice(0, 3),
      ...(await fetchMealDBByCategory('Beef', 3)),
    ];
  }

  // Lebanese/Kebab → use Turkish
  if (!cuisineImages['Lebanese'] || cuisineImages['Lebanese'].length < 3) {
    cuisineImages['Lebanese'] = [...(cuisineImages['Turkish'] || []).slice(0, 4)];
  }
  if (!cuisineImages['Kebab'] || cuisineImages['Kebab'].length < 3) {
    cuisineImages['Kebab'] = [...(cuisineImages['Turkish'] || []).slice(0, 4)];
  }

  // Asian → use Thai + Chinese mix
  if (!cuisineImages['Asian'] || cuisineImages['Asian'].length < 3) {
    cuisineImages['Asian'] = [
      ...(cuisineImages['Thai'] || []).slice(0, 3),
      ...(cuisineImages['Chinese'] || []).slice(0, 3),
    ];
  }

  // African → use Miscellaneous
  cuisineImages['African food'] = (cuisineImages['_default'] || []).slice(0, 4);

  // Snacks, Coffee, Groceries, Sandwiches → default
  for (const c of ['Snacks', 'Coffee', 'Groceries', 'Sandwiches', 'Dumplings', 'Salads']) {
    if (!cuisineImages[c] || cuisineImages[c].length < 2) {
      cuisineImages[c] = (cuisineImages['_default'] || []).slice(0, 4);
    }
  }

  // Summary
  console.log('\n  Image collection summary:');
  let totalImages = 0;
  const allImageUrls = new Set();
  for (const [cuisine, images] of Object.entries(cuisineImages)) {
    console.log(`    ${cuisine}: ${images.length} images`);
    totalImages += images.length;
    images.forEach(i => allImageUrls.add(i.url));
  }
  console.log(`  Total: ${totalImages} (${allImageUrls.size} unique)`);

  // ── Step 2: Upload unique images to Cloudinary ──
  console.log('\nStep 2: Uploading images to Cloudinary...');

  const mappingFile = path.join(DATA_DIR, '_cover_image_mapping.json');
  let urlToCloudinary = {};

  if (SKIP_UPLOAD && fs.existsSync(mappingFile)) {
    urlToCloudinary = JSON.parse(fs.readFileSync(mappingFile, 'utf-8'));
    console.log(`  Loaded ${Object.keys(urlToCloudinary).length} mappings from existing file`);
  } else {
    const uniqueUrls = [...allImageUrls];
    let uploaded = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < uniqueUrls.length; i++) {
      const url = uniqueUrls[i];
      // Generate a stable public_id from URL hash
      const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 12);
      const publicId = `cover-${hash}`;

      if (DRY_RUN) {
        console.log(`  [DRY] Would upload: ${url.substring(0, 60)}... → ${publicId}`);
        urlToCloudinary[url] = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/justeat/restaurants/covers/${publicId}`;
        uploaded++;
        continue;
      }

      try {
        const cloudinaryUrl = await uploadToCloudinary(url, publicId);
        urlToCloudinary[url] = cloudinaryUrl;
        uploaded++;
        process.stdout.write(`  Uploaded ${uploaded}/${uniqueUrls.length}: ${publicId}\r`);
      } catch (e) {
        if (e.message.includes('already exists')) {
          urlToCloudinary[url] = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/justeat/restaurants/covers/${publicId}`;
          skipped++;
        } else {
          console.error(`\n  FAILED: ${url.substring(0, 60)}... → ${e.message}`);
          failed++;
        }
      }

      // Rate limit: ~2 per second
      if (!DRY_RUN) await sleep(600);
    }

    console.log(`\n  Uploaded: ${uploaded}, Skipped: ${skipped}, Failed: ${failed}`);

    // Save mapping
    fs.writeFileSync(mappingFile, JSON.stringify(urlToCloudinary, null, 2));
    console.log(`  Mapping saved to ${mappingFile}`);
  }

  // ── Step 3: Assign cover images to restaurants ──
  console.log('\nStep 3: Assigning cover images to restaurants...');

  const restaurants = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'restaurants.json'), 'utf-8'));
  const rc = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'restaurant_cuisines.json'), 'utf-8'));
  const cuisineList = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'cuisines.json'), 'utf-8'));

  // Build cuisine lookup
  const cuisineNameMap = {};
  cuisineList.forEach(c => { cuisineNameMap[c._id] = c.name.en; });

  // Build restaurant → primary cuisine mapping
  const restToCuisine = {};
  rc.forEach(r => {
    if (!restToCuisine[r.restaurant_id]) {
      restToCuisine[r.restaurant_id] = cuisineNameMap[r.cuisine_id] || 'Other';
    }
  });

  // Cuisine name normalization for matching
  const CUISINE_ALIAS = {
    'Pizza': 'Pizza',
    'Burger': 'Burger',
    'Italian': 'Italian',
    'Indian': 'Indian',
    'Asian': 'Asian',
    'Kebab': 'Kebab',
    'Mexican': 'Mexican',
    'Sushi': 'Sushi',
    'Swiss': 'Swiss',
    'Chinese': 'Chinese',
    'Lebanese': 'Lebanese',
    'Thai': 'Thai',
    'Greek': 'Greek',
    'Turkish': 'Turkish',
    'Vietnamese': 'Vietnamese',
    'American Food': 'American',
    'Chicken': 'Chicken',
    'Fish': 'Fish',
    'Pasta': 'Pasta',
    'Steak': 'Steak',
    'Desserts': 'Desserts',
    'Dumplings': 'Dumplings',
    'Coffee': 'Coffee',
    'Snacks': 'Snacks',
    'Groceries': 'Groceries',
    'Salads': 'Salads',
    'Sandwiches': 'Sandwiches',
    'African food': 'African food',
    // Brand names
    "McDonald's": 'Burger',
    'Burger King®': 'Burger',
    'Brezelkönig': '_default',
    "Domino's Pizza": 'Pizza',
    'Telpizza': 'Pizza',
  };

  let assigned = 0;
  let usedDefault = 0;

  // Deterministic random for consistent assignment
  let rSeed = 12345;
  function nextRand() {
    rSeed = (rSeed * 16807) % 2147483647;
    return (rSeed - 1) / 2147483646;
  }

  for (const restaurant of restaurants) {
    const cuisineName = restToCuisine[restaurant._id] || 'Other';
    const aliasKey = CUISINE_ALIAS[cuisineName] || cuisineName;

    // Find matching images
    let imagePool = cuisineImages[aliasKey] || cuisineImages['_default'] || [];
    if (imagePool.length === 0) {
      imagePool = cuisineImages['_default'] || [];
    }

    if (imagePool.length > 0) {
      // Pick a random image from the pool
      const idx = Math.floor(nextRand() * imagePool.length);
      const sourceUrl = imagePool[idx].url;
      const cloudinaryUrl = urlToCloudinary[sourceUrl];

      if (cloudinaryUrl) {
        restaurant.cover_image_url = cloudinaryUrl;
        assigned++;
      } else {
        // Source URL wasn't uploaded (failed) - use first available from pool
        for (const img of imagePool) {
          if (urlToCloudinary[img.url]) {
            restaurant.cover_image_url = urlToCloudinary[img.url];
            assigned++;
            break;
          }
        }
        if (!restaurant.cover_image_url) {
          usedDefault++;
        }
      }
    } else {
      usedDefault++;
    }
  }

  // For restaurants that still don't have a cover, use any available image
  if (usedDefault > 0) {
    const allCloudinaryUrls = Object.values(urlToCloudinary).filter(Boolean);
    if (allCloudinaryUrls.length > 0) {
      for (const restaurant of restaurants) {
        if (!restaurant.cover_image_url) {
          const idx = Math.floor(nextRand() * allCloudinaryUrls.length);
          restaurant.cover_image_url = allCloudinaryUrls[idx];
          assigned++;
          usedDefault--;
        }
      }
    }
  }

  // Save updated restaurants
  fs.writeFileSync(path.join(DATA_DIR, 'restaurants.json'), JSON.stringify(restaurants, null, 2) + '\n');

  console.log(`  Assigned: ${assigned}/${restaurants.length}`);
  console.log(`  Still without cover: ${usedDefault}`);
  console.log('  restaurants.json updated');

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Done! Run: docker compose exec api npm run seed');
  console.log('═══════════════════════════════════════════════════════');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
