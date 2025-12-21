const rc = require('../data/restaurant_cuisines.json');
const cuisines = require('../data/cuisines.json');
const restaurants = require('../data/restaurants.json');

const cMap = {};
cuisines.forEach(c => { cMap[c._id] = c.name.en; });

const restCuisine = {};
rc.forEach(r => {
  if (!restCuisine[r.restaurant_id]) restCuisine[r.restaurant_id] = [];
  restCuisine[r.restaurant_id].push(cMap[r.cuisine_id]);
});

const primary = {};
restaurants.forEach(r => {
  const c = (restCuisine[r._id] || ['Other'])[0];
  primary[c] = (primary[c] || 0) + 1;
});

console.log('=== Primary cuisine per restaurant ===');
Object.entries(primary).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
  console.log(String(v).padStart(4), k);
});
console.log('\nTotal:', restaurants.length);
console.log('With cuisine:', Object.values(primary).reduce((a, b) => a + b, 0) - (primary['Other'] || 0));
console.log('Without cuisine (Other):', primary['Other'] || 0);
