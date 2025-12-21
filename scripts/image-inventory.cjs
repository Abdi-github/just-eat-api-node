const fs = require('fs');
const path = require('path');
const dataDir = path.join(__dirname, '..', 'data');

const restaurants = JSON.parse(fs.readFileSync(path.join(dataDir, 'restaurants.json')));
const menuItems = JSON.parse(fs.readFileSync(path.join(dataDir, 'menu_items.json')));
const cuisines = JSON.parse(fs.readFileSync(path.join(dataDir, 'cuisines.json')));
const brands = JSON.parse(fs.readFileSync(path.join(dataDir, 'brands.json')));

const rLogos = restaurants.filter(r => r.logo_url).length;
const rNoLogos = restaurants.filter(r => !r.logo_url).length;
const miImages = menuItems.filter(m => m.image_url).length;
const miNoImages = menuItems.filter(m => !m.image_url).length;
const cImages = cuisines.filter(c => c.image_url).length;
const cNoImages = cuisines.filter(c => !c.image_url).length;
const bImages = brands.filter(b => b.logo_url).length;
const bNoImages = brands.filter(b => !b.logo_url).length;

console.log('=== Image Inventory ===');
console.log('Restaurants with logo:', rLogos, '| without:', rNoLogos);
console.log('Menu items with image:', miImages, '| without:', miNoImages);
console.log('Cuisines with image:', cImages, '| without:', cNoImages);
console.log('Brands with logo:', bImages, '| without:', bNoImages);
console.log('Total images to upload:', rLogos + miImages + cImages + bImages);

const allUrls = [
  ...restaurants.filter(r => r.logo_url).map(r => r.logo_url),
  ...menuItems.filter(m => m.image_url).map(m => m.image_url),
  ...cuisines.filter(c => c.image_url).map(c => c.image_url),
  ...brands.filter(b => b.logo_url).map(b => b.logo_url),
];

const domains = {};
allUrls.forEach(u => {
  try { const d = new URL(u).hostname; domains[d] = (domains[d] || 0) + 1; } catch (e) { /* skip */ }
});
console.log('\nDomains:', JSON.stringify(domains, null, 2));

// Check for unique URLs
const unique = new Set(allUrls);
console.log('\nTotal URLs:', allUrls.length, '| Unique:', unique.size);

// Sample URLs from each type
console.log('\nSample restaurant logo:', restaurants.find(r => r.logo_url)?.logo_url);
console.log('Sample menu item image:', menuItems.find(m => m.image_url)?.image_url);
console.log('Sample cuisine image:', cuisines.find(c => c.image_url)?.image_url);
console.log('Sample brand logo:', brands.find(b => b.logo_url)?.logo_url);
