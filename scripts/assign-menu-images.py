#!/usr/bin/env python3
"""
Assign Cloudinary menu item images to seed data based on category and item name keywords.
Maps 30 uploaded food images to 4,122 menu items that currently have no image.
"""

import json
import os
import re

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')

# ── Verified Cloudinary URLs ─────────────────────────────────────────────
IMAGES = {
    # Drinks (5)
    "drink-soda":    "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771951456/justeat/menu/items/drink-soda.jpg",
    "drink-water":   "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771953691/justeat/menu/items/drink-water.jpg",
    "drink-juice":   "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771953693/justeat/menu/items/drink-juice.jpg",
    "drink-beer":    "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771953694/justeat/menu/items/drink-beer.jpg",
    "drink-coffee":  "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771953698/justeat/menu/items/drink-coffee.jpg",
    # Desserts (6)
    "dessert":             "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771949770/justeat/menu/items/justeat/menu/items/dessert.jpg",
    "ice-cream":           "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771951876/justeat/menu/items/ice-cream.jpg",
    "dessert-cake":        "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771953725/justeat/menu/items/dessert-cake.jpg",
    "dessert-tiramisu":    "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771953725/justeat/menu/items/dessert-tiramisu.jpg",
    "dessert-brownie":     "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771953723/justeat/menu/items/dessert-brownie.jpg",
    "dessert-panna-cotta": "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771953728/justeat/menu/items/dessert-panna-cotta.jpg",
    # Main dishes & sides (24)
    "pizza":       "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771950355/justeat/menu/items/justeat/menu/items/pizza.jpg",
    "burger":      "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771949847/justeat/menu/items/justeat/menu/items/burger.jpg",
    "pasta":       "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771951127/justeat/menu/items/pasta.jpg",
    "curry":       "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771950982/justeat/menu/items/curry.jpg",
    "sushi":       "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771950731/justeat/menu/items/sushi.jpg",
    "kebab":       "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771950531/justeat/menu/items/kebab.jpg",
    "steak":       "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771951271/justeat/menu/items/steak.jpg",
    "noodles":     "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771951265/justeat/menu/items/noodles.jpg",
    "chicken":     "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771951259/justeat/menu/items/chicken.jpg",
    "fries":       "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771951254/justeat/menu/items/fries.jpg",
    "tacos":       "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771951471/justeat/menu/items/tacos.jpg",
    "soup":        "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771951472/justeat/menu/items/soup.jpg",
    "rice-bowl":   "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771951473/justeat/menu/items/rice-bowl.jpg",
    "bruschetta":  "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771951674/justeat/menu/items/bruschetta.jpg",
    "hummus":      "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771951675/justeat/menu/items/hummus.jpg",
    "fondue":      "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771951675/justeat/menu/items/fondue.jpg",
    "naan-bread":  "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771951677/justeat/menu/items/naan-bread.jpg",
    "wrap":        "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771951878/justeat/menu/items/wrap.jpg",
    "nachos":      "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771952127/justeat/menu/items/nachos.jpg",
    "tandoori":    "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771952120/justeat/menu/items/tandoori.jpg",
    "schnitzel":   "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771952124/justeat/menu/items/schnitzel.jpg",
    "onion-rings": "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771951869/justeat/menu/items/onion-rings.jpg",
    "salad":       "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771949426/justeat/menu/items/justeat/menu/items/salad.jpg",
    "fish":        "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771951873/justeat/menu/items/fish.jpg",
    "meal-plate":  "https://res.cloudinary.com/dzyyygr1x/image/upload/v1771952117/justeat/menu/items/meal-plate.jpg",
}

