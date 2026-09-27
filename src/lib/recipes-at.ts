/**
 * recipes-at — a fighter's recipe book from Innsbruck supermarket food.
 *
 * Every ingredient is a built-in food (foods-at) with grams for ONE portion
 * and a role, so meal-plan can scale the protein, carb and fat parts
 * separately to land a meal on its slot's macros ("Hendl-Reis-Bowl, 210 g
 * chicken / 95 g rice / 8 g oil"). Veg stays fixed. Diet flags are derived
 * from the ingredients, not typed by hand.
 */
import type { DietaryRestriction } from './types';

export type IngredientRole = 'p' | 'c' | 'f' | 'v';
export type RecipeSlot = 'breakfast' | 'main' | 'snack' | 'pre' | 'post';

export interface RecipeDef {
  id: string;
  name: string;
  nameEn: string;
  slots: RecipeSlot[];
  minutes: number;
  /** foodId (foods-at, without the "at:" prefix), grams for 1 portion, role. */
  ingredients: [foodId: string, grams: number, role: IngredientRole][];
  steps: string[];
  mealPrep?: boolean;
}

export const RECIPES: RecipeDef[] = [
  // ── Breakfast ──────────────────────────────────────────────────────────
  { id: 'overnight-oats', name: 'Overnight Oats mit Skyr & Beeren', nameEn: 'Overnight oats with skyr & berries', slots: ['breakfast', 'snack'], minutes: 5, mealPrep: true,
    ingredients: [['oats', 60, 'c'], ['skyr', 200, 'p'], ['berries-frozen', 100, 'v'], ['honey', 10, 'c'], ['chia', 10, 'f']],
    steps: ['Hafer, Skyr, Chia und 100 ml Wasser verrühren', 'Beeren drauf, über Nacht in den Kühlschrank', 'Mit Honig servieren'] },
  { id: 'scrambled-eggs-bread', name: 'Rührei mit Vollkornbrot & Paradeiser', nameEn: 'Scrambled eggs on wholegrain bread', slots: ['breakfast'], minutes: 10,
    ingredients: [['egg', 165, 'p'], ['egg-white', 100, 'p'], ['wholegrain-bread', 100, 'c'], ['tomato', 120, 'v'], ['butter', 5, 'f']],
    steps: ['Eier + Eiklar verquirlen, salzen', 'In Butter bei mittlerer Hitze stocken lassen', 'Mit Brot und Paradeisern'] },
  { id: 'topfen-bowl', name: 'Topfen-Bowl mit Banane & Knuspermüsli', nameEn: 'Quark bowl with banana & granola', slots: ['breakfast', 'snack'], minutes: 3,
    ingredients: [['magertopfen', 250, 'p'], ['granola', 40, 'c'], ['banana', 120, 'c'], ['peanut-butter', 15, 'f']],
    steps: ['Topfen mit einem Schuss Milch cremig rühren', 'Banane, Müsli und Erdnussbutter drauf'] },
  { id: 'protein-porridge', name: 'Protein-Porridge mit Banane', nameEn: 'Protein porridge with banana', slots: ['breakfast', 'post'], minutes: 8,
    ingredients: [['oats', 70, 'c'], ['milk-15', 250, 'c'], ['whey', 30, 'p'], ['banana', 120, 'c'], ['walnuts', 15, 'f']],
    steps: ['Haferflocken in Milch 4 Min köcheln', 'Vom Herd, Whey einrühren', 'Banane + Walnüsse drauf'] },
  { id: 'semmel-schinken', name: 'Semmeln mit Schinken & Hüttenkäse', nameEn: 'Rolls with ham & cottage cheese', slots: ['breakfast', 'snack'], minutes: 3,
    ingredients: [['kaisersemmel', 100, 'c'], ['ham', 60, 'p'], ['cottage-cheese', 100, 'p'], ['cucumber', 100, 'v']],
    steps: ['Semmeln aufschneiden, Hüttenkäse drauf', 'Schinken und Gurke'] },
  { id: 'protein-pancakes', name: 'Protein-Palatschinken', nameEn: 'Protein pancakes', slots: ['breakfast', 'post'], minutes: 15,
    ingredients: [['egg', 110, 'p'], ['magertopfen', 150, 'p'], ['oats', 50, 'c'], ['berries-frozen', 100, 'v'], ['honey', 10, 'c'], ['rapeseed-oil', 5, 'f']],
    steps: ['Eier, Topfen und Hafer mixen', 'Dünn in wenig Öl ausbacken', 'Mit warmen Beeren und Honig'] },

  // ── Mains ──────────────────────────────────────────────────────────────
  { id: 'chicken-rice-bowl', name: 'Hendl-Reis-Bowl mit Brokkoli', nameEn: 'Chicken, rice & broccoli bowl', slots: ['main', 'post'], minutes: 25, mealPrep: true,
    ingredients: [['chicken-breast-raw', 180, 'p'], ['rice-raw', 80, 'c'], ['broccoli', 200, 'v'], ['olive-oil', 10, 'f']],
    steps: ['Reis kochen', 'Hendl in Streifen scharf anbraten, würzen (Paprika, Knoblauch)', 'Brokkoli 4 Min dämpfen', 'Mit Öl beträufeln'] },
  { id: 'fit-groestl', name: 'Tiroler Gröstl (fit)', nameEn: 'Tyrolean Gröstl (lean)', slots: ['main'], minutes: 30,
    ingredients: [['potato', 300, 'c'], ['pork-fillet', 150, 'p'], ['onion', 60, 'v'], ['egg', 55, 'p'], ['rapeseed-oil', 10, 'f']],
    steps: ['Gekochte Erdäpfel in Scheiben knusprig braten', 'Filet in Streifen + Zwiebel dazu, Kümmel, Majoran', 'Mit Spiegelei servieren'] },
  { id: 'gulasch-erdaepfel', name: 'Rindsgulasch mit Erdäpfeln', nameEn: 'Beef goulash with potatoes', slots: ['main'], minutes: 90, mealPrep: true,
    ingredients: [['beef-steak', 180, 'p'], ['onion', 100, 'v'], ['bell-pepper', 100, 'v'], ['potato', 300, 'c'], ['rapeseed-oil', 10, 'f']],
    steps: ['Zwiebeln langsam goldbraun rösten', 'Fleisch + Paprikapulver, mit Wasser aufgießen', '1 h schmoren', 'Mit gekochten Erdäpfeln'] },
  { id: 'bolognese', name: 'Spaghetti Bolognese (mager)', nameEn: 'Lean spaghetti bolognese', slots: ['main'], minutes: 30, mealPrep: true,
    ingredients: [['pasta-raw', 100, 'c'], ['beef-mince-lean', 150, 'p'], ['tomato', 200, 'v'], ['onion', 50, 'v'], ['olive-oil', 5, 'f'], ['parmesan', 10, 'f']],
    steps: ['Faschiertes mit Zwiebel anbraten', 'Paradeiser/Passata dazu, 15 Min köcheln', 'Mit Nudeln und Parmesan'] },
  { id: 'salmon-sweet-potato', name: 'Lachs mit Süßkartoffel & Fisolen', nameEn: 'Salmon, sweet potato & green beans', slots: ['main'], minutes: 30,
    ingredients: [['salmon', 150, 'p'], ['sweet-potato', 300, 'c'], ['green-beans', 200, 'v']],
    steps: ['Süßkartoffel in Spalten, 25 Min bei 200 °C', 'Lachs die letzten 12 Min dazu', 'Fisolen kurz blanchieren'] },
  { id: 'turkey-rice-salad', name: 'Putenschnitzel natur mit Reis & Salat', nameEn: 'Turkey cutlet with rice & salad', slots: ['main', 'post'], minutes: 20,
    ingredients: [['turkey-breast', 180, 'p'], ['rice-raw', 80, 'c'], ['lettuce', 100, 'v'], ['olive-oil', 10, 'f']],
    steps: ['Reis kochen', 'Putenschnitzel dünn klopfen, 3 Min pro Seite braten', 'Salat mit Öl und Essig'] },
  { id: 'chili', name: 'Chili con Carne mit Reis', nameEn: 'Chili con carne with rice', slots: ['main'], minutes: 35, mealPrep: true,
    ingredients: [['beef-mince-lean', 150, 'p'], ['kidney-beans', 150, 'c'], ['corn', 80, 'c'], ['tomato', 200, 'v'], ['onion', 50, 'v'], ['rice-raw', 60, 'c'], ['rapeseed-oil', 5, 'f']],
    steps: ['Faschiertes + Zwiebel anbraten', 'Bohnen, Mais, Paradeiser, Chili, Kreuzkümmel', '20 Min köcheln, mit Reis'] },
  { id: 'chicken-curry', name: 'Hühnercurry mit Joghurt & Reis', nameEn: 'Yogurt chicken curry with rice', slots: ['main'], minutes: 30, mealPrep: true,
    ingredients: [['chicken-breast-raw', 170, 'p'], ['rice-raw', 80, 'c'], ['bell-pepper', 100, 'v'], ['onion', 50, 'v'], ['greek-yogurt-0', 100, 'p'], ['rapeseed-oil', 8, 'f']],
    steps: ['Zwiebel + Currypaste anschwitzen', 'Hendl + Paprika dazu, braten', 'Vom Herd, Joghurt einrühren', 'Mit Reis'] },
  { id: 'trout-potatoes', name: 'Forelle mit Petersilerdäpfeln & Spinat', nameEn: 'Trout with parsley potatoes & spinach', slots: ['main'], minutes: 25,
    ingredients: [['trout', 200, 'p'], ['potato', 300, 'c'], ['spinach', 150, 'v'], ['butter', 10, 'f']],
    steps: ['Erdäpfel kochen, in Butter + Petersil schwenken', 'Forelle auf der Hautseite knusprig braten', 'Spinat zusammenfallen lassen'] },
  { id: 'lentil-dal', name: 'Linsen-Dal mit Reis', nameEn: 'Lentil dal with rice', slots: ['main'], minutes: 30, mealPrep: true,
    ingredients: [['lentils-raw', 90, 'p'], ['rice-raw', 60, 'c'], ['tomato', 150, 'v'], ['onion', 50, 'v'], ['spinach', 100, 'v'], ['rapeseed-oil', 10, 'f']],
    steps: ['Zwiebel, Knoblauch, Ingwer, Curry anschwitzen', 'Linsen + Paradeiser + Wasser, 20 Min', 'Spinat unterheben, mit Reis'] },
  { id: 'tofu-stirfry', name: 'Tofu-Gemüse-Pfanne mit Reis', nameEn: 'Tofu veg stir-fry with rice', slots: ['main'], minutes: 20,
    ingredients: [['tofu', 200, 'p'], ['rice-raw', 80, 'c'], ['broccoli', 150, 'v'], ['bell-pepper', 100, 'v'], ['rapeseed-oil', 10, 'f']],
    steps: ['Tofu würfeln, knusprig braten', 'Gemüse dazu, Sojasauce', 'Mit Reis'] },
  { id: 'tuna-pasta-salad', name: 'Thunfisch-Nudelsalat', nameEn: 'Tuna pasta salad', slots: ['main'], minutes: 15, mealPrep: true,
    ingredients: [['pasta-raw', 90, 'c'], ['tuna-water', 120, 'p'], ['corn', 60, 'c'], ['cucumber', 100, 'v'], ['greek-yogurt-0', 80, 'p'], ['olive-oil', 5, 'f']],
    steps: ['Nudeln kochen, abschrecken', 'Mit Thunfisch, Mais, Gurke', 'Joghurt-Zitronen-Dressing'] },
  { id: 'chicken-wrap', name: 'Hendl-Wraps mit Avocado', nameEn: 'Chicken wraps with avocado', slots: ['main'], minutes: 10,
    ingredients: [['tortilla', 120, 'c'], ['chicken-breast-cooked', 150, 'p'], ['lettuce', 50, 'v'], ['tomato', 100, 'v'], ['greek-yogurt-0', 50, 'p'], ['avocado', 50, 'f']],
    steps: ['Wraps kurz in der Pfanne wärmen', 'Mit Joghurt bestreichen', 'Hendl, Salat, Paradeiser, Avocado, einrollen'] },
  { id: 'omelette-rye', name: 'Gemüse-Omelette mit Schwarzbrot', nameEn: 'Veg omelette with rye bread', slots: ['main', 'breakfast'], minutes: 12,
    ingredients: [['egg', 165, 'p'], ['egg-white', 100, 'p'], ['mushrooms', 100, 'v'], ['spinach', 100, 'v'], ['rye-bread', 100, 'c'], ['butter', 5, 'f']],
    steps: ['Schwammerl + Spinat anbraten', 'Eier drüber, stocken lassen', 'Mit Schwarzbrot'] },
  { id: 'pork-polenta', name: 'Schweinsfilet mit Polenta & Zucchini', nameEn: 'Pork tenderloin with polenta & zucchini', slots: ['main'], minutes: 25,
    ingredients: [['pork-fillet', 180, 'p'], ['polenta', 70, 'c'], ['zucchini', 200, 'v'], ['olive-oil', 10, 'f']],
    steps: ['Polenta mit 3-facher Menge Wasser 5 Min rühren', 'Filet-Medaillons 3 Min pro Seite', 'Zucchini in Scheiben braten'] },
  { id: 'steak-potatoes', name: 'Steak mit Ofenerdäpfeln & Salat', nameEn: 'Steak with roast potatoes & salad', slots: ['main'], minutes: 35,
    ingredients: [['beef-steak', 200, 'p'], ['potato', 300, 'c'], ['lettuce', 100, 'v'], ['olive-oil', 10, 'f']],
    steps: ['Erdäpfel-Spalten 30 Min bei 220 °C', 'Steak scharf anbraten, rasten lassen', 'Salat mit Öl'] },
  { id: 'couscous-feta', name: 'Couscous-Salat mit Kichererbsen & Feta', nameEn: 'Couscous salad with chickpeas & feta', slots: ['main'], minutes: 15, mealPrep: true,
    ingredients: [['couscous', 70, 'c'], ['chickpeas', 120, 'p'], ['feta', 50, 'f'], ['cucumber', 100, 'v'], ['tomato', 100, 'v'], ['olive-oil', 10, 'f']],
    steps: ['Couscous mit heißem Wasser quellen lassen', 'Gemüse würfeln, Kichererbsen dazu', 'Feta, Öl, Zitrone'] },
  { id: 'kaspressknoedel-salat', name: 'Kaspressknödel mit Salat', nameEn: 'Cheese dumplings with salad', slots: ['main'], minutes: 15,
    ingredients: [['kaspressknoedel', 180, 'c'], ['lettuce', 150, 'v'], ['olive-oil', 5, 'f']],
    steps: ['Knödel in der Pfanne erwärmen', 'Mit grünem Salat — Hüttenklassiker, sparsam einplanen'] },

  // ── Snacks, pre, post ──────────────────────────────────────────────────
  { id: 'rice-cakes-honey', name: 'Reiswaffeln mit Honig & Banane', nameEn: 'Rice cakes with honey & banana', slots: ['pre', 'snack'], minutes: 2,
    ingredients: [['rice-cakes', 32, 'c'], ['honey', 20, 'c'], ['banana', 120, 'c']],
    steps: ['60–90 Min vor dem Training — schnell verdaulich, wenig Fett und Ballaststoffe'] },
  { id: 'skyr-berries', name: 'Skyr mit Beeren', nameEn: 'Skyr with berries', slots: ['post', 'snack'], minutes: 2,
    ingredients: [['skyr', 300, 'p'], ['berries-frozen', 100, 'v'], ['honey', 10, 'c']],
    steps: ['Alles verrühren'] },
  { id: 'recovery-shake', name: 'Recovery-Shake (Whey, Banane, Hafer)', nameEn: 'Recovery shake', slots: ['post'], minutes: 3,
    ingredients: [['whey', 30, 'p'], ['milk-15', 300, 'c'], ['banana', 120, 'c'], ['oats', 30, 'c']],
    steps: ['Alles mixen — ideal direkt nach dem Rollen'] },
  { id: 'topfen-marillen', name: 'Topfen mit Marillen', nameEn: 'Quark with apricots', slots: ['snack', 'post'], minutes: 2,
    ingredients: [['magertopfen', 250, 'p'], ['marillen', 120, 'c']],
    steps: ['Topfen cremig rühren, Marillen dazu'] },
  { id: 'cottage-bread', name: 'Hüttenkäse-Brot', nameEn: 'Cottage cheese on bread', slots: ['snack', 'breakfast'], minutes: 3,
    ingredients: [['wholegrain-bread', 100, 'c'], ['cottage-cheese', 150, 'p'], ['tomato', 100, 'v']],
    steps: ['Brot mit Hüttenkäse und Paradeisern, Salz, Pfeffer'] },
  { id: 'dates-almonds', name: 'Datteln & Mandeln', nameEn: 'Dates & almonds', slots: ['pre', 'snack'], minutes: 0,
    ingredients: [['dates', 40, 'c'], ['almonds', 20, 'f']],
    steps: ['Für unterwegs — Mandeln weglassen, wenn das Training in < 60 Min ist'] },
  { id: 'bedtime-topfen', name: 'Topfen vor dem Schlafen', nameEn: 'Bedtime quark', slots: ['snack'], minutes: 2,
    ingredients: [['magertopfen', 250, 'p'], ['peanut-butter', 10, 'f'], ['berries-frozen', 80, 'v']],
    steps: ['Langsames Protein über Nacht (Casein) — gut nach spätem Training'] },
  { id: 'banana-shake-pre', name: 'Banane + Isogetränk', nameEn: 'Banana + sports drink', slots: ['pre'], minutes: 0,
    ingredients: [['banana', 120, 'c'], ['sports-drink', 500, 'c']],
    steps: ['30–45 Min vor harten Einheiten / Sparring'] },
];

