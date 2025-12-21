/**
 * Generate realistic seed data for all 380 restaurants:
 * - 80 users (expand from 12)
 * - Menu categories per restaurant (cuisine-appropriate)
 * - Menu items per restaurant (realistic Swiss prices in CHF)
 * - Reviews (8-16 per restaurant, in user's preferred language)
 * - Orders (one per review, since reviews require order_id)
 * - User roles for new users
 *
 * Usage: node scripts/generate-seed-data.cjs
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function readJSON(file) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));
}
function writeJSON(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2) + '\n');
}

// ── ID Generation ──────────────────────────────────────────────────
// Existing IDs use prefix 6993a9f77dcee68d585a + 4 hex chars
// We'll use a different prefix for generated data to avoid collisions
const GEN_PREFIX = '6993b0000000000000';
let idCounter = 0;
function genId() {
  idCounter++;
  return GEN_PREFIX + idCounter.toString(16).padStart(6, '0');
}

// Deterministic seeded random (for reproducibility)
let seed = 42;
function seededRandom() {
  seed = (seed * 16807 + 0) % 2147483647;
  return (seed - 1) / 2147483646;
}
function randInt(min, max) {
  return Math.floor(seededRandom() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[Math.floor(seededRandom() * arr.length)];
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Constants ──────────────────────────────────────────────────────
const LANGUAGES = ['de', 'en', 'fr', 'it'];
const PASSWORD_HASH = '$2b$10$Bsd6Xk7XA4XzvK4HUxS4L.fhaHWQrO6EIWgV/FlUQS7F/6c9b.6tO'; // Password123!
const CUSTOMER_ROLE_ID = '6993a9f77dcee68d585a1106';

// Swiss first names by language preference
const FIRST_NAMES = {
  de: ['Lukas', 'Noah', 'Liam', 'Elias', 'Jonas', 'Leon', 'Finn', 'Matteo', 'Ben', 'David', 'Samuel', 'Nico', 'Tim', 'Felix', 'Jan', 'Marco', 'Stefan', 'Thomas', 'Michael', 'Andreas', 'Mia', 'Emma', 'Lena', 'Sofia', 'Anna', 'Laura', 'Lea', 'Sara', 'Nina', 'Lisa', 'Julia', 'Hannah', 'Chiara', 'Jana', 'Nora'],
  fr: ['Nathan', 'Gabriel', 'Léo', 'Louis', 'Arthur', 'Hugo', 'Jules', 'Lucas', 'Adam', 'Raphaël', 'Théo', 'Maxime', 'Antoine', 'Alexandre', 'Pierre', 'Emma', 'Louise', 'Chloé', 'Alice', 'Léa', 'Manon', 'Camille', 'Inès', 'Sarah', 'Clara', 'Zoé', 'Juliette', 'Jeanne', 'Margaux', 'Pauline'],
  it: ['Leonardo', 'Alessandro', 'Mattia', 'Lorenzo', 'Andrea', 'Diego', 'Francesco', 'Gabriele', 'Luca', 'Marco', 'Giulia', 'Sofia', 'Aurora', 'Giorgia', 'Alice', 'Martina', 'Chiara', 'Sara', 'Elena', 'Anna', 'Valentina', 'Francesca', 'Elisa', 'Alessia', 'Beatrice'],
  en: ['James', 'Oliver', 'William', 'Henry', 'Alexander', 'Daniel', 'Matthew', 'Benjamin', 'Christopher', 'Andrew', 'Emily', 'Charlotte', 'Sophie', 'Amelia', 'Olivia', 'Isabella', 'Jessica', 'Victoria', 'Grace', 'Katherine'],
};

const LAST_NAMES = {
  de: ['Müller', 'Meier', 'Schmid', 'Keller', 'Weber', 'Huber', 'Schneider', 'Meyer', 'Steiner', 'Fischer', 'Gerber', 'Brunner', 'Baumann', 'Frei', 'Zimmermann', 'Moser', 'Widmer', 'Wyss', 'Graf', 'Roth'],
  fr: ['Favre', 'Blanc', 'Martin', 'Dubois', 'Bernard', 'Petit', 'Durand', 'Moreau', 'Laurent', 'Simon', 'Michel', 'Garcia', 'Roux', 'Fontaine', 'Girard', 'Bonnet', 'Dupont', 'Lambert', 'Leroy', 'Perrin'],
  it: ['Rossi', 'Bianchi', 'Ferrari', 'Colombo', 'Romano', 'Ricci', 'Marino', 'Conti', 'Bruno', 'De Luca', 'Costa', 'Mancini', 'Barbieri', 'Fontana', 'Moretti', 'Lombardi', 'Galli', 'Marchetti', 'Serra', 'Rinaldi'],
  en: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Wilson', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Hall', 'Young', 'King'],
};

const SWISS_PHONES_PREFIXES = ['+41 44', '+41 43', '+41 76', '+41 77', '+41 78', '+41 79', '+41 21', '+41 22', '+41 31', '+41 61', '+41 91'];

// ════════════════════════════════════════════════════════════════════
// CUISINE-BASED MENU TEMPLATES
// Each cuisine type maps to categories with items
// ════════════════════════════════════════════════════════════════════

const MENU_TEMPLATES = {
  Pizza: {
    categories: [
      { en: 'Classic Pizzas', fr: 'Pizzas Classiques', de: 'Klassische Pizzen', it: 'Pizze Classiche', slug: 'classic-pizzas', items: [
        { name: { en: 'Margherita', fr: 'Margherita', de: 'Margherita', it: 'Margherita' }, desc: { en: 'Tomato sauce, mozzarella, fresh basil', fr: 'Sauce tomate, mozzarella, basilic frais', de: 'Tomatensauce, Mozzarella, frisches Basilikum', it: 'Salsa di pomodoro, mozzarella, basilico fresco' }, price: [14.50, 16.50] },
        { name: { en: 'Napoli', fr: 'Napoli', de: 'Napoli', it: 'Napoli' }, desc: { en: 'Tomato sauce, mozzarella, anchovies, capers, olives', fr: 'Sauce tomate, mozzarella, anchois, câpres, olives', de: 'Tomatensauce, Mozzarella, Sardellen, Kapern, Oliven', it: 'Salsa di pomodoro, mozzarella, acciughe, capperi, olive' }, price: [17.50, 19.50] },
        { name: { en: 'Prosciutto', fr: 'Prosciutto', de: 'Prosciutto', it: 'Prosciutto' }, desc: { en: 'Tomato sauce, mozzarella, Italian ham', fr: 'Sauce tomate, mozzarella, jambon italien', de: 'Tomatensauce, Mozzarella, italienischer Schinken', it: 'Salsa di pomodoro, mozzarella, prosciutto cotto' }, price: [18.00, 20.00] },
        { name: { en: 'Quattro Formaggi', fr: 'Quatre Fromages', de: 'Vier Käse', it: 'Quattro Formaggi' }, desc: { en: 'Mozzarella, gorgonzola, parmesan, emmental', fr: 'Mozzarella, gorgonzola, parmesan, emmental', de: 'Mozzarella, Gorgonzola, Parmesan, Emmentaler', it: 'Mozzarella, gorgonzola, parmigiano, emmental' }, price: [19.50, 22.00] },
        { name: { en: 'Diavola', fr: 'Diavola', de: 'Diavola', it: 'Diavola' }, desc: { en: 'Tomato sauce, mozzarella, spicy salami, chili', fr: 'Sauce tomate, mozzarella, salami piquant, piment', de: 'Tomatensauce, Mozzarella, scharfe Salami, Chili', it: 'Salsa di pomodoro, mozzarella, salame piccante, peperoncino' }, price: [18.50, 21.00] },
      ]},
      { en: 'Special Pizzas', fr: 'Pizzas Spéciales', de: 'Spezial-Pizzen', it: 'Pizze Speciali', slug: 'special-pizzas', items: [
        { name: { en: 'Calzone', fr: 'Calzone', de: 'Calzone', it: 'Calzone' }, desc: { en: 'Folded pizza with ham, mushrooms, mozzarella', fr: 'Pizza pliée avec jambon, champignons, mozzarella', de: 'Gefaltete Pizza mit Schinken, Pilzen, Mozzarella', it: 'Pizza chiusa con prosciutto, funghi, mozzarella' }, price: [19.50, 22.50] },
        { name: { en: 'Pizza Tonno', fr: 'Pizza Tonno', de: 'Pizza Tonno', it: 'Pizza Tonno' }, desc: { en: 'Tomato sauce, tuna, onions, olives', fr: 'Sauce tomate, thon, oignons, olives', de: 'Tomatensauce, Thunfisch, Zwiebeln, Oliven', it: 'Salsa di pomodoro, tonno, cipolle, olive' }, price: [19.00, 21.00] },
        { name: { en: 'Truffle Pizza', fr: 'Pizza à la Truffe', de: 'Trüffel-Pizza', it: 'Pizza al Tartufo' }, desc: { en: 'Truffle cream, mozzarella, mushrooms, arugula', fr: 'Crème de truffe, mozzarella, champignons, roquette', de: 'Trüffelcreme, Mozzarella, Pilze, Rucola', it: 'Crema di tartufo, mozzarella, funghi, rucola' }, price: [24.50, 27.50] },
      ]},
      { en: 'Salads', fr: 'Salades', de: 'Salate', it: 'Insalate', slug: 'salads', items: [
        { name: { en: 'Mixed Salad', fr: 'Salade Mixte', de: 'Gemischter Salat', it: 'Insalata Mista' }, desc: { en: 'Fresh seasonal salad with house dressing', fr: 'Salade fraîche de saison avec vinaigrette maison', de: 'Frischer Saisonsalat mit Hausdressing', it: 'Insalata fresca di stagione con condimento della casa' }, price: [9.50, 12.50] },
        { name: { en: 'Caprese Salad', fr: 'Salade Caprese', de: 'Caprese-Salat', it: 'Insalata Caprese' }, desc: { en: 'Buffalo mozzarella, tomatoes, basil, olive oil', fr: 'Mozzarella di bufala, tomates, basilic, huile d\'olive', de: 'Büffelmozzarella, Tomaten, Basilikum, Olivenöl', it: 'Mozzarella di bufala, pomodori, basilico, olio d\'oliva' }, price: [14.50, 16.50] },
      ]},
      { en: 'Drinks', fr: 'Boissons', de: 'Getränke', it: 'Bevande', slug: 'drinks', items: [
        { name: { en: 'Coca-Cola 33cl', fr: 'Coca-Cola 33cl', de: 'Coca-Cola 33cl', it: 'Coca-Cola 33cl' }, desc: { en: '', fr: '', de: '', it: '' }, price: [3.50, 4.50] },
        { name: { en: 'Sparkling Water 50cl', fr: 'Eau Gazeuse 50cl', de: 'Mineralwasser 50cl', it: 'Acqua Frizzante 50cl' }, desc: { en: '', fr: '', de: '', it: '' }, price: [3.00, 4.00] },
        { name: { en: 'Ice Tea 33cl', fr: 'Ice Tea 33cl', de: 'Eistee 33cl', it: 'Ice Tea 33cl' }, desc: { en: 'Lemon or peach', fr: 'Citron ou pêche', de: 'Zitrone oder Pfirsich', it: 'Limone o pesca' }, price: [3.50, 4.50] },
      ]},
    ]
  },

  Burger: {
    categories: [
      { en: 'Classic Burgers', fr: 'Burgers Classiques', de: 'Klassische Burger', it: 'Burger Classici', slug: 'classic-burgers', items: [
        { name: { en: 'Classic Cheeseburger', fr: 'Cheeseburger Classique', de: 'Klassischer Cheeseburger', it: 'Cheeseburger Classico' }, desc: { en: 'Beef patty, cheddar, lettuce, tomato, pickles, house sauce', fr: 'Steak de bœuf, cheddar, laitue, tomate, cornichons, sauce maison', de: 'Rindfleisch-Patty, Cheddar, Salat, Tomate, Gurken, Haussauce', it: 'Hamburger di manzo, cheddar, lattuga, pomodoro, cetriolini, salsa della casa' }, price: [15.90, 18.90] },
        { name: { en: 'Bacon Burger', fr: 'Burger au Bacon', de: 'Bacon Burger', it: 'Burger con Pancetta' }, desc: { en: 'Beef patty, crispy bacon, cheddar, BBQ sauce', fr: 'Steak de bœuf, bacon croustillant, cheddar, sauce BBQ', de: 'Rindfleisch-Patty, knuspriger Bacon, Cheddar, BBQ-Sauce', it: 'Hamburger di manzo, pancetta croccante, cheddar, salsa BBQ' }, price: [18.90, 21.90] },
        { name: { en: 'Double Smash Burger', fr: 'Double Smash Burger', de: 'Doppelter Smash Burger', it: 'Double Smash Burger' }, desc: { en: 'Two smashed beef patties, American cheese, onions, special sauce', fr: 'Deux steaks smashés, fromage américain, oignons, sauce spéciale', de: 'Zwei gesmashte Rindfleisch-Patties, amerikanischer Käse, Zwiebeln, Spezialsauce', it: 'Due hamburger schiacciati, formaggio americano, cipolle, salsa speciale' }, price: [21.90, 24.90] },
        { name: { en: 'Swiss Burger', fr: 'Burger Suisse', de: 'Schweizer Burger', it: 'Burger Svizzero' }, desc: { en: 'Beef patty, Gruyère, rösti, mushrooms, alpine herb sauce', fr: 'Steak de bœuf, Gruyère, rösti, champignons, sauce aux herbes alpines', de: 'Rindfleisch-Patty, Gruyère, Rösti, Pilze, Alpenkräutersauce', it: 'Hamburger di manzo, Gruyère, rösti, funghi, salsa alle erbe alpine' }, price: [22.50, 25.90] },
      ]},
      { en: 'Chicken Burgers', fr: 'Burgers au Poulet', de: 'Chicken Burger', it: 'Burger di Pollo', slug: 'chicken-burgers', items: [
        { name: { en: 'Crispy Chicken Burger', fr: 'Burger Poulet Croustillant', de: 'Crispy Chicken Burger', it: 'Burger di Pollo Croccante' }, desc: { en: 'Crispy chicken breast, coleslaw, pickles, mayo', fr: 'Poitrine de poulet croustillante, coleslaw, cornichons, mayo', de: 'Knuspriges Hähnchenbrust, Coleslaw, Gurken, Mayo', it: 'Petto di pollo croccante, coleslaw, cetriolini, maionese' }, price: [16.90, 19.90] },
        { name: { en: 'Spicy Chicken Burger', fr: 'Burger Poulet Épicé', de: 'Scharfer Chicken Burger', it: 'Burger di Pollo Piccante' }, desc: { en: 'Spicy chicken, jalapeños, pepper jack cheese, sriracha mayo', fr: 'Poulet épicé, jalapeños, fromage pepper jack, mayo sriracha', de: 'Scharfes Hähnchen, Jalapeños, Pepper-Jack-Käse, Sriracha-Mayo', it: 'Pollo piccante, jalapeños, formaggio pepper jack, maionese sriracha' }, price: [18.90, 21.90] },
      ]},
      { en: 'Sides', fr: 'Accompagnements', de: 'Beilagen', it: 'Contorni', slug: 'sides', items: [
        { name: { en: 'French Fries', fr: 'Frites', de: 'Pommes Frites', it: 'Patatine Fritte' }, desc: { en: 'Crispy golden fries with sea salt', fr: 'Frites dorées croustillantes avec sel marin', de: 'Knusprige goldene Pommes mit Meersalz', it: 'Patatine dorate croccanti con sale marino' }, price: [5.90, 7.90] },
        { name: { en: 'Sweet Potato Fries', fr: 'Frites de Patate Douce', de: 'Süsskartoffel-Pommes', it: 'Patatine di Patata Dolce' }, desc: { en: 'Crispy sweet potato fries with aioli', fr: 'Frites de patate douce croustillantes avec aïoli', de: 'Knusprige Süsskartoffel-Pommes mit Aioli', it: 'Patatine di patata dolce croccanti con aioli' }, price: [7.90, 9.90] },
        { name: { en: 'Onion Rings', fr: 'Rondelles d\'Oignon', de: 'Zwiebelringe', it: 'Anelli di Cipolla' }, desc: { en: 'Beer-battered onion rings', fr: 'Rondelles d\'oignon en pâte à bière', de: 'Bierteig-Zwiebelringe', it: 'Anelli di cipolla in pastella alla birra' }, price: [6.90, 8.90] },
      ]},
      { en: 'Drinks', fr: 'Boissons', de: 'Getränke', it: 'Bevande', slug: 'drinks', items: [
        { name: { en: 'Coca-Cola 33cl', fr: 'Coca-Cola 33cl', de: 'Coca-Cola 33cl', it: 'Coca-Cola 33cl' }, desc: { en: '', fr: '', de: '', it: '' }, price: [3.50, 4.50] },
        { name: { en: 'Sparkling Water 50cl', fr: 'Eau Gazeuse 50cl', de: 'Mineralwasser 50cl', it: 'Acqua Frizzante 50cl' }, desc: { en: '', fr: '', de: '', it: '' }, price: [3.00, 4.00] },
      ]},
    ]
  },

  Italian: {
    categories: [
      { en: 'Pasta', fr: 'Pâtes', de: 'Pasta', it: 'Pasta', slug: 'pasta', items: [
        { name: { en: 'Spaghetti Bolognese', fr: 'Spaghetti Bolognaise', de: 'Spaghetti Bolognese', it: 'Spaghetti alla Bolognese' }, desc: { en: 'Classic meat sauce with parmesan', fr: 'Sauce classique à la viande avec parmesan', de: 'Klassische Fleischsauce mit Parmesan', it: 'Classico ragù di carne con parmigiano' }, price: [17.50, 20.50] },
        { name: { en: 'Penne Arrabiata', fr: 'Penne Arrabiata', de: 'Penne Arrabiata', it: 'Penne all\'Arrabbiata' }, desc: { en: 'Spicy tomato sauce with garlic and chili', fr: 'Sauce tomate épicée à l\'ail et piment', de: 'Scharfe Tomatensauce mit Knoblauch und Chili', it: 'Salsa di pomodoro piccante con aglio e peperoncino' }, price: [16.50, 19.00] },
        { name: { en: 'Lasagna', fr: 'Lasagne', de: 'Lasagne', it: 'Lasagna' }, desc: { en: 'Layers of pasta, meat sauce, béchamel, mozzarella', fr: 'Couches de pâtes, sauce viande, béchamel, mozzarella', de: 'Schichten von Pasta, Fleischsauce, Béchamel, Mozzarella', it: 'Strati di pasta, ragù, besciamella, mozzarella' }, price: [19.50, 22.50] },
        { name: { en: 'Risotto ai Funghi', fr: 'Risotto aux Champignons', de: 'Pilz-Risotto', it: 'Risotto ai Funghi' }, desc: { en: 'Creamy risotto with mixed mushrooms and parmesan', fr: 'Risotto crémeux aux champignons mélangés et parmesan', de: 'Cremiges Risotto mit gemischten Pilzen und Parmesan', it: 'Risotto cremoso con funghi misti e parmigiano' }, price: [21.50, 24.50] },
      ]},
      { en: 'Starters', fr: 'Entrées', de: 'Vorspeisen', it: 'Antipasti', slug: 'starters', items: [
        { name: { en: 'Bruschetta', fr: 'Bruschetta', de: 'Bruschetta', it: 'Bruschetta' }, desc: { en: 'Toasted bread with fresh tomatoes, garlic, basil', fr: 'Pain grillé avec tomates fraîches, ail, basilic', de: 'Geröstetes Brot mit frischen Tomaten, Knoblauch, Basilikum', it: 'Pane tostato con pomodori freschi, aglio, basilico' }, price: [8.50, 11.50] },
        { name: { en: 'Minestrone', fr: 'Minestrone', de: 'Minestrone', it: 'Minestrone' }, desc: { en: 'Italian vegetable soup with pasta', fr: 'Soupe italienne aux légumes avec pâtes', de: 'Italienische Gemüsesuppe mit Pasta', it: 'Zuppa italiana di verdure con pasta' }, price: [9.50, 12.00] },
      ]},
      { en: 'Desserts', fr: 'Desserts', de: 'Desserts', it: 'Dolci', slug: 'desserts', items: [
        { name: { en: 'Tiramisu', fr: 'Tiramisu', de: 'Tiramisu', it: 'Tiramisù' }, desc: { en: 'Classic Italian coffee dessert', fr: 'Dessert italien classique au café', de: 'Klassisches italienisches Kaffee-Dessert', it: 'Classico dolce italiano al caffè' }, price: [8.50, 11.50] },
        { name: { en: 'Panna Cotta', fr: 'Panna Cotta', de: 'Panna Cotta', it: 'Panna Cotta' }, desc: { en: 'Vanilla cream with berry coulis', fr: 'Crème à la vanille avec coulis de fruits rouges', de: 'Vanillecreme mit Beerencoulis', it: 'Crema alla vaniglia con coulis di frutti di bosco' }, price: [7.50, 10.00] },
      ]},
      { en: 'Drinks', fr: 'Boissons', de: 'Getränke', it: 'Bevande', slug: 'drinks', items: [
        { name: { en: 'Coca-Cola 33cl', fr: 'Coca-Cola 33cl', de: 'Coca-Cola 33cl', it: 'Coca-Cola 33cl' }, desc: { en: '', fr: '', de: '', it: '' }, price: [3.50, 4.50] },
        { name: { en: 'San Pellegrino 50cl', fr: 'San Pellegrino 50cl', de: 'San Pellegrino 50cl', it: 'San Pellegrino 50cl' }, desc: { en: '', fr: '', de: '', it: '' }, price: [4.50, 5.50] },
      ]},
    ]
  },

  Indian: {
    categories: [
      { en: 'Curry', fr: 'Curry', de: 'Curry', it: 'Curry', slug: 'curry', items: [
        { name: { en: 'Chicken Tikka Masala', fr: 'Chicken Tikka Masala', de: 'Chicken Tikka Masala', it: 'Chicken Tikka Masala' }, desc: { en: 'Tender chicken in creamy tomato-spiced sauce', fr: 'Poulet tendre dans une sauce crémeuse tomate-épicée', de: 'Zartes Hähnchen in cremiger Tomaten-Gewürzsauce', it: 'Pollo tenero in salsa cremosa di pomodoro speziata' }, price: [22.50, 26.50] },
        { name: { en: 'Butter Chicken', fr: 'Poulet au Beurre', de: 'Butter Chicken', it: 'Pollo al Burro' }, desc: { en: 'Chicken in rich buttery tomato cream sauce', fr: 'Poulet dans une sauce crémeuse au beurre et tomate', de: 'Hähnchen in reichhaltiger Butter-Tomaten-Sahnesauce', it: 'Pollo in ricca salsa cremosa di pomodoro e burro' }, price: [23.50, 27.50] },
        { name: { en: 'Lamb Rogan Josh', fr: 'Agneau Rogan Josh', de: 'Lamm Rogan Josh', it: 'Agnello Rogan Josh' }, desc: { en: 'Slow-cooked lamb in aromatic Kashmiri sauce', fr: 'Agneau mijoté dans une sauce aromatique du Cachemire', de: 'Langsam geschmortes Lamm in aromatischer Kaschmir-Sauce', it: 'Agnello cotto lentamente in salsa aromatica del Kashmir' }, price: [26.50, 30.50] },
        { name: { en: 'Palak Paneer', fr: 'Palak Paneer', de: 'Palak Paneer', it: 'Palak Paneer' }, desc: { en: 'Cottage cheese in creamy spinach sauce', fr: 'Fromage cottage dans une sauce crémeuse aux épinards', de: 'Paneer-Käse in cremiger Spinatsauce', it: 'Formaggio fresco in salsa cremosa di spinaci' }, price: [19.50, 23.50] },
        { name: { en: 'Dal Makhani', fr: 'Dal Makhani', de: 'Dal Makhani', it: 'Dal Makhani' }, desc: { en: 'Black lentils simmered in spiced butter cream', fr: 'Lentilles noires mijotées dans une crème au beurre épicé', de: 'Schwarze Linsen in gewürzter Buttercreme', it: 'Lenticchie nere in crema di burro speziato' }, price: [17.50, 21.00] },
      ]},
      { en: 'Tandoori', fr: 'Tandoori', de: 'Tandoori', it: 'Tandoori', slug: 'tandoori', items: [
        { name: { en: 'Tandoori Chicken', fr: 'Poulet Tandoori', de: 'Tandoori-Hähnchen', it: 'Pollo Tandoori' }, desc: { en: 'Marinated chicken roasted in tandoor oven', fr: 'Poulet mariné rôti au four tandoor', de: 'Mariniertes Hähnchen aus dem Tandoor-Ofen', it: 'Pollo marinato cotto nel forno tandoor' }, price: [21.50, 25.50] },
        { name: { en: 'Seekh Kebab', fr: 'Brochette Seekh', de: 'Seekh Kebab', it: 'Seekh Kebab' }, desc: { en: 'Spiced minced lamb skewers', fr: 'Brochettes d\'agneau haché épicé', de: 'Gewürzte Lammhack-Spiesse', it: 'Spiedini di agnello macinato speziato' }, price: [18.50, 22.50] },
      ]},
      { en: 'Bread & Rice', fr: 'Pain & Riz', de: 'Brot & Reis', it: 'Pane & Riso', slug: 'bread-rice', items: [
        { name: { en: 'Garlic Naan', fr: 'Naan à l\'Ail', de: 'Knoblauch-Naan', it: 'Naan all\'Aglio' }, desc: { en: 'Freshly baked garlic flatbread', fr: 'Pain plat à l\'ail fraîchement cuit', de: 'Frisch gebackenes Knoblauch-Fladenbrot', it: 'Pane all\'aglio appena sfornato' }, price: [4.50, 6.50] },
        { name: { en: 'Biryani Rice', fr: 'Riz Biryani', de: 'Biryani-Reis', it: 'Riso Biryani' }, desc: { en: 'Fragrant basmati rice with saffron and spices', fr: 'Riz basmati parfumé au safran et aux épices', de: 'Duftender Jasminreis mit Safran und Gewürzen', it: 'Riso basmati profumato allo zafferano e spezie' }, price: [5.50, 7.50] },
      ]},
      { en: 'Drinks', fr: 'Boissons', de: 'Getränke', it: 'Bevande', slug: 'drinks', items: [
        { name: { en: 'Mango Lassi', fr: 'Lassi à la Mangue', de: 'Mango-Lassi', it: 'Lassi al Mango' }, desc: { en: 'Creamy yogurt drink with mango', fr: 'Boisson crémeuse au yaourt et mangue', de: 'Cremiges Joghurtgetränk mit Mango', it: 'Bevanda cremosa allo yogurt con mango' }, price: [5.50, 7.50] },
        { name: { en: 'Masala Chai', fr: 'Chai Masala', de: 'Masala Chai', it: 'Chai Masala' }, desc: { en: 'Spiced Indian tea with milk', fr: 'Thé indien épicé au lait', de: 'Gewürzter indischer Tee mit Milch', it: 'Tè indiano speziato con latte' }, price: [4.50, 6.00] },
      ]},
    ]
  },

  Asian: {
    categories: [
      { en: 'Noodles & Rice', fr: 'Nouilles & Riz', de: 'Nudeln & Reis', it: 'Noodles & Riso', slug: 'noodles-rice', items: [
        { name: { en: 'Pad Thai', fr: 'Pad Thaï', de: 'Pad Thai', it: 'Pad Thai' }, desc: { en: 'Stir-fried rice noodles with shrimp, peanuts, bean sprouts', fr: 'Nouilles de riz sautées avec crevettes, cacahuètes, germes de soja', de: 'Gebratene Reisnudeln mit Shrimps, Erdnüssen, Sojasprossen', it: 'Noodles di riso saltati con gamberetti, arachidi, germogli di soia' }, price: [19.50, 23.50] },
        { name: { en: 'Fried Rice', fr: 'Riz Sauté', de: 'Gebratener Reis', it: 'Riso Fritto' }, desc: { en: 'Wok-fried rice with vegetables and egg', fr: 'Riz sauté au wok avec légumes et œuf', de: 'Wok-gebratener Reis mit Gemüse und Ei', it: 'Riso saltato al wok con verdure e uovo' }, price: [16.50, 19.50] },
        { name: { en: 'Singapore Noodles', fr: 'Nouilles Singapour', de: 'Singapur-Nudeln', it: 'Noodles di Singapore' }, desc: { en: 'Curry-spiced vermicelli with shrimp and vegetables', fr: 'Vermicelles épicés au curry avec crevettes et légumes', de: 'Curryvermicelli mit Garnelen und Gemüse', it: 'Vermicelli al curry con gamberetti e verdure' }, price: [18.50, 22.00] },
      ]},
      { en: 'Starters', fr: 'Entrées', de: 'Vorspeisen', it: 'Antipasti', slug: 'starters', items: [
        { name: { en: 'Spring Rolls (4pc)', fr: 'Rouleaux de Printemps (4pcs)', de: 'Frühlingsrollen (4 Stk.)', it: 'Involtini Primavera (4pz)' }, desc: { en: 'Crispy vegetable spring rolls with sweet chili sauce', fr: 'Rouleaux de printemps croustillants aux légumes avec sauce chili douce', de: 'Knusprige Gemüse-Frühlingsrollen mit süsser Chilisauce', it: 'Involtini primavera croccanti con salsa chili dolce' }, price: [7.90, 10.50] },
        { name: { en: 'Edamame', fr: 'Edamame', de: 'Edamame', it: 'Edamame' }, desc: { en: 'Steamed soybeans with sea salt', fr: 'Fèves de soja cuites à la vapeur avec sel marin', de: 'Gedämpfte Sojabohnen mit Meersalz', it: 'Fagioli di soia al vapore con sale marino' }, price: [6.50, 8.50] },
        { name: { en: 'Gyoza (6pc)', fr: 'Gyoza (6pcs)', de: 'Gyoza (6 Stk.)', it: 'Gyoza (6pz)' }, desc: { en: 'Pan-fried Japanese dumplings with dipping sauce', fr: 'Raviolis japonais grillés avec sauce', de: 'Gebratene japanische Teigtaschen mit Dip-Sauce', it: 'Ravioli giapponesi alla piastra con salsa' }, price: [9.50, 12.50] },
      ]},
      { en: 'Main Courses', fr: 'Plats Principaux', de: 'Hauptgerichte', it: 'Piatti Principali', slug: 'main-courses', items: [
        { name: { en: 'Sweet & Sour Chicken', fr: 'Poulet Aigre-Doux', de: 'Süss-Sauer Hähnchen', it: 'Pollo Agrodolce' }, desc: { en: 'Crispy chicken in sweet and sour sauce with pineapple', fr: 'Poulet croustillant en sauce aigre-douce avec ananas', de: 'Knuspriges Hähnchen in Süss-Sauer-Sauce mit Ananas', it: 'Pollo croccante in salsa agrodolce con ananas' }, price: [19.50, 23.50] },
        { name: { en: 'Green Curry', fr: 'Curry Vert', de: 'Grünes Curry', it: 'Curry Verde' }, desc: { en: 'Thai green curry with coconut milk', fr: 'Curry vert thaï au lait de coco', de: 'Thai-Grüncurry mit Kokosmilch', it: 'Curry verde thailandese con latte di cocco' }, price: [21.50, 25.50] },
      ]},
      { en: 'Drinks', fr: 'Boissons', de: 'Getränke', it: 'Bevande', slug: 'drinks', items: [
        { name: { en: 'Thai Iced Tea', fr: 'Thé Glacé Thaï', de: 'Thai Eistee', it: 'Tè Freddo Thai' }, desc: { en: 'Sweet Thai tea with condensed milk', fr: 'Thé thaï sucré avec lait concentré', de: 'Süsser Thai-Tee mit Kondensmilch', it: 'Tè thailandese dolce con latte condensato' }, price: [5.50, 7.50] },
        { name: { en: 'Coconut Water', fr: 'Eau de Coco', de: 'Kokoswasser', it: 'Acqua di Cocco' }, desc: { en: '', fr: '', de: '', it: '' }, price: [4.50, 6.00] },
      ]},
    ]
  },

  Kebab: {
    categories: [
      { en: 'Kebab', fr: 'Kebab', de: 'Kebab', it: 'Kebab', slug: 'kebab', items: [
        { name: { en: 'Döner Kebab', fr: 'Döner Kebab', de: 'Döner Kebab', it: 'Döner Kebab' }, desc: { en: 'Sliced lamb/beef in pita with salad, garlic and chili sauce', fr: 'Viande tranchée en pita avec salade, sauce ail et piment', de: 'Geschnittenes Fleisch im Fladenbrot mit Salat, Knoblauch- und Chilisauce', it: 'Carne affettata in pita con insalata, salsa all\'aglio e peperoncino' }, price: [12.50, 15.50] },
        { name: { en: 'Chicken Döner', fr: 'Döner au Poulet', de: 'Chicken Döner', it: 'Döner di Pollo' }, desc: { en: 'Grilled chicken in pita with fresh vegetables', fr: 'Poulet grillé en pita avec légumes frais', de: 'Gegrilltes Hähnchen im Fladenbrot mit frischem Gemüse', it: 'Pollo grigliato in pita con verdure fresche' }, price: [13.50, 16.50] },
        { name: { en: 'Kebab Plate', fr: 'Assiette Kebab', de: 'Kebab-Teller', it: 'Piatto Kebab' }, desc: { en: 'Döner meat with rice, salad, and sauce', fr: 'Viande döner avec riz, salade et sauce', de: 'Döner-Fleisch mit Reis, Salat und Sauce', it: 'Carne döner con riso, insalata e salsa' }, price: [18.50, 22.00] },
        { name: { en: 'Falafel Wrap', fr: 'Wrap aux Falafels', de: 'Falafel-Wrap', it: 'Wrap ai Falafel' }, desc: { en: 'Crispy falafel with hummus, salad, tahini', fr: 'Falafels croustillants avec houmous, salade, tahini', de: 'Knusprige Falafel mit Hummus, Salat, Tahini', it: 'Falafel croccanti con hummus, insalata, tahini' }, price: [13.50, 16.00] },
      ]},
      { en: 'Dürüm & Wraps', fr: 'Dürüm & Wraps', de: 'Dürüm & Wraps', it: 'Dürüm & Wraps', slug: 'durum-wraps', items: [
        { name: { en: 'Dürüm Kebab', fr: 'Dürüm Kebab', de: 'Dürüm Kebab', it: 'Dürüm Kebab' }, desc: { en: 'Döner meat wrapped in thin lavash bread', fr: 'Viande döner enroulée dans du pain lavash fin', de: 'Döner-Fleisch in dünnem Lavash-Brot', it: 'Carne döner avvolta in pane lavash sottile' }, price: [13.50, 16.50] },
        { name: { en: 'Lahmacun', fr: 'Lahmacun', de: 'Lahmacun', it: 'Lahmacun' }, desc: { en: 'Turkish flatbread with minced meat', fr: 'Pain plat turc à la viande hachée', de: 'Türkisches Fladenbrot mit Hackfleisch', it: 'Pane turco con carne macinata' }, price: [9.50, 12.50] },
      ]},
      { en: 'Sides & Drinks', fr: 'Accomp. & Boissons', de: 'Beilagen & Getränke', it: 'Contorni & Bevande', slug: 'sides-drinks', items: [
        { name: { en: 'Hummus', fr: 'Houmous', de: 'Hummus', it: 'Hummus' }, desc: { en: 'Chickpea dip with olive oil and pita', fr: 'Pois chiches en purée avec huile d\'olive et pita', de: 'Kichererbsen-Dip mit Olivenöl und Pita', it: 'Crema di ceci con olio d\'oliva e pita' }, price: [6.50, 8.50] },
        { name: { en: 'Ayran', fr: 'Ayran', de: 'Ayran', it: 'Ayran' }, desc: { en: 'Traditional Turkish yogurt drink', fr: 'Boisson traditionnelle turque au yaourt', de: 'Traditionelles türkisches Joghurtgetränk', it: 'Bevanda tradizionale turca allo yogurt' }, price: [3.50, 5.00] },
      ]},
    ]
  },

  Mexican: {
    categories: [
      { en: 'Tacos & Burritos', fr: 'Tacos & Burritos', de: 'Tacos & Burritos', it: 'Tacos & Burritos', slug: 'tacos-burritos', items: [
        { name: { en: 'Beef Tacos (3pc)', fr: 'Tacos au Bœuf (3pcs)', de: 'Rindfleisch-Tacos (3 Stk.)', it: 'Tacos di Manzo (3pz)' }, desc: { en: 'Corn tortillas, seasoned beef, salsa, guacamole, cilantro', fr: 'Tortillas de maïs, bœuf assaisonné, salsa, guacamole, coriandre', de: 'Mais-Tortillas, gewürztes Rindfleisch, Salsa, Guacamole, Koriander', it: 'Tortillas di mais, manzo condito, salsa, guacamole, coriandolo' }, price: [16.50, 19.50] },
        { name: { en: 'Chicken Burrito', fr: 'Burrito au Poulet', de: 'Chicken Burrito', it: 'Burrito di Pollo' }, desc: { en: 'Flour tortilla, grilled chicken, black beans, rice, sour cream', fr: 'Tortilla de blé, poulet grillé, haricots noirs, riz, crème fraîche', de: 'Weizen-Tortilla, gegrilltes Hähnchen, schwarze Bohnen, Reis, Sauerrahm', it: 'Tortilla di grano, pollo grigliato, fagioli neri, riso, panna acida' }, price: [17.50, 20.50] },
        { name: { en: 'Quesadilla', fr: 'Quesadilla', de: 'Quesadilla', it: 'Quesadilla' }, desc: { en: 'Grilled tortilla with melted cheese, chicken, peppers', fr: 'Tortilla grillée avec fromage fondu, poulet, poivrons', de: 'Gegrillte Tortilla mit geschmolzenem Käse, Hähnchen, Paprika', it: 'Tortilla grigliata con formaggio fuso, pollo, peperoni' }, price: [15.50, 18.50] },
      ]},
      { en: 'Nachos & Sides', fr: 'Nachos & Accomp.', de: 'Nachos & Beilagen', it: 'Nachos & Contorni', slug: 'nachos-sides', items: [
        { name: { en: 'Loaded Nachos', fr: 'Nachos Garnis', de: 'Loaded Nachos', it: 'Nachos Ricchi' }, desc: { en: 'Tortilla chips, cheese, jalapeños, guacamole, sour cream', fr: 'Chips tortilla, fromage, jalapeños, guacamole, crème fraîche', de: 'Tortilla-Chips, Käse, Jalapeños, Guacamole, Sauerrahm', it: 'Chips di tortilla, formaggio, jalapeños, guacamole, panna acida' }, price: [13.50, 16.50] },
        { name: { en: 'Guacamole & Chips', fr: 'Guacamole & Chips', de: 'Guacamole & Chips', it: 'Guacamole & Chips' }, desc: { en: 'Fresh guacamole with tortilla chips', fr: 'Guacamole frais avec chips tortilla', de: 'Frisches Guacamole mit Tortilla-Chips', it: 'Guacamole fresco con chips di tortilla' }, price: [9.50, 12.50] },
      ]},
      { en: 'Drinks', fr: 'Boissons', de: 'Getränke', it: 'Bevande', slug: 'drinks', items: [
        { name: { en: 'Horchata', fr: 'Horchata', de: 'Horchata', it: 'Horchata' }, desc: { en: 'Traditional rice milk drink with cinnamon', fr: 'Boisson traditionnelle au lait de riz et cannelle', de: 'Traditionelles Reismilchgetränk mit Zimt', it: 'Bevanda tradizionale di latte di riso con cannella' }, price: [5.50, 7.00] },
        { name: { en: 'Jarritos', fr: 'Jarritos', de: 'Jarritos', it: 'Jarritos' }, desc: { en: 'Mexican fruit soda', fr: 'Soda aux fruits mexicain', de: 'Mexikanische Fruchtlimonade', it: 'Bibita alla frutta messicana' }, price: [4.50, 6.00] },
      ]},
    ]
  },

  Sushi: {
    categories: [
      { en: 'Sushi Sets', fr: 'Plateaux de Sushi', de: 'Sushi-Sets', it: 'Set di Sushi', slug: 'sushi-sets', items: [
        { name: { en: 'Salmon Sushi Set (12pc)', fr: 'Plateau Saumon (12pcs)', de: 'Lachs-Sushi-Set (12 Stk.)', it: 'Set Salmone (12pz)' }, desc: { en: 'Mixed salmon nigiri, maki, and california rolls', fr: 'Assortiment de nigiri, maki et california au saumon', de: 'Gemischte Lachs-Nigiri, Maki und California Rolls', it: 'Assortimento di nigiri, maki e california al salmone' }, price: [24.50, 29.50] },
        { name: { en: 'Mixed Sushi Box (18pc)', fr: 'Box Mixte (18pcs)', de: 'Gemischte Sushi-Box (18 Stk.)', it: 'Box Misto (18pz)' }, desc: { en: 'Assorted nigiri, maki, inside-out rolls', fr: 'Assortiment de nigiri, maki, inside-out rolls', de: 'Sortierte Nigiri, Maki, Inside-Out Rolls', it: 'Assortimento di nigiri, maki, inside-out rolls' }, price: [32.50, 38.50] },
      ]},
      { en: 'Maki & Rolls', fr: 'Maki & Rolls', de: 'Maki & Rolls', it: 'Maki & Rolls', slug: 'maki-rolls', items: [
        { name: { en: 'Salmon Maki (6pc)', fr: 'Maki Saumon (6pcs)', de: 'Lachs-Maki (6 Stk.)', it: 'Maki Salmone (6pz)' }, desc: { en: 'Fresh salmon, sushi rice, nori', fr: 'Saumon frais, riz à sushi, nori', de: 'Frischer Lachs, Sushi-Reis, Nori', it: 'Salmone fresco, riso per sushi, nori' }, price: [9.50, 12.50] },
        { name: { en: 'California Roll (8pc)', fr: 'California Roll (8pcs)', de: 'California Roll (8 Stk.)', it: 'California Roll (8pz)' }, desc: { en: 'Crab, avocado, cucumber, sesame seeds', fr: 'Crabe, avocat, concombre, graines de sésame', de: 'Krabben, Avocado, Gurke, Sesam', it: 'Granchio, avocado, cetriolo, semi di sesamo' }, price: [12.50, 15.50] },
        { name: { en: 'Dragon Roll (8pc)', fr: 'Dragon Roll (8pcs)', de: 'Dragon Roll (8 Stk.)', it: 'Dragon Roll (8pz)' }, desc: { en: 'Shrimp tempura, avocado, eel sauce, tobiko', fr: 'Tempura de crevettes, avocat, sauce anguille, tobiko', de: 'Garnelen-Tempura, Avocado, Aal-Sauce, Tobiko', it: 'Tempura di gamberi, avocado, salsa di anguilla, tobiko' }, price: [16.50, 19.50] },
      ]},
      { en: 'Bowls', fr: 'Bols', de: 'Bowls', it: 'Bowls', slug: 'bowls', items: [
        { name: { en: 'Salmon Poké Bowl', fr: 'Poké Bowl au Saumon', de: 'Lachs-Poké-Bowl', it: 'Poké Bowl al Salmone' }, desc: { en: 'Fresh salmon, rice, avocado, edamame, wakame, sesame', fr: 'Saumon frais, riz, avocat, edamame, wakame, sésame', de: 'Frischer Lachs, Reis, Avocado, Edamame, Wakame, Sesam', it: 'Salmone fresco, riso, avocado, edamame, wakame, sesamo' }, price: [19.50, 23.50] },
        { name: { en: 'Tuna Poké Bowl', fr: 'Poké Bowl au Thon', de: 'Thunfisch-Poké-Bowl', it: 'Poké Bowl al Tonno' }, desc: { en: 'Fresh tuna, rice, mango, cucumber, ponzu sauce', fr: 'Thon frais, riz, mangue, concombre, sauce ponzu', de: 'Frischer Thunfisch, Reis, Mango, Gurke, Ponzu-Sauce', it: 'Tonno fresco, riso, mango, cetriolo, salsa ponzu' }, price: [20.50, 24.50] },
      ]},
      { en: 'Drinks', fr: 'Boissons', de: 'Getränke', it: 'Bevande', slug: 'drinks', items: [
        { name: { en: 'Japanese Green Tea', fr: 'Thé Vert Japonais', de: 'Japanischer Grüntee', it: 'Tè Verde Giapponese' }, desc: { en: '', fr: '', de: '', it: '' }, price: [3.50, 5.00] },
        { name: { en: 'Ramune Soda', fr: 'Soda Ramune', de: 'Ramune-Limonade', it: 'Soda Ramune' }, desc: { en: 'Japanese marble soda', fr: 'Soda japonais à la bille', de: 'Japanische Murmel-Limonade', it: 'Bibita giapponese con biglia' }, price: [4.50, 6.50] },
      ]},
    ]
  },

  Swiss: {
    categories: [
      { en: 'Traditional', fr: 'Traditionnel', de: 'Traditionell', it: 'Tradizionale', slug: 'traditional', items: [
        { name: { en: 'Cheese Fondue', fr: 'Fondue au Fromage', de: 'Käsefondue', it: 'Fonduta di Formaggio' }, desc: { en: 'Classic Swiss cheese fondue with bread cubes', fr: 'Fondue au fromage suisse classique avec cubes de pain', de: 'Klassisches Schweizer Käsefondue mit Brotwürfeln', it: 'Classica fonduta svizzera con cubi di pane' }, price: [28.50, 34.50] },
        { name: { en: 'Rösti with Egg', fr: 'Rösti avec Œuf', de: 'Rösti mit Spiegelei', it: 'Rösti con Uovo' }, desc: { en: 'Crispy potato rösti topped with a fried egg', fr: 'Rösti croustillant garni d\'un œuf au plat', de: 'Knuspriges Kartoffel-Rösti mit Spiegelei', it: 'Rösti croccante di patate con uovo fritto' }, price: [16.50, 19.50] },
        { name: { en: 'Raclette Plate', fr: 'Assiette Raclette', de: 'Raclette-Teller', it: 'Piatto Raclette' }, desc: { en: 'Melted raclette cheese with potatoes, pickles, onions', fr: 'Fromage à raclette fondu avec pommes de terre, cornichons, oignons', de: 'Geschmolzener Raclette-Käse mit Kartoffeln, Gurken, Zwiebeln', it: 'Formaggio raclette fuso con patate, cetrioli, cipolle' }, price: [24.50, 29.50] },
        { name: { en: 'Zürcher Geschnetzeltes', fr: 'Émincé zurichois', de: 'Zürcher Geschnetzeltes', it: 'Spezzatino alla Zurighese' }, desc: { en: 'Sliced veal in creamy mushroom sauce with rösti', fr: 'Émincé de veau en sauce crémeuse aux champignons avec rösti', de: 'Kalbsgeschnetzeltes in Rahmsauce mit Champignons und Rösti', it: 'Spezzatino di vitello in salsa cremosa ai funghi con rösti' }, price: [29.50, 34.50] },
      ]},
      { en: 'Cordon Bleu', fr: 'Cordon Bleu', de: 'Cordon Bleu', it: 'Cordon Bleu', slug: 'cordon-bleu', items: [
        { name: { en: 'Classic Cordon Bleu', fr: 'Cordon Bleu Classique', de: 'Klassisches Cordon Bleu', it: 'Cordon Bleu Classico' }, desc: { en: 'Breaded veal stuffed with ham and Gruyère, served with fries', fr: 'Veau pané farci de jambon et Gruyère, servi avec des frites', de: 'Paniertes Kalbfleisch gefüllt mit Schinken und Gruyère, serviert mit Pommes', it: 'Vitello impanato farcito con prosciutto e Gruyère, servito con patatine' }, price: [28.50, 33.50] },
        { name: { en: 'Chicken Cordon Bleu', fr: 'Cordon Bleu de Poulet', de: 'Hähnchen Cordon Bleu', it: 'Cordon Bleu di Pollo' }, desc: { en: 'Breaded chicken with ham and cheese, fries and salad', fr: 'Poulet pané avec jambon et fromage, frites et salade', de: 'Paniertes Hähnchen mit Schinken und Käse, Pommes und Salat', it: 'Pollo impanato con prosciutto e formaggio, patatine e insalata' }, price: [25.50, 29.50] },
      ]},
      { en: 'Drinks', fr: 'Boissons', de: 'Getränke', it: 'Bevande', slug: 'drinks', items: [
        { name: { en: 'Rivella (33cl)', fr: 'Rivella (33cl)', de: 'Rivella (33cl)', it: 'Rivella (33cl)' }, desc: { en: 'Classic Swiss soft drink', fr: 'Boisson gazeuse suisse classique', de: 'Klassisches Schweizer Erfrischungsgetränk', it: 'Bibita svizzera classica' }, price: [3.90, 4.90] },
        { name: { en: 'Appenzeller Bier', fr: 'Bière Appenzeller', de: 'Appenzeller Bier', it: 'Birra Appenzeller' }, desc: { en: 'Swiss craft beer (33cl)', fr: 'Bière artisanale suisse (33cl)', de: 'Schweizer Craft-Bier (33cl)', it: 'Birra artigianale svizzera (33cl)' }, price: [5.50, 7.50] },
      ]},
    ]
  },

  Chinese: {
    categories: [
      { en: 'Starters', fr: 'Entrées', de: 'Vorspeisen', it: 'Antipasti', slug: 'starters', items: [
        { name: { en: 'Wonton Soup', fr: 'Soupe Won Ton', de: 'Wonton-Suppe', it: 'Zuppa di Wonton' }, desc: { en: 'Clear broth with pork and shrimp wontons', fr: 'Bouillon clair avec wontons de porc et crevettes', de: 'Klare Brühe mit Schweine- und Garnelen-Wontons', it: 'Brodo chiaro con wonton di maiale e gamberi' }, price: [8.50, 11.50] },
        { name: { en: 'Dim Sum (6pc)', fr: 'Dim Sum (6pcs)', de: 'Dim Sum (6 Stk.)', it: 'Dim Sum (6pz)' }, desc: { en: 'Steamed dumplings with soy dipping sauce', fr: 'Raviolis à la vapeur avec sauce soja', de: 'Gedämpfte Teigtaschen mit Soja-Dip', it: 'Ravioli al vapore con salsa di soia' }, price: [10.50, 13.50] },
      ]},
      { en: 'Main Dishes', fr: 'Plats Principaux', de: 'Hauptgerichte', it: 'Piatti Principali', slug: 'main-dishes', items: [
        { name: { en: 'Kung Pao Chicken', fr: 'Poulet Kung Pao', de: 'Kung Pao Hähnchen', it: 'Pollo Kung Pao' }, desc: { en: 'Spicy chicken with peanuts, vegetables, Sichuan pepper', fr: 'Poulet épicé avec cacahuètes, légumes, poivre du Sichuan', de: 'Scharfes Hähnchen mit Erdnüssen, Gemüse, Sichuanpfeffer', it: 'Pollo piccante con arachidi, verdure, pepe del Sichuan' }, price: [21.50, 25.50] },
        { name: { en: 'Peking Duck', fr: 'Canard Laqué', de: 'Pekingente', it: 'Anatra alla Pechinese' }, desc: { en: 'Roasted duck with thin pancakes, spring onion, hoisin sauce', fr: 'Canard rôti avec crêpes fines, oignon vert, sauce hoisin', de: 'Geröstete Ente mit dünnen Pfannkuchen, Frühlingszwiebeln, Hoisin-Sauce', it: 'Anatra arrosto con crepes sottili, cipollotto, salsa hoisin' }, price: [32.50, 38.50] },
        { name: { en: 'Mapo Tofu', fr: 'Mapo Tofu', de: 'Mapo Tofu', it: 'Mapo Tofu' }, desc: { en: 'Silken tofu in spicy Sichuan sauce with minced pork', fr: 'Tofu soyeux en sauce épicée du Sichuan avec porc haché', de: 'Seidentofu in scharfer Sichuan-Sauce mit Schweinehack', it: 'Tofu morbido in salsa piccante del Sichuan con maiale macinato' }, price: [18.50, 22.50] },
      ]},
      { en: 'Noodles & Rice', fr: 'Nouilles & Riz', de: 'Nudeln & Reis', it: 'Noodles & Riso', slug: 'noodles-rice', items: [
        { name: { en: 'Chow Mein', fr: 'Chow Mein', de: 'Chow Mein', it: 'Chow Mein' }, desc: { en: 'Stir-fried egg noodles with vegetables and chicken', fr: 'Nouilles aux œufs sautées avec légumes et poulet', de: 'Gebratene Eiernudeln mit Gemüse und Hähnchen', it: 'Noodles all\'uovo saltati con verdure e pollo' }, price: [17.50, 21.50] },
        { name: { en: 'Yang Chow Fried Rice', fr: 'Riz Cantonais', de: 'Gebratener Reis Kanton', it: 'Riso alla Cantonese' }, desc: { en: 'Fried rice with shrimp, BBQ pork, egg, vegetables', fr: 'Riz sauté aux crevettes, porc BBQ, œuf, légumes', de: 'Gebratener Reis mit Garnelen, BBQ-Schwein, Ei, Gemüse', it: 'Riso fritto con gamberi, maiale BBQ, uovo, verdure' }, price: [18.50, 22.50] },
      ]},
      { en: 'Drinks', fr: 'Boissons', de: 'Getränke', it: 'Bevande', slug: 'drinks', items: [
        { name: { en: 'Chinese Tea', fr: 'Thé Chinois', de: 'Chinesischer Tee', it: 'Tè Cinese' }, desc: { en: 'Jasmine or oolong tea', fr: 'Thé au jasmin ou oolong', de: 'Jasmin- oder Oolong-Tee', it: 'Tè al gelsomino o oolong' }, price: [3.50, 5.00] },
      ]},
    ]
  },

  Lebanese: {
    categories: [
      { en: 'Mezze', fr: 'Mezze', de: 'Mezze', it: 'Mezze', slug: 'mezze', items: [
        { name: { en: 'Hummus', fr: 'Houmous', de: 'Hummus', it: 'Hummus' }, desc: { en: 'Creamy chickpea dip with olive oil and pita', fr: 'Purée de pois chiches crémeuse avec huile d\'olive et pita', de: 'Cremiger Kichererbsen-Dip mit Olivenöl und Pita', it: 'Crema di ceci con olio d\'oliva e pita' }, price: [8.50, 11.50] },
        { name: { en: 'Baba Ganoush', fr: 'Baba Ganoush', de: 'Baba Ganoush', it: 'Baba Ganoush' }, desc: { en: 'Smoky eggplant dip with tahini', fr: 'Purée d\'aubergine fumée avec tahini', de: 'Geräucherter Auberginen-Dip mit Tahini', it: 'Crema di melanzane affumicate con tahini' }, price: [9.50, 12.00] },
        { name: { en: 'Fattoush Salad', fr: 'Salade Fattoush', de: 'Fattoush-Salat', it: 'Insalata Fattoush' }, desc: { en: 'Mixed salad with crispy pita, sumac dressing', fr: 'Salade mixte avec pita croustillant, vinaigrette au sumac', de: 'Gemischter Salat mit knusprigem Pita, Sumach-Dressing', it: 'Insalata mista con pita croccante, condimento al sommacco' }, price: [12.50, 15.00] },
        { name: { en: 'Falafel Plate', fr: 'Assiette Falafel', de: 'Falafel-Teller', it: 'Piatto Falafel' }, desc: { en: 'Crispy falafel with tahini, salad, pickles', fr: 'Falafels croustillants avec tahini, salade, cornichons', de: 'Knusprige Falafel mit Tahini, Salat, Gurken', it: 'Falafel croccanti con tahini, insalata, cetriolini' }, price: [16.50, 19.50] },
      ]},
      { en: 'Grilled Meats', fr: 'Grillades', de: 'Grillgerichte', it: 'Grigliate', slug: 'grilled-meats', items: [
        { name: { en: 'Chicken Shawarma', fr: 'Shawarma au Poulet', de: 'Chicken Shawarma', it: 'Shawarma di Pollo' }, desc: { en: 'Marinated chicken with garlic sauce, pickles, fries', fr: 'Poulet mariné avec sauce à l\'ail, cornichons, frites', de: 'Mariniertes Hähnchen mit Knoblauchsauce, Gurken, Pommes', it: 'Pollo marinato con salsa all\'aglio, cetriolini, patatine' }, price: [18.50, 22.50] },
        { name: { en: 'Mixed Grill Plate', fr: 'Assiette Grillade Mixte', de: 'Gemischte Grillplatte', it: 'Piatto Grigliata Mista' }, desc: { en: 'Lamb kebab, chicken tawook, kofta with rice', fr: 'Brochette d\'agneau, tawook de poulet, kofta avec riz', de: 'Lamm-Kebab, Chicken Tawook, Kofta mit Reis', it: 'Kebab di agnello, tawook di pollo, kofta con riso' }, price: [28.50, 34.50] },
      ]},
      { en: 'Drinks', fr: 'Boissons', de: 'Getränke', it: 'Bevande', slug: 'drinks', items: [
        { name: { en: 'Fresh Lemonade', fr: 'Limonade Fraîche', de: 'Frische Limonade', it: 'Limonata Fresca' }, desc: { en: 'Homemade with fresh lemons and mint', fr: 'Fait maison avec citrons frais et menthe', de: 'Hausgemacht mit frischen Zitronen und Minze', it: 'Fatta in casa con limoni freschi e menta' }, price: [5.50, 7.50] },
      ]},
    ]
  },

  Thai: {
    categories: [
      { en: 'Curry', fr: 'Curry', de: 'Curry', it: 'Curry', slug: 'curry', items: [
        { name: { en: 'Green Curry', fr: 'Curry Vert', de: 'Grünes Curry', it: 'Curry Verde' }, desc: { en: 'Green curry paste, coconut milk, bamboo shoots, basil', fr: 'Pâte de curry vert, lait de coco, pousses de bambou, basilic', de: 'Grüne Currypaste, Kokosmilch, Bambussprossen, Basilikum', it: 'Pasta di curry verde, latte di cocco, germogli di bambù, basilico' }, price: [21.50, 25.50] },
        { name: { en: 'Massaman Curry', fr: 'Curry Massaman', de: 'Massaman Curry', it: 'Curry Massaman' }, desc: { en: 'Rich curry with potatoes, peanuts, coconut milk', fr: 'Curry riche avec pommes de terre, cacahuètes, lait de coco', de: 'Reichhaltiges Curry mit Kartoffeln, Erdnüssen, Kokosmilch', it: 'Curry ricco con patate, arachidi, latte di cocco' }, price: [22.50, 26.50] },
      ]},
      { en: 'Noodles', fr: 'Nouilles', de: 'Nudeln', it: 'Noodles', slug: 'noodles', items: [
        { name: { en: 'Pad Thai', fr: 'Pad Thaï', de: 'Pad Thai', it: 'Pad Thai' }, desc: { en: 'Stir-fried rice noodles with shrimp, peanuts, lime', fr: 'Nouilles de riz sautées avec crevettes, cacahuètes, citron vert', de: 'Gebratene Reisnudeln mit Shrimps, Erdnüssen, Limette', it: 'Noodles di riso saltati con gamberetti, arachidi, lime' }, price: [19.50, 23.50] },
        { name: { en: 'Pad See Ew', fr: 'Pad See Ew', de: 'Pad See Ew', it: 'Pad See Ew' }, desc: { en: 'Wide rice noodles with soy sauce, Chinese broccoli', fr: 'Larges nouilles de riz avec sauce soja, brocoli chinois', de: 'Breite Reisnudeln mit Sojasauce, chinesischem Brokkoli', it: 'Noodles di riso larghi con salsa di soia, broccoli cinesi' }, price: [18.50, 22.00] },
      ]},
      { en: 'Soups', fr: 'Soupes', de: 'Suppen', it: 'Zuppe', slug: 'soups', items: [
        { name: { en: 'Tom Yum Kung', fr: 'Tom Yum Kung', de: 'Tom Yum Kung', it: 'Tom Yum Kung' }, desc: { en: 'Spicy and sour shrimp soup with lemongrass', fr: 'Soupe épicée et acidulée aux crevettes avec citronnelle', de: 'Scharf-saure Garnelensuppe mit Zitronengras', it: 'Zuppa piccante e aspra di gamberi con citronella' }, price: [12.50, 15.50] },
      ]},
      { en: 'Drinks', fr: 'Boissons', de: 'Getränke', it: 'Bevande', slug: 'drinks', items: [
        { name: { en: 'Thai Iced Tea', fr: 'Thé Glacé Thaï', de: 'Thai Eistee', it: 'Tè Freddo Thai' }, desc: { en: 'Sweet Thai tea with milk', fr: 'Thé thaï sucré au lait', de: 'Süsser Thai-Tee mit Milch', it: 'Tè thailandese dolce al latte' }, price: [5.50, 7.50] },
      ]},
    ]
  },

  // Default / Generic template for cuisines without specific templates
  _default: {
    categories: [
      { en: 'Popular Items', fr: 'Articles Populaires', de: 'Beliebt', it: 'Articoli Popolari', slug: 'popular-items', items: [
        { name: { en: 'House Special', fr: 'Spécialité Maison', de: 'Hausspezialität', it: 'Specialità della Casa' }, desc: { en: 'Chef\'s signature dish of the day', fr: 'Plat signature du chef du jour', de: 'Signaturengericht des Küchenchefs', it: 'Piatto del giorno dello chef' }, price: [22.50, 27.50] },
        { name: { en: 'Grilled Chicken', fr: 'Poulet Grillé', de: 'Grillhähnchen', it: 'Pollo alla Griglia' }, desc: { en: 'Herb-marinated grilled chicken with seasonal vegetables', fr: 'Poulet grillé mariné aux herbes avec légumes de saison', de: 'Kräuter-mariniertes Grillhähnchen mit Saisongemüse', it: 'Pollo grigliato marinato alle erbe con verdure di stagione' }, price: [19.50, 24.50] },
        { name: { en: 'Mixed Salad', fr: 'Salade Mixte', de: 'Gemischter Salat', it: 'Insalata Mista' }, desc: { en: 'Fresh seasonal salad with house dressing', fr: 'Salade fraîche de saison avec vinaigrette maison', de: 'Frischer Saisonsalat mit Hausdressing', it: 'Insalata fresca di stagione con condimento della casa' }, price: [9.50, 13.50] },
      ]},
      { en: 'Main Courses', fr: 'Plats Principaux', de: 'Hauptgerichte', it: 'Piatti Principali', slug: 'main-courses', items: [
        { name: { en: 'Grilled Steak', fr: 'Steak Grillé', de: 'Gegrilltes Steak', it: 'Bistecca alla Griglia' }, desc: { en: 'Premium beef steak with fries and pepper sauce', fr: 'Steak de bœuf premium avec frites et sauce au poivre', de: 'Premium-Rindersteak mit Pommes und Pfeffersauce', it: 'Bistecca di manzo premium con patatine e salsa al pepe' }, price: [29.50, 36.50] },
        { name: { en: 'Fish of the Day', fr: 'Poisson du Jour', de: 'Fisch des Tages', it: 'Pesce del Giorno' }, desc: { en: 'Fresh catch with lemon butter sauce', fr: 'Pêche fraîche avec sauce au beurre citronné', de: 'Frischer Fang mit Zitronen-Buttersauce', it: 'Pescato fresco con salsa al burro e limone' }, price: [24.50, 29.50] },
        { name: { en: 'Vegetable Plate', fr: 'Assiette de Légumes', de: 'Gemüseteller', it: 'Piatto di Verdure' }, desc: { en: 'Grilled seasonal vegetables with hummus', fr: 'Légumes de saison grillés avec houmous', de: 'Gegrilltes Saisongemüse mit Hummus', it: 'Verdure di stagione grigliate con hummus' }, price: [16.50, 20.50] },
      ]},
      { en: 'Desserts', fr: 'Desserts', de: 'Desserts', it: 'Dolci', slug: 'desserts', items: [
        { name: { en: 'Chocolate Cake', fr: 'Gâteau au Chocolat', de: 'Schokoladenkuchen', it: 'Torta al Cioccolato' }, desc: { en: 'Rich chocolate cake with cream', fr: 'Gâteau au chocolat riche avec crème', de: 'Reichhaltiger Schokoladenkuchen mit Sahne', it: 'Torta al cioccolato ricca con panna' }, price: [8.50, 11.50] },
        { name: { en: 'Ice Cream (3 scoops)', fr: 'Glace (3 boules)', de: 'Eis (3 Kugeln)', it: 'Gelato (3 palline)' }, desc: { en: 'Choose from vanilla, chocolate, strawberry', fr: 'Au choix: vanille, chocolat, fraise', de: 'Wahl: Vanille, Schokolade, Erdbeere', it: 'A scelta: vaniglia, cioccolato, fragola' }, price: [7.50, 10.00] },
      ]},
      { en: 'Drinks', fr: 'Boissons', de: 'Getränke', it: 'Bevande', slug: 'drinks', items: [
        { name: { en: 'Coca-Cola 33cl', fr: 'Coca-Cola 33cl', de: 'Coca-Cola 33cl', it: 'Coca-Cola 33cl' }, desc: { en: '', fr: '', de: '', it: '' }, price: [3.50, 4.50] },
        { name: { en: 'Sparkling Water 50cl', fr: 'Eau Gazeuse 50cl', de: 'Mineralwasser 50cl', it: 'Acqua Frizzante 50cl' }, desc: { en: '', fr: '', de: '', it: '' }, price: [3.00, 4.00] },
        { name: { en: 'Fresh Orange Juice', fr: 'Jus d\'Orange Frais', de: 'Frischer Orangensaft', it: 'Succo d\'Arancia Fresco' }, desc: { en: '', fr: '', de: '', it: '' }, price: [5.50, 7.50] },
      ]},
    ]
  },
};

// Map additional cuisine names to templates
const CUISINE_TEMPLATE_MAP = {
  'Pizza': 'Pizza', 'Burger': 'Burger', 'Italian': 'Italian', 'Indian': 'Indian',
  'Asian': 'Asian', 'Kebab': 'Kebab', 'Mexican': 'Mexican', 'Sushi': 'Sushi',
  'Swiss': 'Swiss', 'Chinese': 'Chinese', 'Lebanese': 'Lebanese', 'Thai': 'Thai',
  'American Food': 'Burger', 'Steak': 'Swiss', 'Pasta': 'Italian',
  'Salads': '_default', 'Snacks': '_default', 'Coffee': '_default',
  'Dumplings': 'Asian', 'African food': '_default', 'Groceries': '_default',
};

// ════════════════════════════════════════════════════════════════════
// REVIEW TEMPLATES (by language)
// ════════════════════════════════════════════════════════════════════

const REVIEW_TEMPLATES = {
  de: {
    positive: [
      'Ausgezeichnetes Essen! Die Lieferung war schnell und das Essen war noch heiss. Werde definitiv wieder bestellen.',
      'Sehr lecker und grosszügige Portionen. Der Service war auch top. Empfehlenswert!',
      'Fantastische Qualität zum fairen Preis. Die Bestellung kam pünktlich und alles war perfekt verpackt.',
      'Das beste {cuisine}-Essen in der Gegend! Frische Zutaten und toller Geschmack.',
      'Immer zuverlässig und lecker. Eines meiner Lieblingsrestaurants für Lieferungen.',
      'Hervorragende Küche! Die Speisen schmecken wie selbst gekocht. Absolute Empfehlung.',
      'Super freundlicher Service und die Qualität stimmt einfach. Mein Stammlokal!',
      'Genau richtig für einen gemütlichen Abend. Das Essen war frisch und geschmackvoll.',
      'Schnelle Lieferung, heisses Essen, faire Preise. Was will man mehr?',
      'Die Portionen sind grosszügig und der Geschmack ist authentisch. Sehr zufrieden!',
      'Tolles Restaurant mit einer super Auswahl. Die Qualität ist immer gleichbleibend hoch.',
      'Wir bestellen hier regelmässig und wurden noch nie enttäuscht. Top Qualität!',
    ],
    mixed: [
      'Das Essen war gut, aber die Lieferzeit war etwas lang. Geschmacklich aber top.',
      'Gute Portionen und Geschmack, aber die Verpackung könnte besser sein.',
      'Im Grossen und Ganzen ein solides Restaurant. Einige Gerichte sind besser als andere.',
      'Okay für den Preis. Nichts Besonderes, aber solide Küche.',
      'Die Hauptgerichte sind sehr gut, aber die Beilagen könnten besser sein.',
    ],
    negative: [
      'Leider war die Lieferung diesmal verspätet und das Essen lauwarm.',
      'Die Qualität hat nachgelassen. Früher war es besser.',
      'Für den Preis hätte ich mehr erwartet. Kleine Portionen.',
    ],
  },
  en: {
    positive: [
      'Excellent food! Delivery was fast and everything arrived hot. Will definitely order again.',
      'Really delicious and generous portions. The service was great too. Highly recommended!',
      'Fantastic quality at a fair price. The order arrived on time and was perfectly packed.',
      'The best {cuisine} food in the area! Fresh ingredients and amazing flavors.',
      'Always reliable and tasty. One of my favorite delivery restaurants.',
      'Outstanding cuisine! The dishes taste homemade. Absolutely recommended.',
      'Super friendly service and the quality is just right. My go-to restaurant!',
      'Perfect for a cozy evening. The food was fresh and flavorful.',
      'Fast delivery, hot food, fair prices. What more could you ask for?',
      'Generous portions and authentic taste. Very satisfied!',
      'Great restaurant with an excellent selection. The quality is consistently high.',
      'We order here regularly and have never been disappointed. Top quality!',
    ],
    mixed: [
      'The food was good, but delivery took a bit long. Taste-wise though, it was excellent.',
      'Good portions and flavor, but the packaging could be improved.',
      'Overall a solid restaurant. Some dishes are better than others.',
      'Okay for the price. Nothing special, but solid cooking.',
      'The main courses are very good, but the sides could use improvement.',
    ],
    negative: [
      'Unfortunately, delivery was late this time and the food was lukewarm.',
      'Quality has declined. It used to be better.',
      'For the price, I expected more. Small portions.',
    ],
  },
  fr: {
    positive: [
      'Excellente nourriture ! La livraison était rapide et tout est arrivé chaud. Je commanderai à nouveau !',
      'Vraiment délicieux et portions généreuses. Le service était top aussi. Je recommande !',
      'Qualité fantastique à un prix juste. La commande est arrivée à l\'heure et bien emballée.',
      'La meilleure cuisine {cuisine} du quartier ! Ingrédients frais et saveurs incroyables.',
      'Toujours fiable et savoureux. L\'un de mes restaurants de livraison préférés.',
      'Cuisine exceptionnelle ! Les plats ont un goût fait maison. Absolument recommandé.',
      'Service super sympathique et la qualité est au rendez-vous. Mon restaurant favori !',
      'Parfait pour une soirée tranquille. La nourriture était fraîche et savoureuse.',
      'Livraison rapide, nourriture chaude, prix justes. Que demander de plus ?',
      'Portions généreuses et goût authentique. Très satisfait !',
      'Super restaurant avec une excellente sélection. La qualité est toujours au top.',
      'Nous commandons ici régulièrement et n\'avons jamais été déçus. Qualité excellente !',
    ],
    mixed: [
      'La nourriture était bonne, mais la livraison a pris un peu de temps.',
      'Bonnes portions et saveurs, mais l\'emballage pourrait être amélioré.',
      'Dans l\'ensemble, un restaurant solide. Certains plats sont meilleurs que d\'autres.',
      'Correct pour le prix. Rien de spécial, mais une cuisine solide.',
      'Les plats principaux sont très bons, mais les accompagnements pourraient être meilleurs.',
    ],
    negative: [
      'Malheureusement, la livraison était en retard et la nourriture était tiède.',
      'La qualité a baissé. C\'était mieux avant.',
      'Pour le prix, j\'attendais plus. Petites portions.',
    ],
  },
  it: {
    positive: [
      'Cibo eccellente! La consegna è stata veloce e tutto è arrivato caldo. Ordinerò di nuovo!',
      'Davvero delizioso e porzioni generose. Anche il servizio era ottimo. Consigliato!',
      'Qualità fantastica a un prezzo giusto. L\'ordine è arrivato in tempo e ben confezionato.',
      'Il migliore cibo {cuisine} della zona! Ingredienti freschi e sapori incredibili.',
      'Sempre affidabile e gustoso. Uno dei miei ristoranti di consegna preferiti.',
      'Cucina eccezionale! I piatti hanno un sapore fatto in casa. Assolutamente consigliato.',
      'Servizio super cordiale e la qualità è giusta. Il mio ristorante di fiducia!',
      'Perfetto per una serata tranquilla. Il cibo era fresco e saporito.',
      'Consegna veloce, cibo caldo, prezzi giusti. Cosa chiedere di più?',
      'Porzioni generose e gusto autentico. Molto soddisfatto!',
      'Ottimo ristorante con un\'eccellente selezione. La qualità è sempre alta.',
      'Ordiniamo qui regolarmente e non siamo mai rimasti delusi. Qualità eccellente!',
    ],
    mixed: [
      'Il cibo era buono, ma la consegna ha impiegato un po\' di tempo.',
      'Buone porzioni e sapori, ma il confezionamento potrebbe essere migliorato.',
      'Nel complesso, un ristorante solido. Alcuni piatti sono migliori di altri.',
      'Ok per il prezzo. Niente di speciale, ma cucina solida.',
      'I piatti principali sono molto buoni, ma i contorni potrebbero migliorare.',
    ],
    negative: [
      'Purtroppo la consegna era in ritardo e il cibo era tiepido.',
      'La qualità è diminuita. Prima era meglio.',
      'Per il prezzo, mi aspettavo di più. Porzioni piccole.',
    ],
  },
};

// ════════════════════════════════════════════════════════════════════
// GENERATE USERS
// ════════════════════════════════════════════════════════════════════

function generateUsers() {
  console.log('Generating users...');
  const existingUsers = readJSON('users.json');
  const existingUserRoles = readJSON('user_roles.json');

  // Keep existing 12 users, add 68 new customers
  const newUsers = [];
  const newUserRoles = [];

  // Language distribution: ~30% de, ~25% fr, ~25% en, ~20% it (Swiss demographics weighted)
  const langDistribution = [];
  for (let i = 0; i < 20; i++) langDistribution.push('de');
  for (let i = 0; i < 17; i++) langDistribution.push('fr');
  for (let i = 0; i < 17; i++) langDistribution.push('en');
  for (let i = 0; i < 14; i++) langDistribution.push('it');

  for (let i = 0; i < 68; i++) {
    const lang = langDistribution[i];
    const firstName = pick(FIRST_NAMES[lang]);
    const lastName = pick(LAST_NAMES[lang]);
    const userId = genId();
    const phonePrefix = pick(SWISS_PHONES_PREFIXES);
    const phoneNum = String(randInt(100, 999)) + ' ' + String(randInt(10, 99)) + ' ' + String(randInt(10, 99));

    newUsers.push({
      _id: userId,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/ /g, '')}${randInt(1, 99)}@example.ch`,
      password_hash: PASSWORD_HASH,
      first_name: firstName,
      last_name: lastName,
      phone: `${phonePrefix} ${phoneNum}`,
      avatar_url: null,
      preferred_language: lang,
      is_active: true,
      is_verified: true,
      verified_at: '2025-06-01T00:00:00.000Z',
      last_login_at: `2026-02-${String(randInt(1, 23)).padStart(2, '0')}T${String(randInt(8, 22)).padStart(2, '0')}:${String(randInt(0, 59)).padStart(2, '0')}:00.000Z`,
      created_at: `2025-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}T00:00:00.000Z`,
      updated_at: '2026-02-20T00:00:00.000Z',
      status: 'active',
    });

    newUserRoles.push({
      _id: genId(),
      user_id: userId,
      role_id: CUSTOMER_ROLE_ID,
    });
  }

  const allUsers = [...existingUsers, ...newUsers];
  const allUserRoles = [...existingUserRoles, ...newUserRoles];

  writeJSON('users.json', allUsers);
  writeJSON('user_roles.json', allUserRoles);

  console.log(`  Users: ${existingUsers.length} existing + ${newUsers.length} new = ${allUsers.length} total`);
  console.log(`  User roles: ${existingUserRoles.length} existing + ${newUserRoles.length} new = ${allUserRoles.length} total`);

  return allUsers;
}

// ════════════════════════════════════════════════════════════════════
// GENERATE MENUS
// ════════════════════════════════════════════════════════════════════

function generateMenus() {
  console.log('Generating menu categories and items...');

  const restaurants = readJSON('restaurants.json');
  const rc = readJSON('restaurant_cuisines.json');
  const cuisines = readJSON('cuisines.json');

  // Build cuisine lookup
  const cuisineMap = {};
  cuisines.forEach(c => { cuisineMap[c._id] = c.name.en; });

  // Build restaurant -> cuisines map
  const restCuisines = {};
  rc.forEach(item => {
    if (!restCuisines[item.restaurant_id]) restCuisines[item.restaurant_id] = [];
    restCuisines[item.restaurant_id].push(cuisineMap[item.cuisine_id] || 'unknown');
  });

  // Keep existing menu data for Big Burger (restaurant_id = 6993a9f77dcee68d585a0bed)
  const existingCategories = readJSON('menu_categories.json');
  const existingItems = readJSON('menu_items.json');
  const BIG_BURGER_ID = '6993a9f77dcee68d585a0bed';

  const allCategories = [...existingCategories]; // Keep Big Burger's categories
  const allItems = [...existingItems]; // Keep Big Burger's items

  let catCount = 0;
  let itemCount = 0;

  for (const restaurant of restaurants) {
    // Skip Big Burger — already has a full menu
    if (restaurant._id === BIG_BURGER_ID) continue;

    const cuisineNames = restCuisines[restaurant._id] || [];

    // Find the best template based on cuisine
    let templateKey = '_default';
    for (const cn of cuisineNames) {
      if (CUISINE_TEMPLATE_MAP[cn]) {
        templateKey = CUISINE_TEMPLATE_MAP[cn];
        break;
      }
    }
    // Try matching cuisine name directly to template
    if (templateKey === '_default') {
      for (const cn of cuisineNames) {
        if (MENU_TEMPLATES[cn]) {
          templateKey = cn;
          break;
        }
      }
    }

    const template = MENU_TEMPLATES[templateKey] || MENU_TEMPLATES['_default'];

    let sortOrder = 0;
    for (const cat of template.categories) {
      const categoryId = genId();
      const catSlug = cat.slug + '-' + restaurant.slug.substring(0, 20);

      allCategories.push({
        _id: categoryId,
        restaurant_id: restaurant._id,
        name: { en: cat.en, fr: cat.fr, de: cat.de, it: cat.it },
        slug: catSlug,
        sort_order: sortOrder++,
      });
      catCount++;

      let itemSort = 0;
      for (const item of cat.items) {
        // Randomize price within range
        const price = parseFloat((item.price[0] + seededRandom() * (item.price[1] - item.price[0])).toFixed(2));

        allItems.push({
          _id: genId(),
          category_id: categoryId,
          restaurant_id: restaurant._id,
          name: { en: item.name.en, fr: item.name.fr, de: item.name.de, it: item.name.it },
          description: { en: item.desc.en, fr: item.desc.fr, de: item.desc.de, it: item.desc.it },
          price: price,
          currency: 'CHF',
          image_url: null,
          is_available: true,
          sort_order: itemSort++,
        });
        itemCount++;
      }
    }
  }

  writeJSON('menu_categories.json', allCategories);
  writeJSON('menu_items.json', allItems);

  console.log(`  Categories: ${existingCategories.length} existing + ${catCount} new = ${allCategories.length} total`);
  console.log(`  Items: ${existingItems.length} existing + ${itemCount} new = ${allItems.length} total`);

  return { allCategories, allItems };
}

// ════════════════════════════════════════════════════════════════════
// GENERATE REVIEWS & ORDERS
// ════════════════════════════════════════════════════════════════════

function generateReviews(allUsers) {
  console.log('Generating reviews and orders...');

  const restaurants = readJSON('restaurants.json');
  const existingReviews = readJSON('reviews.json');
  const existingOrders = readJSON('orders.json');

  // Get customer users (those with preferred_language set and customer role)
  const customerUsers = allUsers.filter(u =>
    u.status === 'active' && u.is_verified &&
    !u.email.includes('admin') && !u.email.includes('moderator') &&
    !u.email.includes('support') && !u.email.includes('owner') &&
    !u.email.includes('staff') && !u.email.includes('courier')
  );

  console.log(`  Customer users available: ${customerUsers.length}`);

  // Group customers by language
  const customersByLang = { de: [], en: [], fr: [], it: [] };
  for (const u of customerUsers) {
    const lang = u.preferred_language || 'de';
    if (customersByLang[lang]) customersByLang[lang].push(u);
  }

  const rc = readJSON('restaurant_cuisines.json');
  const cuisines = readJSON('cuisines.json');
  const cuisineMap = {};
  cuisines.forEach(c => { cuisineMap[c._id] = c.name.en; });
  const restCuisines = {};
  rc.forEach(item => {
    if (!restCuisines[item.restaurant_id]) restCuisines[item.restaurant_id] = [];
    restCuisines[item.restaurant_id].push(cuisineMap[item.cuisine_id] || '');
  });

  const newReviews = [];
  const newOrders = [];
  const BIG_BURGER_ID = '6993a9f77dcee68d585a0bed';

  // Build menu items by restaurant for order items
  const menuItems = readJSON('menu_items.json');
  const menuByRestaurant = {};
  for (const mi of menuItems) {
    if (!menuByRestaurant[mi.restaurant_id]) menuByRestaurant[mi.restaurant_id] = [];
    menuByRestaurant[mi.restaurant_id].push(mi);
  }

  // Track which (user, restaurant) pairs we've used for uniqueness
  const usedPairs = new Set();
  existingReviews.forEach(r => usedPairs.add(r.user_id + '_' + r.restaurant_id));

  let orderCounter = existingOrders.length + 1;

  for (const restaurant of restaurants) {
    // Big Burger already has 3 reviews, add more
    const existingCount = existingReviews.filter(r => r.restaurant_id === restaurant._id).length;
    const targetReviews = randInt(8, 16);
    const toGenerate = Math.max(0, targetReviews - existingCount);

    if (toGenerate === 0) continue;

    // Mix of languages for reviews
    const shuffledCustomers = shuffle(customerUsers);

    let generated = 0;
    for (const customer of shuffledCustomers) {
      if (generated >= toGenerate) break;

      const pairKey = customer._id + '_' + restaurant._id;
      if (usedPairs.has(pairKey)) continue;
      usedPairs.add(pairKey);

      const lang = customer.preferred_language || 'de';
      const cuisineNames = restCuisines[restaurant._id] || [];
      const cuisineName = cuisineNames[0] || 'food';

      // Determine rating and review type
      const ratingRoll = seededRandom();
      let rating, reviewType;
      if (ratingRoll < 0.55) { rating = 5; reviewType = 'positive'; }
      else if (ratingRoll < 0.80) { rating = 4; reviewType = 'positive'; }
      else if (ratingRoll < 0.92) { rating = 3; reviewType = 'mixed'; }
      else if (ratingRoll < 0.97) { rating = 2; reviewType = 'negative'; }
      else { rating = 1; reviewType = 'negative'; }

      const templates = REVIEW_TEMPLATES[lang] || REVIEW_TEMPLATES['de'];
      let comment = pick(templates[reviewType]);
      comment = comment.replace('{cuisine}', cuisineName);

      // Generate order for this review
      const orderId = genId();
      const orderNum = `JE-2026-${String(orderCounter++).padStart(6, '0')}`;
      const isDelivery = seededRandom() > 0.3;
      const orderType = isDelivery ? 'delivery' : 'pickup';

      // Build order items from restaurant's menu
      const restMenuItems = menuByRestaurant[restaurant._id] || [];
      const orderItems = [];
      const numItems = Math.min(randInt(1, 3), restMenuItems.length || 1);
      const shuffledMenu = shuffle(restMenuItems).slice(0, numItems);
      let subtotal = 0;

      for (const mi of shuffledMenu) {
        const qty = randInt(1, 2);
        const unitPrice = mi.price;
        const totalPrice = parseFloat((unitPrice * qty).toFixed(2));
        subtotal += totalPrice;
        orderItems.push({
          menu_item_id: mi._id,
          name: mi.name.en || mi.name.de || 'Menu Item',
          quantity: qty,
          unit_price: unitPrice,
          total_price: totalPrice,
        });
      }

      // If no menu items exist yet, generate a placeholder
      if (orderItems.length === 0) {
        const price = parseFloat((randInt(1200, 2800) / 100).toFixed(2));
        subtotal = price;
        orderItems.push({
          menu_item_id: genId(),
          name: 'House Special',
          quantity: 1,
          unit_price: price,
          total_price: price,
        });
      }

      subtotal = parseFloat(subtotal.toFixed(2));
      const deliveryFee = isDelivery ? parseFloat((randInt(250, 650) / 100).toFixed(2)) : 0;
      const serviceFee = 1.50;
      const tip = seededRandom() > 0.6 ? parseFloat((randInt(100, 500) / 100).toFixed(2)) : 0;
      const total = parseFloat((subtotal + deliveryFee + serviceFee + tip).toFixed(2));

      const month = randInt(1, 2);
      const day = randInt(1, 28);
      const hour = randInt(10, 22);
      const minute = randInt(0, 59);
      const placedAt = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`;

      // Build timeline (delivered orders)
      const placedMs = new Date(placedAt).getTime();
      const acceptedAt = new Date(placedMs + randInt(2, 5) * 60000).toISOString();
      const preparingAt = new Date(placedMs + randInt(5, 10) * 60000).toISOString();
      const readyAt = new Date(placedMs + randInt(20, 35) * 60000).toISOString();
      const pickedUpAt = new Date(placedMs + randInt(25, 40) * 60000).toISOString();
      const deliveredAt = new Date(placedMs + randInt(35, 60) * 60000).toISOString();
      const estimatedDeliveryAt = isDelivery ? new Date(placedMs + 45 * 60000).toISOString() : null;

      newOrders.push({
        _id: orderId,
        order_number: orderNum,
        user_id: customer._id,
        restaurant_id: restaurant._id,
        courier_id: null,
        delivery_address_id: null,
        order_type: orderType,
        status: 'DELIVERED',
        items: orderItems,
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        service_fee: serviceFee,
        tip: tip,
        discount: 0,
        total: total,
        currency: 'CHF',
        payment_method: pick(['card', 'twint', 'cash', 'postfinance']),
        payment_status: 'PAID',
        special_instructions: null,
        estimated_delivery_at: estimatedDeliveryAt,
        placed_at: placedAt,
        accepted_at: acceptedAt,
        preparing_at: preparingAt,
        ready_at: readyAt,
        picked_up_at: pickedUpAt,
        delivered_at: deliveredAt,
        created_at: placedAt,
      });

      const reviewDate = new Date(new Date(placedAt).getTime() + randInt(1, 72) * 3600000).toISOString();

      newReviews.push({
        _id: genId(),
        user_id: customer._id,
        restaurant_id: restaurant._id,
        order_id: orderId,
        rating: rating,
        comment: comment,
        is_verified: true,
        status: 'APPROVED',
        created_at: reviewDate,
      });

      generated++;
    }
  }

  const allReviews = [...existingReviews, ...newReviews];
  const allOrders = [...existingOrders, ...newOrders];

  writeJSON('reviews.json', allReviews);
  writeJSON('orders.json', allOrders);

  console.log(`  Reviews: ${existingReviews.length} existing + ${newReviews.length} new = ${allReviews.length} total`);
  console.log(`  Orders: ${existingOrders.length} existing + ${newOrders.length} new = ${allOrders.length} total`);

  // Update restaurant review counts and ratings
  console.log('  Updating restaurant ratings and review counts...');
  const reviewsByRestaurant = {};
  for (const r of allReviews) {
    if (!reviewsByRestaurant[r.restaurant_id]) reviewsByRestaurant[r.restaurant_id] = [];
    reviewsByRestaurant[r.restaurant_id].push(r.rating);
  }

  const updatedRestaurants = readJSON('restaurants.json');
  for (const rest of updatedRestaurants) {
    const ratings = reviewsByRestaurant[rest._id];
    if (ratings && ratings.length > 0) {
      rest.review_count = ratings.length;
      rest.rating = parseFloat((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1));
    }
  }
  writeJSON('restaurants.json', updatedRestaurants);
  console.log('  Restaurant ratings updated.');

  return { allReviews, allOrders };
}

// ════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════

function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Just Eat Seed Data Generator');
  console.log('═══════════════════════════════════════════════════════\n');

  const allUsers = generateUsers();
  console.log('');

  const { allCategories, allItems } = generateMenus();
  console.log('');

  const { allReviews, allOrders } = generateReviews(allUsers);
  console.log('');

  console.log('═══════════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Users:           ${allUsers.length}`);
  console.log(`  Menu Categories: ${allCategories.length}`);
  console.log(`  Menu Items:      ${allItems.length}`);
  console.log(`  Reviews:         ${allReviews.length}`);
  console.log(`  Orders:          ${allOrders.length}`);
  console.log('');
  console.log('  Run: docker compose exec api npm run seed');
  console.log('═══════════════════════════════════════════════════════');
}

main();
