/**
 * foods-at — the built-in food library, per 100 g, German + English names.
 *
 * Replaces the old per-serving FOOD_DB ("Chicken Breast (170g)" with the
 * grams baked into the name) for search and logging: every entry here has
 * real per-100 g values, so any amount can be logged and re-scaled.
 * Tilted to what's on the shelf at MPreis / Spar / Billa / Hofer and on
 * menus in Tyrol. Values: Bundeslebensmittelschlüssel / USDA / typical
 * Austrian product labels, rounded.
 */
import type { FoodItem, Per100g, FoodServing } from './types';

type Row = [
  id: string, de: string, en: string,
  kcal: number, protein: number, carbs: number, fat: number, fiber: number,
  servings: FoodServing[], keywords?: string, tags?: string,
];

const g = (label: string, grams: number): FoodServing => ({ label, grams });
const G100 = g('100 g', 100);

const ROWS: Row[] = [
  // ── Meat, fish, eggs ───────────────────────────────────────────────────
  ['chicken-breast-raw', 'Hühnerbrust (roh)', 'Chicken breast (raw)', 110, 23.5, 0, 1.5, 0, [g('1 Filet', 170), G100], 'huhn hendl haehnchen chicken breast brust filet', 'protein,meat'],
  ['chicken-breast-cooked', 'Hühnerbrust (gegart)', 'Chicken breast (cooked)', 165, 31, 0, 3.6, 0, [g('1 Filet', 130), G100], 'huhn hendl haehnchen chicken breast gebraten grilled', 'protein,meat'],
  ['chicken-thigh', 'Hühnerkeule (ohne Haut)', 'Chicken thigh (skinless)', 175, 25, 0, 8, 0, [g('1 Keule', 120), G100], 'huhn hendl keule thigh haxerl', 'protein,meat'],
  ['brathendl', 'Brathendl (mit Haut)', 'Roast chicken (with skin)', 220, 25, 0, 13, 0, [g('½ Hendl', 300), G100], 'hendl brathendl roast chicken grillhendl', 'protein,meat,dish'],
  ['turkey-breast', 'Putenbrust (roh)', 'Turkey breast (raw)', 107, 24, 0, 1, 0, [g('1 Schnitzel', 150), G100], 'pute truthahn turkey putenschnitzel', 'protein,meat'],
  ['beef-mince-lean', 'Rinderfaschiertes mager (5 %)', 'Lean beef mince (5 %)', 137, 21, 0, 5, 0, [g('1 Packung', 400), G100], 'faschiertes hackfleisch mince ground beef rind', 'protein,meat'],
  ['beef-mince', 'Rinderfaschiertes (20 %)', 'Beef mince (20 %)', 250, 17, 0, 20, 0, [g('1 Packung', 500), G100], 'faschiertes hackfleisch mince ground beef rind', 'protein,meat'],
  ['beef-steak', 'Rindersteak (roh)', 'Beef steak (raw)', 130, 22, 0, 4.5, 0, [g('1 Steak', 250), G100], 'steak rind beef huefte rump', 'protein,meat'],
  ['pork-fillet', 'Schweinsfilet (roh)', 'Pork tenderloin (raw)', 110, 21, 0, 2.5, 0, [g('1 Stück', 150), G100], 'schwein filet pork tenderloin', 'protein,meat'],
  ['pork-schnitzel', 'Schweinsschnitzel (roh)', 'Pork loin cutlet (raw)', 120, 22, 0, 3.5, 0, [g('1 Schnitzel', 150), G100], 'schwein schnitzel pork cutlet karree', 'protein,meat'],
  ['salmon', 'Lachs (roh)', 'Salmon (raw)', 200, 20, 0, 13, 0, [g('1 Filet', 125), G100], 'lachs salmon fisch fish', 'protein,fish'],
  ['tuna-water', 'Thunfisch in Wasser (abgetropft)', 'Tuna in water (drained)', 110, 25, 0, 1, 0, [g('1 Dose', 120), G100], 'thunfisch tuna dose', 'protein,fish'],
  ['cod', 'Kabeljau / Seelachs (roh)', 'Cod / pollock (raw)', 80, 18, 0, 0.7, 0, [g('1 Filet', 150), G100], 'kabeljau seelachs dorsch cod pollock white fish fisch', 'protein,fish'],
  ['trout', 'Forelle (roh)', 'Trout (raw)', 110, 20, 0, 3, 0, [g('1 Filet', 120), G100], 'forelle saibling trout char fisch', 'protein,fish'],
  ['shrimp', 'Garnelen', 'Shrimp', 85, 19, 0, 1, 0, [g('1 Packung', 200), G100], 'garnelen shrimp prawns scampi', 'protein,fish'],
  ['egg', 'Ei', 'Egg', 143, 12.6, 0.7, 9.5, 0, [g('1 Ei (M)', 55), g('3 Eier', 165), G100], 'ei eier egg eggs spiegelei ruehrei', 'protein,breakfast'],
  ['egg-white', 'Eiklar', 'Egg white', 48, 10.9, 0.7, 0.2, 0, [g('1 Eiklar', 33), g('250 ml', 250), G100], 'eiklar eiweiss egg white', 'protein'],
  ['tofu', 'Tofu natur', 'Tofu (plain)', 120, 13, 1.5, 7, 1, [g('1 Block', 200), G100], 'tofu', 'protein,vegan'],
  ['leberkaese', 'Leberkäse', 'Leberkäse', 290, 12, 2, 26, 0, [g('1 Scheibe', 120), G100], 'leberkaese leberkas meat loaf', 'meat'],
  ['extrawurst', 'Extrawurst', 'Extrawurst (sausage slices)', 230, 12, 2, 19, 0, [g('3 Scheiben', 45), G100], 'extrawurst wurst', 'meat'],
  ['ham', 'Beinschinken / Kochschinken', 'Cooked ham', 110, 19, 1, 3.5, 0, [g('3 Scheiben', 45), G100], 'schinken beinschinken kochschinken ham', 'protein,meat'],
  ['turkey-ham', 'Putenschinken', 'Turkey ham', 105, 20, 2, 2, 0, [g('3 Scheiben', 45), G100], 'putenschinken putenwurst turkey ham', 'protein,meat'],
  ['speck', 'Tiroler Speck', 'Tyrolean speck', 350, 25, 0, 28, 0, [g('4 Scheiben', 25), G100], 'speck tiroler bacon', 'meat'],
  ['wuerstel', 'Frankfurter / Wiener Würstel', 'Frankfurter sausage', 270, 12, 1, 24, 0, [g('1 Paar', 100), G100], 'wuerstel frankfurter wiener sausage hot dog', 'meat'],
  ['kaesekrainer', 'Käsekrainer', 'Käsekrainer (cheese sausage)', 300, 12, 2, 27, 0, [g('1 Stück', 150), G100], 'kaesekrainer krainer wurst sausage', 'meat'],
  ['salami', 'Salami', 'Salami', 390, 22, 1, 33, 0, [g('5 Scheiben', 30), G100], 'salami', 'meat'],

  // ── Dairy ───────────────────────────────────────────────────────────────
  ['magertopfen', 'Magertopfen', 'Low-fat quark (Magertopfen)', 67, 12, 4, 0.2, 0, [g('1 Becher', 250), G100], 'topfen magertopfen quark', 'protein,dairy'],
  ['topfen-20', 'Topfen 20 %', 'Quark 20 %', 110, 12, 3.5, 5, 0, [g('1 Becher', 250), G100], 'topfen quark', 'dairy'],
  ['skyr', 'Skyr natur', 'Skyr (plain)', 63, 11, 4, 0.2, 0, [g('1 Becher', 450), g('1 kleiner Becher', 150), G100], 'skyr', 'protein,dairy,breakfast'],
  ['greek-yogurt-0', 'Griechisches Joghurt 0 %', 'Greek yogurt 0 %', 57, 10, 4, 0.2, 0, [g('1 Becher', 170), G100], 'griechisch joghurt greek yogurt yoghurt', 'protein,dairy'],
  ['greek-yogurt-10', 'Griechisches Joghurt 10 %', 'Greek yogurt 10 %', 130, 5.5, 4, 10, 0, [g('1 Becher', 150), G100], 'griechisch joghurt greek yogurt yoghurt', 'dairy'],
  ['yogurt', 'Naturjoghurt 3,6 %', 'Plain yogurt 3.6 %', 65, 3.5, 4.5, 3.6, 0, [g('1 Becher', 250), G100], 'joghurt naturjoghurt yogurt yoghurt', 'dairy'],
  ['cottage-cheese', 'Hüttenkäse', 'Cottage cheese', 100, 12, 2.5, 4.5, 0, [g('1 Becher', 200), G100], 'huettenkaese cottage cheese koernig', 'protein,dairy'],
  ['milk-35', 'Vollmilch 3,5 %', 'Whole milk 3.5 %', 64, 3.3, 4.8, 3.5, 0, [g('1 Glas (250 ml)', 250), G100], 'milch vollmilch milk', 'dairy'],
  ['milk-15', 'Milch 1,5 %', 'Semi-skimmed milk 1.5 %', 47, 3.4, 4.9, 1.5, 0, [g('1 Glas (250 ml)', 250), G100], 'milch leichtmilch milk', 'dairy'],
  ['oat-drink', 'Haferdrink', 'Oat drink', 45, 0.5, 6.5, 1.5, 0.8, [g('1 Glas (250 ml)', 250), G100], 'haferdrink hafermilch oat milk', 'vegan'],
  ['bergkaese', 'Bergkäse / Emmentaler', 'Alpine cheese / Emmental', 400, 28, 0, 32, 0, [g('2 Scheiben', 40), G100], 'bergkaese emmentaler kaese cheese alpine tilsiter', 'dairy'],
  ['gouda', 'Gouda', 'Gouda', 350, 24, 0, 28, 0, [g('2 Scheiben', 40), G100], 'gouda kaese cheese', 'dairy'],
  ['mozzarella', 'Mozzarella', 'Mozzarella', 250, 18, 1, 19, 0, [g('1 Kugel', 125), G100], 'mozzarella', 'dairy'],
  ['mozzarella-light', 'Mozzarella light', 'Mozzarella light', 165, 20, 1, 9, 0, [g('1 Kugel', 125), G100], 'mozzarella light', 'protein,dairy'],
  ['feta', 'Feta / Schafkäse', 'Feta', 265, 14, 1, 22, 0, [g('½ Packung', 100), G100], 'feta schafkaese', 'dairy'],
  ['parmesan', 'Parmesan', 'Parmesan', 400, 35, 0, 28, 0, [g('1 EL gerieben', 10), G100], 'parmesan grana', 'dairy'],
  ['butter', 'Butter', 'Butter', 740, 0.7, 0.6, 82, 0, [g('1 TL', 5), g('1 EL', 12), G100], 'butter', 'fat'],
  ['cream', 'Schlagobers', 'Whipping cream', 330, 2.5, 3, 33, 0, [g('1 EL', 15), g('1 Becher', 250), G100], 'schlagobers obers sahne cream', 'dairy'],
  ['sour-cream', 'Sauerrahm', 'Sour cream', 190, 3, 4, 18, 0, [g('1 EL', 20), G100], 'sauerrahm schmand sour cream', 'dairy'],
  ['protein-pudding', 'High-Protein Pudding', 'High-protein pudding', 75, 10, 5.5, 1.5, 0, [g('1 Becher', 200), G100], 'protein pudding ehrmann high protein', 'protein,snack'],
  ['protein-yogurt', 'High-Protein Joghurt', 'High-protein yogurt', 70, 10, 5, 0.3, 0, [g('1 Becher', 200), G100], 'protein joghurt high protein yogurt', 'protein,snack'],
  ['whey', 'Whey Protein', 'Whey protein', 380, 78, 6, 5, 0, [g('1 Scoop', 30), G100], 'whey protein shake eiweiss pulver', 'protein,supplement'],
  ['casein', 'Casein', 'Casein protein', 360, 80, 5, 2, 0, [g('1 Scoop', 30), G100], 'casein kasein protein', 'protein,supplement'],

  // ── Grains, bread, starch ──────────────────────────────────────────────
  ['oats', 'Haferflocken', 'Rolled oats', 370, 13.5, 59, 7, 10, [g('1 Portion', 60), g('1 EL', 10), G100], 'hafer haferflocken oats oatmeal porridge', 'carb,breakfast'],
  ['rice-raw', 'Reis (roh)', 'Rice (raw)', 350, 7, 78, 0.6, 1.4, [g('1 Portion', 75), G100], 'reis rice basmati jasmin roh', 'carb'],
  ['rice-cooked', 'Reis (gekocht)', 'Rice (cooked)', 130, 2.7, 28, 0.3, 0.4, [g('1 Portion', 200), G100], 'reis rice basmati jasmin gekocht', 'carb'],
  ['pasta-raw', 'Nudeln (roh)', 'Pasta (raw)', 355, 12.5, 71, 1.5, 3, [g('1 Portion', 100), G100], 'nudeln pasta spaghetti penne fusilli teigwaren', 'carb'],
  ['pasta-cooked', 'Nudeln (gekocht)', 'Pasta (cooked)', 150, 5.3, 30, 0.7, 1.3, [g('1 Portion', 250), G100], 'nudeln pasta spaghetti penne gekocht', 'carb'],
  ['pasta-wholegrain', 'Vollkornnudeln (roh)', 'Wholegrain pasta (raw)', 340, 13, 64, 2.5, 8, [g('1 Portion', 100), G100], 'vollkorn nudeln wholegrain pasta', 'carb'],
  ['potato', 'Erdäpfel (gekocht)', 'Potatoes (boiled)', 72, 2, 15.5, 0.1, 1.8, [g('1 Portion', 250), g('1 Erdapfel', 120), G100], 'erdaepfel kartoffel potato potatoes', 'carb'],
  ['sweet-potato', 'Süßkartoffel', 'Sweet potato', 86, 1.6, 20, 0.1, 3, [g('1 Stück', 250), G100], 'suesskartoffel sweet potato', 'carb'],
  ['kaisersemmel', 'Kaisersemmel', 'Kaiser roll', 280, 9, 55, 1.5, 3, [g('1 Semmel', 50), G100], 'semmel kaisersemmel broetchen roll weckerl', 'carb,breakfast'],
  ['vollkornweckerl', 'Vollkornweckerl', 'Wholegrain roll', 250, 9, 44, 3, 7, [g('1 Weckerl', 70), G100], 'vollkorn weckerl weckerl roll', 'carb,breakfast'],
  ['wholegrain-bread', 'Vollkornbrot', 'Wholegrain bread', 220, 8, 40, 1.5, 7, [g('1 Scheibe', 50), G100], 'vollkornbrot brot bread', 'carb,breakfast'],
  ['rye-bread', 'Roggenmischbrot / Schwarzbrot', 'Rye bread', 220, 6, 44, 1.2, 6, [g('1 Scheibe', 50), G100], 'schwarzbrot roggenbrot brot bread rye bauernbrot', 'carb,breakfast'],
  ['toast', 'Toastbrot', 'Toast bread', 260, 8, 48, 3.5, 3, [g('1 Scheibe', 25), G100], 'toast toastbrot', 'carb,breakfast'],
  ['knaeckebrot', 'Knäckebrot', 'Crispbread', 350, 10, 66, 1.5, 15, [g('1 Scheibe', 10), G100], 'knaeckebrot crispbread', 'carb'],
  ['rice-cakes', 'Reiswaffeln', 'Rice cakes', 385, 8, 80, 2.8, 3, [g('1 Waffel', 8), g('4 Waffeln', 32), G100], 'reiswaffeln rice cakes', 'carb,snack'],
  ['tortilla', 'Tortilla Wrap', 'Tortilla wrap', 310, 8, 52, 7, 3, [g('1 Wrap', 60), G100], 'wrap tortilla', 'carb'],
  ['couscous', 'Couscous (roh)', 'Couscous (dry)', 360, 12, 72, 1.5, 5, [g('1 Portion', 70), G100], 'couscous', 'carb'],
  ['quinoa', 'Quinoa (roh)', 'Quinoa (dry)', 370, 14, 64, 6, 7, [g('1 Portion', 70), G100], 'quinoa', 'carb'],
  ['bulgur', 'Bulgur (roh)', 'Bulgur (dry)', 340, 12, 69, 1.3, 8, [g('1 Portion', 70), G100], 'bulgur', 'carb'],
  ['polenta', 'Polenta (roh)', 'Polenta (dry)', 360, 8, 77, 1, 3, [g('1 Portion', 70), G100], 'polenta mais griess', 'carb'],
  ['muesli', 'Müsli (ungezuckert)', 'Muesli (unsweetened)', 360, 10, 60, 6, 9, [g('1 Portion', 60), G100], 'muesli granola', 'carb,breakfast'],
  ['granola', 'Knuspermüsli', 'Granola', 450, 9, 64, 16, 7, [g('1 Portion', 50), G100], 'knuspermuesli granola crunchy', 'carb,breakfast'],
  ['cornflakes', 'Cornflakes', 'Cornflakes', 380, 7, 84, 0.9, 3, [g('1 Portion', 40), G100], 'cornflakes cerealien cereal', 'carb,breakfast'],
  ['gnocchi', 'Gnocchi', 'Gnocchi', 150, 3.5, 33, 0.3, 1.5, [g('1 Packung', 400), G100], 'gnocchi', 'carb'],

  // ── Fruit ──────────────────────────────────────────────────────────────
  ['banana', 'Banane', 'Banana', 90, 1.1, 21, 0.2, 2, [g('1 Banane', 120), G100], 'banane banana', 'fruit,snack'],
  ['apple', 'Apfel', 'Apple', 54, 0.3, 12, 0.4, 2.3, [g('1 Apfel', 180), G100], 'apfel apple', 'fruit,snack'],
  ['pear', 'Birne', 'Pear', 55, 0.5, 12, 0.3, 3, [g('1 Birne', 180), G100], 'birne pear', 'fruit,snack'],
  ['blueberries', 'Heidelbeeren', 'Blueberries', 57, 0.7, 13, 0.3, 2.4, [g('1 Schale', 125), G100], 'heidelbeeren blaubeeren beeren blueberries berries', 'fruit'],
  ['strawberries', 'Erdbeeren', 'Strawberries', 32, 0.7, 6, 0.3, 2, [g('1 Schale', 250), G100], 'erdbeeren beeren strawberries berries', 'fruit'],
  ['raspberries', 'Himbeeren', 'Raspberries', 43, 1.3, 5, 0.3, 6.7, [g('1 Schale', 125), G100], 'himbeeren beeren raspberries berries', 'fruit'],
  ['berries-frozen', 'Beerenmischung (TK)', 'Mixed berries (frozen)', 45, 1, 8, 0.4, 4, [g('1 Portion', 150), G100], 'beeren tk tiefkuehl mixed berries frozen', 'fruit'],
  ['orange', 'Orange', 'Orange', 47, 1, 10, 0.2, 2.2, [g('1 Orange', 150), G100], 'orange', 'fruit,snack'],
  ['grapes', 'Weintrauben', 'Grapes', 70, 0.7, 16, 0.2, 1.5, [g('1 Handvoll', 100), G100], 'weintrauben trauben grapes', 'fruit,snack'],
  ['kiwi', 'Kiwi', 'Kiwi', 60, 1, 12, 0.6, 3, [g('1 Kiwi', 75), G100], 'kiwi', 'fruit,snack'],
  ['mango', 'Mango', 'Mango', 60, 0.8, 14, 0.4, 1.6, [g('1 Mango', 300), G100], 'mango', 'fruit'],
  ['marillen', 'Marillen', 'Apricots', 45, 0.9, 9, 0.1, 2, [g('1 Marille', 40), G100], 'marillen marille aprikose apricot', 'fruit'],
  ['dates', 'Datteln (getrocknet)', 'Dates (dried)', 280, 2.5, 66, 0.4, 8, [g('1 Dattel', 8), g('5 Datteln', 40), G100], 'datteln dates', 'fruit,snack,preworkout'],
  ['raisins', 'Rosinen', 'Raisins', 300, 3, 70, 0.5, 4, [g('1 Handvoll', 30), G100], 'rosinen raisins', 'fruit'],

  // ── Vegetables, legumes ────────────────────────────────────────────────
  ['broccoli', 'Brokkoli', 'Broccoli', 34, 2.8, 4.5, 0.4, 3, [g('1 Portion', 200), G100], 'brokkoli broccoli', 'veg'],
  ['tomato', 'Paradeiser', 'Tomato', 18, 0.9, 3, 0.2, 1.2, [g('1 Paradeiser', 120), G100], 'paradeiser tomate tomato', 'veg'],
  ['cucumber', 'Gurke', 'Cucumber', 12, 0.6, 2, 0.1, 0.5, [g('½ Gurke', 200), G100], 'gurke cucumber', 'veg'],
  ['bell-pepper', 'Paprika', 'Bell pepper', 30, 1, 5, 0.3, 2, [g('1 Paprika', 150), G100], 'paprika pepper', 'veg'],
  ['carrot', 'Karotte', 'Carrot', 36, 0.9, 7, 0.2, 3, [g('1 Karotte', 80), G100], 'karotte karotten moehre carrot', 'veg'],
  ['spinach', 'Blattspinat', 'Spinach', 23, 2.9, 1.5, 0.4, 2.2, [g('1 Portion', 150), G100], 'spinat blattspinat spinach', 'veg'],
  ['lettuce', 'Blattsalat', 'Salad greens', 14, 1.3, 1.5, 0.2, 1.5, [g('1 Schüssel', 80), G100], 'salat blattsalat eisberg vogerl rucola lettuce salad', 'veg'],
  ['zucchini', 'Zucchini', 'Zucchini', 17, 1.2, 2.5, 0.3, 1.1, [g('1 Zucchini', 250), G100], 'zucchini courgette', 'veg'],
  ['onion', 'Zwiebel', 'Onion', 40, 1.1, 8, 0.1, 1.7, [g('1 Zwiebel', 80), G100], 'zwiebel onion', 'veg'],
  ['mushrooms', 'Champignons', 'Mushrooms', 22, 3, 0.5, 0.3, 2, [g('1 Portion', 150), G100], 'champignons pilze schwammerl mushrooms', 'veg'],
  ['cauliflower', 'Karfiol', 'Cauliflower', 25, 2, 3, 0.3, 2.5, [g('1 Portion', 200), G100], 'karfiol blumenkohl cauliflower', 'veg'],
  ['green-beans', 'Fisolen', 'Green beans', 31, 1.8, 5, 0.2, 3, [g('1 Portion', 150), G100], 'fisolen bohnen gruen green beans', 'veg'],
  ['peas', 'Erbsen (TK)', 'Peas (frozen)', 80, 5.4, 12, 0.4, 5, [g('1 Portion', 100), G100], 'erbsen peas', 'veg'],
  ['corn', 'Mais (Dose)', 'Sweetcorn (canned)', 85, 3, 15, 1.2, 2.8, [g('1 Dose', 140), G100], 'mais corn', 'veg'],
  ['kidney-beans', 'Kidneybohnen (Dose, abgetropft)', 'Kidney beans (canned)', 110, 7.5, 15, 0.5, 6, [g('1 Dose', 250), G100], 'kidneybohnen bohnen kidney beans', 'veg,vegan'],
  ['chickpeas', 'Kichererbsen (Dose, abgetropft)', 'Chickpeas (canned)', 120, 7, 16, 2.5, 5, [g('1 Dose', 240), G100], 'kichererbsen chickpeas', 'veg,vegan'],
  ['lentils-raw', 'Linsen (roh)', 'Lentils (dry)', 330, 24, 49, 1.5, 11, [g('1 Portion', 70), G100], 'linsen lentils', 'veg,vegan'],
  ['sauerkraut', 'Sauerkraut', 'Sauerkraut', 19, 1.5, 0.8, 0.3, 2.1, [g('1 Portion', 150), G100], 'sauerkraut kraut', 'veg'],
  ['avocado', 'Avocado', 'Avocado', 160, 2, 1.9, 15, 6.7, [g('½ Avocado', 70), G100], 'avocado', 'fat'],

  // ── Fats, nuts, seeds ──────────────────────────────────────────────────
  ['olive-oil', 'Olivenöl', 'Olive oil', 884, 0, 0, 100, 0, [g('1 TL', 5), g('1 EL', 10), G100], 'olivenoel oel olive oil', 'fat'],
  ['rapeseed-oil', 'Rapsöl', 'Rapeseed oil', 884, 0, 0, 100, 0, [g('1 EL', 10), G100], 'rapsoel oel canola', 'fat'],
  ['pumpkin-seed-oil', 'Kürbiskernöl', 'Pumpkin seed oil', 880, 0, 0, 100, 0, [g('1 EL', 10), G100], 'kuerbiskernoel kernoel pumpkin', 'fat'],
  ['peanut-butter', 'Erdnussbutter', 'Peanut butter', 600, 25, 14, 50, 6, [g('1 EL', 15), G100], 'erdnussbutter peanut butter', 'fat'],
  ['almonds', 'Mandeln', 'Almonds', 600, 21, 6, 52, 12, [g('1 Handvoll', 30), G100], 'mandeln almonds nuesse nuts', 'fat,snack'],
  ['walnuts', 'Walnüsse', 'Walnuts', 670, 15, 10, 65, 6, [g('1 Handvoll', 30), G100], 'walnuesse nuesse walnuts nuts', 'fat,snack'],
  ['cashews', 'Cashews', 'Cashews', 580, 18, 30, 44, 3, [g('1 Handvoll', 30), G100], 'cashews cashew nuesse nuts', 'fat,snack'],
  ['peanuts', 'Erdnüsse', 'Peanuts', 590, 26, 10, 49, 8, [g('1 Handvoll', 30), G100], 'erdnuesse peanuts', 'fat,snack'],
  ['pumpkin-seeds', 'Kürbiskerne', 'Pumpkin seeds', 580, 30, 10, 49, 6, [g('1 EL', 10), g('1 Handvoll', 30), G100], 'kuerbiskerne pumpkin seeds', 'fat'],
  ['chia', 'Chiasamen', 'Chia seeds', 490, 17, 8, 31, 34, [g('1 EL', 12), G100], 'chia chiasamen', 'fat'],
  ['flaxseed', 'Leinsamen', 'Flaxseed', 530, 18, 2, 42, 27, [g('1 EL', 10), G100], 'leinsamen flax', 'fat'],

  // ── Snacks, sweets ─────────────────────────────────────────────────────
  ['protein-bar', 'Proteinriegel', 'Protein bar', 360, 33, 35, 12, 5, [g('1 Riegel', 60), G100], 'proteinriegel protein bar riegel', 'protein,snack'],
  ['manner', 'Manner Schnitten', 'Manner wafers', 505, 6, 64, 25, 2, [g('1 Packung', 75), g('1 Schnitte', 15), G100], 'manner schnitten neapolitaner waffel wafers', 'snack,sweet'],
  ['mozartkugel', 'Mozartkugel', 'Mozartkugel', 480, 6, 51, 28, 3, [g('1 Kugel', 20), G100], 'mozartkugel', 'snack,sweet'],
  ['milk-chocolate', 'Milchschokolade', 'Milk chocolate', 540, 7, 57, 31, 2, [g('1 Riegel (25 g)', 25), g('1 Tafel', 100), G100], 'schokolade milchschokolade chocolate milka', 'snack,sweet'],
  ['dark-chocolate', 'Zartbitter 70 %', 'Dark chocolate 70 %', 580, 8, 33, 43, 11, [g('2 Rippen', 20), G100], 'zartbitter schokolade dark chocolate', 'snack,sweet'],
  ['gummies', 'Fruchtgummi', 'Gummy sweets', 343, 7, 77, 0.5, 0, [g('1 Handvoll', 30), g('1 Packung', 100), G100], 'haribo gummi goldbaeren fruchtgummi gummy', 'snack,sweet,preworkout'],
  ['chips', 'Chips', 'Crisps', 530, 6, 53, 32, 4, [g('1 Handvoll', 30), g('1 Packung', 150), G100], 'chips crisps kelly', 'snack'],
  ['honey', 'Honig', 'Honey', 320, 0.4, 80, 0, 0, [g('1 TL', 7), g('1 EL', 20), G100], 'honig honey', 'sweet'],
  ['jam', 'Marmelade', 'Jam', 250, 0.3, 60, 0, 1, [g('1 EL', 20), G100], 'marmelade konfituere jam', 'sweet,breakfast'],
  ['nutella', 'Nuss-Nougat-Creme', 'Hazelnut spread', 540, 6, 57, 31, 3, [g('1 EL', 15), G100], 'nutella nussnougat hazelnut spread', 'sweet'],

  // ── Drinks ─────────────────────────────────────────────────────────────
  ['almdudler', 'Almdudler', 'Almdudler', 32, 0, 8, 0, 0, [g('1 Flasche (0,5 l)', 500), g('1 Glas (0,33 l)', 330), G100], 'almdudler limo', 'drink'],
  ['almdudler-light', 'Almdudler zuckerfrei', 'Almdudler sugar-free', 1, 0, 0.1, 0, 0, [g('1 Flasche (0,5 l)', 500), G100], 'almdudler zuckerfrei light', 'drink'],
  ['cola', 'Cola', 'Cola', 42, 0, 10.6, 0, 0, [g('1 Dose (0,33 l)', 330), g('0,5 l', 500), G100], 'cola coke', 'drink'],
  ['cola-zero', 'Cola Zero', 'Cola Zero', 0.3, 0, 0, 0, 0, [g('1 Dose (0,33 l)', 330), G100], 'cola zero light coke', 'drink'],
  ['red-bull', 'Red Bull', 'Red Bull', 45, 0, 11, 0, 0, [g('1 Dose (250 ml)', 250), G100], 'red bull energy drink', 'drink,preworkout'],
  ['apple-juice-spritzer', 'Apfelsaft gespritzt', 'Apple juice spritzer', 23, 0, 5.5, 0, 0, [g('0,5 l', 500), G100], 'apfelsaft gespritzt gespritzter spritzer', 'drink'],
  ['apple-juice', 'Apfelsaft', 'Apple juice', 46, 0.1, 11, 0, 0, [g('1 Glas (250 ml)', 250), G100], 'apfelsaft saft juice', 'drink'],
  ['orange-juice', 'Orangensaft', 'Orange juice', 45, 0.7, 9, 0.2, 0.2, [g('1 Glas (250 ml)', 250), G100], 'orangensaft saft juice', 'drink'],
  ['beer', 'Bier (Märzen)', 'Beer (lager)', 43, 0.5, 3.5, 0, 0, [g('1 Krügerl (0,5 l)', 500), g('1 Seidl (0,3 l)', 300), G100], 'bier beer maerzen krügerl seidl zipfer stiegl goesser', 'drink,alcohol'],
  ['radler', 'Radler', 'Shandy (Radler)', 40, 0.3, 8, 0, 0, [g('0,5 l', 500), G100], 'radler shandy', 'drink,alcohol'],
  ['wine-white', 'Weißwein', 'White wine', 82, 0.1, 2.6, 0, 0, [g('1 Achtel', 125), g('1 Viertel', 250), G100], 'wein weisswein gruener veltliner white wine', 'drink,alcohol'],
  ['spritzer', 'Weißer Spritzer', 'Wine spritzer', 41, 0, 1.3, 0, 0, [g('1 Glas (0,25 l)', 250), G100], 'spritzer gspritzter', 'drink,alcohol'],
  ['melange', 'Melange', 'Melange (coffee with milk)', 25, 1.3, 2, 1.3, 0, [g('1 Tasse (200 ml)', 200), G100], 'melange kaffee coffee cappuccino', 'drink'],
  ['latte', 'Latte Macchiato', 'Latte', 50, 2.8, 4, 2.5, 0, [g('1 Glas (300 ml)', 300), G100], 'latte macchiato kaffee coffee', 'drink'],
  ['sports-drink', 'Isotonisches Getränk', 'Sports drink', 25, 0, 6, 0, 0, [g('0,5 l', 500), G100], 'iso isotonisch sportgetraenk sports drink powerade', 'drink,preworkout'],

  // ── Dishes (Austrian / Tyrolean / takeaway) ───────────────────────────
  ['wiener-schnitzel', 'Wiener Schnitzel (paniert)', 'Wiener schnitzel (breaded)', 250, 18, 13, 14, 0.5, [g('1 Schnitzel', 180), G100], 'schnitzel wiener paniert breaded cutlet', 'dish'],
  ['chicken-schnitzel', 'Hühnerschnitzel (paniert)', 'Chicken schnitzel (breaded)', 230, 19, 12, 12, 0.5, [g('1 Schnitzel', 180), G100], 'schnitzel huhn hendl paniert chicken', 'dish'],
  ['groestl', 'Tiroler Gröstl', 'Tyrolean Gröstl', 160, 7, 12, 9, 1.5, [g('1 Portion', 400), G100], 'groestl groestel tiroler', 'dish'],
  ['kaspressknoedel', 'Kaspressknödel', 'Cheese dumpling (Kaspressknödel)', 250, 10, 25, 12, 1.5, [g('1 Knödel', 90), g('2 Knödel', 180), G100], 'kaspressknoedel knoedel kaspress', 'dish'],
  ['speckknoedel', 'Speckknödel', 'Speck dumpling', 230, 8, 26, 10, 1.5, [g('1 Knödel', 90), g('2 Knödel', 180), G100], 'speckknoedel knoedel tiroler', 'dish'],
  ['semmelknoedel', 'Semmelknödel', 'Bread dumpling', 200, 6, 33, 5, 1.5, [g('1 Knödel', 100), G100], 'semmelknoedel knoedel', 'dish'],
  ['schlutzkrapfen', 'Schlutzkrapfen', 'Schlutzkrapfen (spinach ravioli)', 220, 8, 25, 9, 2, [g('1 Portion', 250), G100], 'schlutzkrapfen schlutzer ravioli', 'dish'],
  ['kaesespaetzle', 'Käsespätzle', 'Cheese spätzle', 210, 9, 20, 10, 1, [g('1 Portion', 350), G100], 'kaesespaetzle spaetzle kasspatzln kaesknoepfle', 'dish'],
  ['kaiserschmarrn', 'Kaiserschmarrn', 'Kaiserschmarrn', 220, 7, 28, 9, 1, [g('1 Portion', 300), G100], 'kaiserschmarrn schmarrn', 'dish,sweet'],
  ['gulasch', 'Rindsgulasch', 'Beef goulash', 130, 13, 5, 6.5, 1, [g('1 Portion', 300), G100], 'gulasch goulash rindsgulasch', 'dish'],
  ['gulaschsuppe', 'Gulaschsuppe', 'Goulash soup', 80, 5, 6, 4, 1, [g('1 Teller', 400), G100], 'gulaschsuppe suppe soup', 'dish'],
  ['schweinsbraten', 'Schweinsbraten', 'Roast pork', 220, 20, 1, 15, 0, [g('1 Portion', 200), G100], 'schweinsbraten schweinebraten roast pork', 'dish'],
  ['tafelspitz', 'Tafelspitz', 'Boiled beef (Tafelspitz)', 180, 22, 0, 10, 0, [g('1 Portion', 200), G100], 'tafelspitz rind', 'dish'],
  ['leberkaessemmel', 'Leberkässemmel', 'Leberkäse roll', 300, 11, 19, 20, 1, [g('1 Semmel', 160), G100], 'leberkaesesemmel leberkaessemmel leberkas semmel', 'dish'],
  ['frittatensuppe', 'Frittatensuppe', 'Pancake strip soup', 50, 2.5, 5, 2, 0.2, [g('1 Teller', 350), G100], 'frittatensuppe fritattensuppe suppe', 'dish'],
  ['erdaepfelsalat', 'Erdäpfelsalat', 'Potato salad', 115, 1.8, 14, 6, 1.5, [g('1 Portion', 200), G100], 'erdaepfelsalat kartoffelsalat potato salad', 'dish'],
  ['apfelstrudel', 'Apfelstrudel', 'Apple strudel', 230, 3, 32, 10, 2, [g('1 Stück', 130), G100], 'apfelstrudel strudel', 'dish,sweet'],
  ['topfenstrudel', 'Topfenstrudel', 'Quark strudel', 230, 7, 27, 10, 0.5, [g('1 Stück', 130), G100], 'topfenstrudel strudel', 'dish,sweet'],
  ['germknoedel', 'Germknödel', 'Germknödel (sweet dumpling)', 250, 6, 38, 8, 2, [g('1 Knödel', 170), G100], 'germknoedel', 'dish,sweet'],
  ['palatschinke', 'Palatschinke', 'Crêpe (Palatschinke)', 200, 7, 26, 7, 0.8, [g('1 Stück', 80), G100], 'palatschinke palatschinken crepe pfannkuchen', 'dish,sweet'],
  ['pizza-margherita', 'Pizza Margherita', 'Pizza margherita', 240, 10, 30, 9, 2, [g('1 Pizza', 350), g('1 Stück', 90), G100], 'pizza margherita', 'dish'],
  ['doener', 'Döner Kebab', 'Döner kebab', 200, 11, 19, 9, 1.5, [g('1 Döner', 330), G100], 'doener doner kebab kebap', 'dish'],
  ['duerum', 'Dürüm', 'Dürüm wrap', 200, 11, 20, 8.5, 1.5, [g('1 Dürüm', 400), G100], 'duerum durum wrap kebab', 'dish'],
  ['burger', 'Burger', 'Burger', 250, 12, 21, 13, 1.5, [g('1 Burger', 220), G100], 'burger hamburger cheeseburger big mac', 'dish'],
  ['fries', 'Pommes', 'Fries', 312, 3.4, 41, 15, 3.8, [g('1 Portion', 150), G100], 'pommes fries frites', 'dish'],
  ['sushi', 'Sushi (gemischt)', 'Sushi (mixed)', 150, 6, 28, 1.5, 1, [g('8 Stück', 200), G100], 'sushi maki nigiri', 'dish'],
  ['asia-noodles', 'Gebratene Nudeln mit Huhn', 'Fried noodles with chicken', 140, 7, 18, 4.5, 1.5, [g('1 Box', 400), G100], 'asia nudeln gebraten noodles wok chicken', 'dish'],
  ['chicken-curry-rice', 'Hühnercurry mit Reis', 'Chicken curry with rice', 130, 8, 15, 4, 1, [g('1 Portion', 450), G100], 'curry huhn chicken reis rice', 'dish'],
  ['bosna', 'Bosna', 'Bosna (sausage hot dog)', 250, 10, 20, 14, 1, [g('1 Bosna', 180), G100], 'bosna bosner', 'dish'],
  ['spaghetti-bolognese', 'Spaghetti Bolognese', 'Spaghetti bolognese', 150, 7.5, 18, 5, 1.5, [g('1 Portion', 400), G100], 'bolognese spaghetti', 'dish'],
];

function per100(r: Row): Per100g {
  return { calories: r[3], protein: r[4], carbs: r[5], fat: r[6], fiber: r[7] };
}

export const BUILTIN_FOODS: (FoodItem & { nameEn: string; keywords: string })[] = ROWS.map(r => ({
  id: `at:${r[0]}`,
  kind: 'food',
  name: r[1],
  nameEn: r[2],
  per100g: per100(r),
  servings: r[8],
  source: 'builtin',
  keywords: r[9] ?? '',
  tags: r[10] ? r[10].split(',') : [],
  createdAt: '2026-09-27T00:00:00.000Z',
}));

const BY_ID = new Map(BUILTIN_FOODS.map(f => [f.id, f]));
export function builtinFood(id: string) { return BY_ID.get(id); }