// ── Diet flags from ingredients ─────────────────────────────────────────────

const MEAT = new Set(['chicken-breast-raw', 'chicken-breast-cooked', 'chicken-thigh', 'brathendl', 'turkey-breast', 'beef-mince-lean', 'beef-mince', 'beef-steak', 'pork-fillet', 'pork-schnitzel', 'leberkaese', 'extrawurst', 'ham', 'turkey-ham', 'speck', 'wuerstel', 'kaesekrainer', 'salami']);
const FISH = new Set(['salmon', 'tuna-water', 'cod', 'trout', 'shrimp']);
const PORK = new Set(['pork-fillet', 'pork-schnitzel', 'leberkaese', 'extrawurst', 'ham', 'speck', 'wuerstel', 'kaesekrainer', 'salami', 'kaspressknoedel']);
const DAIRY = new Set(['magertopfen', 'topfen-20', 'skyr', 'greek-yogurt-0', 'greek-yogurt-10', 'yogurt', 'cottage-cheese', 'milk-35', 'milk-15', 'bergkaese', 'gouda', 'mozzarella', 'mozzarella-light', 'feta', 'parmesan', 'butter', 'cream', 'sour-cream', 'protein-pudding', 'protein-yogurt', 'whey', 'casein', 'kaspressknoedel', 'granola']);
const EGG = new Set(['egg', 'egg-white', 'kaspressknoedel']);
const GLUTEN = new Set(['oats', 'pasta-raw', 'pasta-cooked', 'pasta-wholegrain', 'kaisersemmel', 'vollkornweckerl', 'wholegrain-bread', 'rye-bread', 'toast', 'knaeckebrot', 'tortilla', 'couscous', 'bulgur', 'muesli', 'granola', 'cornflakes', 'gnocchi', 'kaspressknoedel']);