# ── Category → default image key ────────────────────────────────────────
CATEGORY_MAP = {
    "Drinks":               "drink-soda",
    "Non-alcoholic Drinks": "drink-juice",
    "Sides & Drinks":       "drink-soda",
    "Classic Pizzas":       "pizza",
    "Special Pizzas":       "pizza",
    "Classic Burgers":      "burger",
    "Chicken Burgers":      "burger",
    "Premium Beef Burger":  "burger",
    "Veggie Burger":        "burger",
    "Ladyline Burger":      "burger",
    "Burger":               "burger",
    "Pasta":                "pasta",
    "Curry":                "curry",
    "Maki & Rolls":         "sushi",
    "Sushi Sets":           "sushi",
    "Kebab":                "kebab",
    "Dürüm & Wraps":       "wrap",
    "Salads":               "salad",
    "Sides":                "fries",
    "Starters":             "bruschetta",
    "Desserts":             "dessert",
    "Noodles & Rice":       "noodles",
    "Noodles":              "noodles",
    "Bread & Rice":         "naan-bread",
    "Tandoori":             "tandoori",
    "Mezze":                "hummus",
    "Tacos & Burritos":     "tacos",
    "Nachos & Sides":       "nachos",
    "Traditional":          "fondue",
    "Cordon Bleu":          "schnitzel",
    "Grilled Meats":        "steak",
    "Main Courses":         "meal-plate",
    "Main Dishes":          "meal-plate",
    "Popular Items":        "meal-plate",
    "Bowls":                "rice-bowl",
    "Finger Food":          "fries",
    "Dips":                 "hummus",
    "Chicken":              "chicken",
    "Soups":                "soup",
    "Menu":                 "burger",
    "Big Burger Favorites": "burger",
    "Big Loaded Fries":     "fries",
    "Kids":                 "fries",
    "Monthly Special":      "meal-plate",
}

# ── Item name keyword rules (checked first, overrides category) ─────────
# (regex_pattern, image_key) — first match wins
NAME_RULES = [
    # Drinks
    (r'coca.?cola|pepsi|fanta|sprite|7.?up|schweppes|rivella|ice\s*tea|soda|limonade', "drink-soda"),
    (r'beer|bier|lager|\bale\b|heineken|feldschl|corona', "drink-beer"),
    (r'coffee|kaffee|caf[eé]|espresso|cappuccino|\blatte\b|\btea\b|\btee\b|\bthé\b|hot\s+choc', "drink-coffee"),
    (r'juice|saft|jus|smoothie|lemonade|orangina|milkshake', "drink-juice"),
    (r'water|wasser|eau|mineral|pellegrino|evian|henniez', "drink-water"),
    # Desserts
    (r'ice\s*cream|glace|gelat[oi]|sorbet|eis\s*\(|kugel|ben\s*&\s*jerry|häagen', "ice-cream"),
    (r'tiramisu', "dessert-tiramisu"),
    (r'brownie|chocolate\s+cake|lava\s+cake|moelleux|fondant\s+choc', "dessert-brownie"),
    (r'cheesecake|cake|kuchen|gâteau|torte|tart', "dessert-cake"),
    (r'panna\s*cotta|cr[eè]me\s*br[uû]l[eé]e|flan|mousse|pudding', "dessert-panna-cotta"),
    # Main dishes
    (r'pizza|margherita|napoli|prosciutto|calzone|diavola|quattro|capricciosa|hawaii', "pizza"),
    (r'burger|smash|cheeseburger|hamburger', "burger"),
    (r'pasta|spaghetti|penne|tagliatelle|rigatoni|fettuccine|lasagna|gnocchi|ravioli|tortellini|carbonara|bolognese|arrabiata', "pasta"),
    (r'sushi|maki|nigiri|sashimi|roll|california|dragon|salmon.*roll|tuna.*roll', "sushi"),
    (r'kebab|döner|doner|schawarma|shawarma|gyros|gyro', "kebab"),
    (r'dürüm|wrap|burrito|quesadilla', "wrap"),
    (r'taco', "tacos"),
    (r'nachos', "nachos"),
    (r'curry|masala|tikka|korma|vindaloo|jalfrezi|madras|biryani|rogan\s*josh', "curry"),
    (r'tandoori|seekh|naan|paneer|samosa|pakora', "tandoori"),
    (r'noodle|chow\s*mein|pad\s*thai|ramen|udon|pho|lo\s*mein|bami', "noodles"),
    (r'fried\s*rice|yang\s*chow|nasi|rice\s+bowl|poke|bowl|buddha', "rice-bowl"),
    (r'steak|entrec[oô]te|filet|rib.?eye|t.?bone|beef\s+tenderloin', "steak"),
    (r'chicken|poulet|hähnchen|pollo|wings|nuggets|crispy.*chicken', "chicken"),
    (r'fish|fisch|poisson|salmon|lachs|tuna|thon|shrimp|prawn|crevette|calamari|seafood', "fish"),
    (r'salad|salade|salat|insalata|coleslaw|tabouleh|fattoush', "salad"),
    (r'soup|suppe|soupe|zuppa|minestrone|wonton|tom\s*yam|tom\s*kha', "soup"),
    (r'fries|pommes|fritten|patate|wedge|potato|kartoffel', "fries"),
    (r'onion\s*ring', "onion-rings"),
    (r'fondue|raclette|rösti', "fondue"),
    (r'schnitzel|cordon\s*bleu|escalope', "schnitzel"),
    (r'hummus|baba\s*ganoush|tzatziki|labneh', "hummus"),
    (r'bruschetta|spring\s*roll|dim\s*sum|edamame|tempura|antipast', "bruschetta"),
    (r'garlic\s*bread|naan|pita|bread|flatbread|focaccia', "naan-bread"),
]

