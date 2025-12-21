const path = require('path');
const DATA = path.join(__dirname, '..', 'data');
const rc = require(path.join(DATA, 'restaurant_cuisines.json'));
const cuisines = require(path.join(DATA, 'cuisines.json'));
const restaurants = require(path.join(DATA, 'restaurants.json'));

const cuisineMap = {};
cuisines.forEach(c => { cuisineMap[c._id] = c.name.en || c.slug; });

const restMap = {};
restaurants.forEach(r => { restMap[r._id] = r.name; });

const restCuisines = {};
rc.forEach(item => {
  if (!restCuisines[item.restaurant_id]) restCuisines[item.restaurant_id] = [];
  restCuisines[item.restaurant_id].push(cuisineMap[item.cuisine_id] || item.cuisine_id);
});

console.log('Restaurants with cuisines:', Object.keys(restCuisines).length);
console.log('Restaurants without cuisines:', restaurants.length - Object.keys(restCuisines).length);

const cuisineCounts = {};
rc.forEach(item => {
  const name = cuisineMap[item.cuisine_id] || item.cuisine_id;
  cuisineCounts[name] = (cuisineCounts[name] || 0) + 1;
});
console.log('\nTop 20 cuisines by restaurant count:');
Object.entries(cuisineCounts).sort((a,b) => b[1]-a[1]).slice(0, 20).forEach(([name, count]) => {
  console.log('  ' + name + ': ' + count);
});

console.log('\nSample restaurant -> cuisines:');
Object.entries(restCuisines).slice(0, 15).forEach(([rid, cuis]) => {
  console.log('  ' + (restMap[rid] || rid).substring(0, 40) + ' -> ' + cuis.join(', '));
});

// Count restaurants without any cuisine mapping
const noCuisine = restaurants.filter(r => !restCuisines[r._id]);
console.log('\nRestaurants without cuisine mapping:', noCuisine.length);
if (noCuisine.length > 0) {
  console.log('First 10:', noCuisine.slice(0, 10).map(r => r.name).join(', '));
}