export function recipeFits(r: RecipeDef, diet: DietaryRestriction[]): boolean {
  const ids = r.ingredients.map(i => i[0]);
  const has = (set: Set<string>) => ids.some(id => set.has(id));
  for (const d of diet) {
    if (d === 'vegetarian' && (has(MEAT) || has(FISH))) return false;
    if (d === 'vegan' && (has(MEAT) || has(FISH) || has(DAIRY) || has(EGG) || ids.includes('honey'))) return false;
    if ((d === 'halal' || d === 'kosher') && has(PORK)) return false;
    if (d === 'kosher' && ids.includes('shrimp')) return false;
    if (d === 'dairy_free' && has(DAIRY)) return false;
    if (d === 'gluten_free' && has(GLUTEN)) return false;
  }
  return true;
}

/** Aisle for the shopping list. */
export function aisleFor(foodId: string): string {
  if (MEAT.has(foodId) || FISH.has(foodId)) return 'Fleisch & Fisch';
  if (DAIRY.has(foodId) || EGG.has(foodId) || foodId === 'tofu') return 'Kühlregal';
  if (['banana', 'apple', 'pear', 'blueberries', 'strawberries', 'raspberries', 'orange', 'grapes', 'kiwi', 'mango', 'marillen',
    'broccoli', 'tomato', 'cucumber', 'bell-pepper', 'carrot', 'spinach', 'lettuce', 'zucchini', 'onion', 'mushrooms', 'cauliflower',
    'green-beans', 'avocado', 'potato', 'sweet-potato'].includes(foodId)) return 'Obst & Gemüse';
  if (['berries-frozen', 'peas'].includes(foodId)) return 'Tiefkühl';
  if (['kaisersemmel', 'vollkornweckerl', 'wholegrain-bread', 'rye-bread', 'toast', 'tortilla'].includes(foodId)) return 'Brot & Gebäck';
  return 'Vorrat';
}