COMPILED_RULES = [(re.compile(pat, re.IGNORECASE), key) for pat, key in NAME_RULES]


def get_name_en(item):
    name = item.get('name', '')
    if isinstance(name, dict):
        return name.get('en', name.get('de', ''))
    return str(name)


def match_by_name(name_en):
    for pattern, key in COMPILED_RULES:
        if pattern.search(name_en):
            return key
    return None


def main():
    items_path = os.path.join(DATA_DIR, 'menu_items.json')
    cats_path = os.path.join(DATA_DIR, 'menu_categories.json')

    with open(items_path, 'r', encoding='utf-8') as f:
        items = json.load(f)
    with open(cats_path, 'r', encoding='utf-8') as f:
        cats = json.load(f)

    cat_name_map = {}
    for c in cats:
        n = c['name']
        cat_name_map[c['_id']] = n.get('en', n.get('de', '')) if isinstance(n, dict) else str(n)

    # URLs that are our generic type images (re-assignable)
    our_urls = set(IMAGES.values())

    stats = {'already': 0, 'by_name': 0, 'by_cat': 0, 'fallback': 0}

    for item in items:
        current_url = item.get('image_url')
        # Keep pre-existing restaurant-specific images (e.g. Big Burger .webp files)
        if current_url and current_url not in our_urls:
            stats['already'] += 1
            continue

        name_en = get_name_en(item)
        cat_en = cat_name_map.get(item.get('category_id'), '')

        key = match_by_name(name_en)
        if key:
            item['image_url'] = IMAGES[key]
            stats['by_name'] += 1
            continue

        if cat_en in CATEGORY_MAP:
            key = CATEGORY_MAP[cat_en]
            item['image_url'] = IMAGES[key]
            stats['by_cat'] += 1
            continue

        item['image_url'] = IMAGES['meal-plate']
        stats['fallback'] += 1

    with open(items_path, 'w', encoding='utf-8') as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

    total = len(items)
    print(f"Total menu items:            {total}")
    print(f"Already had images:          {stats['already']}")
    print(f"Assigned by name keyword:    {stats['by_name']}")
    print(f"Assigned by category:        {stats['by_cat']}")
    print(f"Assigned fallback:           {stats['fallback']}")
    print(f"All items now have images:   {all(i.get('image_url') for i in items)}")

    from collections import Counter
    dist = Counter()
    for item in items:
        url = item.get('image_url', '')
        name = url.split('/')[-1].replace('.jpg', '') if url else 'none'
        dist[name] += 1

    print("\n── Image distribution ──")
    for name, count in dist.most_common():
        print(f"  {name:<22} {count:>5}")


if __name__ == '__main__':
    main()
