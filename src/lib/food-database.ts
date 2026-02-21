/**
 * Local food database for instant macro estimation.
 * Extracted from NutritionTracker for reuse and testability.
 */

import { MealEntry } from '@/lib/types';

// ── Preset foods with metric portions ──────────────────────────────────────
export const PRESET_FOODS: Omit<MealEntry, 'id' | 'date' | 'mealType'>[] = [
  // Protein sources
  { name: 'Chicken Breast (170g)', calories: 280, protein: 53, carbs: 0, fat: 6 },
  { name: 'Salmon Fillet (170g)', calories: 350, protein: 38, carbs: 0, fat: 22 },
  { name: 'Eggs (3 large)', calories: 234, protein: 18, carbs: 2, fat: 16 },
  { name: 'Lean Beef (200g)', calories: 320, protein: 44, carbs: 0, fat: 16 },
  { name: 'Turkey Breast (170g)', calories: 250, protein: 50, carbs: 0, fat: 5 },
  { name: 'Tuna (1 can, 140g)', calories: 180, protein: 40, carbs: 0, fat: 2 },
  { name: 'Shrimp (150g)', calories: 140, protein: 30, carbs: 1, fat: 2 },
  { name: 'Protein Shake (300ml)', calories: 160, protein: 30, carbs: 5, fat: 2 },
  // Dairy
  { name: 'Greek Yogurt (200g)', calories: 130, protein: 20, carbs: 8, fat: 0 },
  { name: 'Cottage Cheese (200g)', calories: 180, protein: 24, carbs: 6, fat: 5 },
  { name: 'Whole Milk (250ml)', calories: 150, protein: 8, carbs: 12, fat: 8 },
  { name: 'Mozzarella (60g)', calories: 170, protein: 12, carbs: 1, fat: 13 },
  // Carb sources
  { name: 'Oats (80g dry)', calories: 307, protein: 11, carbs: 55, fat: 5 },
  { name: 'White Rice (150g cooked)', calories: 195, protein: 4, carbs: 42, fat: 1 },
  { name: 'Brown Rice (150g cooked)', calories: 180, protein: 4, carbs: 38, fat: 2 },
  { name: 'Whole Wheat Bread (2 slices)', calories: 200, protein: 8, carbs: 36, fat: 3 },
  { name: 'Potatoes (250g)', calories: 178, protein: 5, carbs: 38, fat: 0 },
  { name: 'Sweet Potato (200g)', calories: 172, protein: 3, carbs: 40, fat: 0 },
  { name: 'Pasta (150g cooked)', calories: 220, protein: 8, carbs: 42, fat: 1 },
  // Fruits
  { name: 'Banana (1 medium)', calories: 105, protein: 1, carbs: 27, fat: 0 },
  { name: 'Apple (1 medium)', calories: 95, protein: 0, carbs: 25, fat: 0 },
  { name: 'Blueberries (150g)', calories: 86, protein: 1, carbs: 22, fat: 0 },
  { name: 'Strawberries (200g)', calories: 64, protein: 1, carbs: 15, fat: 0 },
  { name: 'Orange (1 medium)', calories: 62, protein: 1, carbs: 15, fat: 0 },
  { name: 'Grapes (150g)', calories: 104, protein: 1, carbs: 27, fat: 0 },
  { name: 'Mango (1 cup, 165g)', calories: 99, protein: 1, carbs: 25, fat: 1 },
  // Vegetables
  { name: 'Broccoli (150g)', calories: 51, protein: 4, carbs: 10, fat: 0 },
  { name: 'Spinach (100g)', calories: 23, protein: 3, carbs: 4, fat: 0 },
  { name: 'Mixed Salad (200g)', calories: 30, protein: 2, carbs: 5, fat: 0 },
  { name: 'Zucchini (200g)', calories: 34, protein: 2, carbs: 6, fat: 1 },
  { name: 'Bell Pepper (150g)', calories: 47, protein: 1, carbs: 9, fat: 0 },
  { name: 'Carrots (150g)', calories: 61, protein: 1, carbs: 14, fat: 0 },
  { name: 'Tomatoes (150g)', calories: 27, protein: 1, carbs: 6, fat: 0 },
  { name: 'Cucumber (200g)', calories: 30, protein: 1, carbs: 7, fat: 0 },
  { name: 'Green Beans (150g)', calories: 47, protein: 3, carbs: 10, fat: 0 },
  { name: 'Cauliflower (150g)', calories: 38, protein: 3, carbs: 8, fat: 0 },
  { name: 'Mushrooms (100g)', calories: 22, protein: 3, carbs: 3, fat: 0 },
  { name: 'Peas (100g)', calories: 81, protein: 5, carbs: 14, fat: 0 },
  { name: 'Corn (100g)', calories: 86, protein: 3, carbs: 19, fat: 1 },
  { name: 'Asparagus (150g)', calories: 30, protein: 3, carbs: 6, fat: 0 },
  { name: 'Cabbage (150g)', calories: 38, protein: 2, carbs: 9, fat: 0 },
  { name: 'Leek (100g)', calories: 61, protein: 1, carbs: 14, fat: 0 },
  { name: 'Onion (1 medium)', calories: 44, protein: 1, carbs: 10, fat: 0 },
  // Austrian / Central European
  { name: 'Wiener Schnitzel (200g)', calories: 520, protein: 35, carbs: 30, fat: 28 },
  { name: 'Kaiserschmarrn (250g)', calories: 450, protein: 14, carbs: 55, fat: 18 },
  { name: 'Semmelknödel (2 pieces)', calories: 320, protein: 10, carbs: 52, fat: 8 },
  { name: 'Gulasch (300g)', calories: 380, protein: 38, carbs: 14, fat: 18 },
  { name: 'Käsespätzle (300g)', calories: 520, protein: 22, carbs: 48, fat: 26 },
  { name: 'Topfenknödel (3 pieces)', calories: 360, protein: 14, carbs: 48, fat: 12 },
  { name: 'Leberkäse Semmel', calories: 480, protein: 18, carbs: 34, fat: 30 },
  { name: 'Schweinsbraten (250g)', calories: 520, protein: 42, carbs: 12, fat: 34 },
  { name: 'Tafelspitz (200g)', calories: 340, protein: 40, carbs: 0, fat: 20 },
  { name: 'Germknödel (1 piece)', calories: 420, protein: 10, carbs: 62, fat: 14 },
  { name: 'Apfelstrudel (1 slice)', calories: 310, protein: 4, carbs: 44, fat: 14 },
  { name: 'Brettljause (mixed plate)', calories: 650, protein: 32, carbs: 30, fat: 44 },
  // Fats & snacks
  { name: 'Peanut Butter (30g)', calories: 190, protein: 7, carbs: 7, fat: 16 },
  { name: 'Avocado (half)', calories: 160, protein: 2, carbs: 9, fat: 15 },
  { name: 'Almonds (30g)', calories: 175, protein: 6, carbs: 6, fat: 15 },
  { name: 'Olive Oil (1 tbsp)', calories: 120, protein: 0, carbs: 0, fat: 14 },
  // Quick meals
  { name: 'Chicken & Rice Bowl', calories: 480, protein: 42, carbs: 52, fat: 10 },
  { name: 'Tuna Sandwich', calories: 380, protein: 28, carbs: 36, fat: 12 },
  { name: 'Protein Bar', calories: 220, protein: 20, carbs: 24, fat: 8 },
  // Drinks
  { name: 'Latte (250ml)', calories: 80, protein: 4, carbs: 6, fat: 4 },
  { name: 'Orange Juice (250ml)', calories: 112, protein: 2, carbs: 26, fat: 0 },
];

// ── Local food database for instant AI-free estimation ──────────────────────
// Keywords map to macros per typical serving. Used by fuzzy matcher below.
export type FoodEntry = { keywords: string[]; name: string; calories: number; protein: number; carbs: number; fat: number };
export const FOOD_DB: FoodEntry[] = [
  // Proteins
  { keywords: ['chicken', 'chicken breast'], name: 'Chicken Breast (170g)', calories: 280, protein: 53, carbs: 0, fat: 6 },
  { keywords: ['salmon'], name: 'Salmon Fillet (170g)', calories: 350, protein: 38, carbs: 0, fat: 22 },
  { keywords: ['egg', 'eggs'], name: 'Eggs (3 large)', calories: 234, protein: 18, carbs: 2, fat: 16 },
  { keywords: ['beef', 'steak'], name: 'Lean Beef (200g)', calories: 320, protein: 44, carbs: 0, fat: 16 },
  { keywords: ['turkey'], name: 'Turkey Breast (170g)', calories: 250, protein: 50, carbs: 0, fat: 5 },
  { keywords: ['tuna'], name: 'Tuna (1 can, 140g)', calories: 180, protein: 40, carbs: 0, fat: 2 },
  { keywords: ['shrimp', 'prawn', 'prawns'], name: 'Shrimp (150g)', calories: 140, protein: 30, carbs: 1, fat: 2 },
  { keywords: ['protein shake', 'whey', 'whey isolate', 'protein isolate', 'shake'], name: 'Whey Protein Shake (1 scoop)', calories: 120, protein: 27, carbs: 2, fat: 1 },
  { keywords: ['protein bar'], name: 'Protein Bar', calories: 220, protein: 20, carbs: 24, fat: 8 },
  { keywords: ['lamb'], name: 'Lamb (200g)', calories: 360, protein: 40, carbs: 0, fat: 22 },
  { keywords: ['pork', 'pork chop'], name: 'Pork (200g)', calories: 330, protein: 42, carbs: 0, fat: 18 },
  { keywords: ['chicken thigh', 'thigh'], name: 'Chicken Thigh (170g)', calories: 320, protein: 40, carbs: 0, fat: 18 },
  { keywords: ['ground beef', 'mince', 'ground meat'], name: 'Ground Beef (200g)', calories: 400, protein: 40, carbs: 0, fat: 26 },
  { keywords: ['cod', 'white fish', 'tilapia'], name: 'White Fish (170g)', calories: 180, protein: 38, carbs: 0, fat: 2 },
  // Dairy
  { keywords: ['greek yogurt', 'yogurt', 'yoghurt'], name: 'Greek Yogurt (200g)', calories: 130, protein: 20, carbs: 8, fat: 0 },
  { keywords: ['cottage cheese'], name: 'Cottage Cheese (200g)', calories: 180, protein: 24, carbs: 6, fat: 5 },
  { keywords: ['milk', 'whole milk'], name: 'Whole Milk (250ml)', calories: 150, protein: 8, carbs: 12, fat: 8 },
  { keywords: ['cheese', 'mozzarella', 'cheddar'], name: 'Cheese (60g)', calories: 170, protein: 12, carbs: 1, fat: 13 },
  // Carbs
  { keywords: ['rice', 'white rice'], name: 'White Rice (150g cooked)', calories: 195, protein: 4, carbs: 42, fat: 1 },
  { keywords: ['brown rice'], name: 'Brown Rice (150g cooked)', calories: 180, protein: 4, carbs: 38, fat: 2 },
  { keywords: ['oats', 'oatmeal', 'porridge'], name: 'Oats (80g dry)', calories: 307, protein: 11, carbs: 55, fat: 5 },
  { keywords: ['bread', 'toast'], name: 'Bread (2 slices)', calories: 200, protein: 8, carbs: 36, fat: 3 },
  { keywords: ['pasta', 'noodles', 'spaghetti', 'penne'], name: 'Pasta (150g cooked)', calories: 220, protein: 8, carbs: 42, fat: 1 },
  { keywords: ['potato', 'potatoes'], name: 'Potatoes (250g)', calories: 178, protein: 5, carbs: 38, fat: 0 },
  { keywords: ['sweet potato'], name: 'Sweet Potato (200g)', calories: 172, protein: 3, carbs: 40, fat: 0 },
  { keywords: ['tortilla', 'wrap'], name: 'Tortilla Wrap', calories: 180, protein: 5, carbs: 30, fat: 4 },
  { keywords: ['bagel'], name: 'Bagel', calories: 270, protein: 10, carbs: 52, fat: 2 },
  { keywords: ['cereal', 'granola'], name: 'Cereal/Granola (60g)', calories: 250, protein: 6, carbs: 44, fat: 6 },
  // Fruits
  { keywords: ['banana'], name: 'Banana (1 medium)', calories: 105, protein: 1, carbs: 27, fat: 0 },
  { keywords: ['apple'], name: 'Apple (1 medium)', calories: 95, protein: 0, carbs: 25, fat: 0 },
  { keywords: ['berries', 'blueberries', 'strawberries'], name: 'Berries (150g)', calories: 75, protein: 1, carbs: 18, fat: 0 },
  { keywords: ['orange'], name: 'Orange (1 medium)', calories: 62, protein: 1, carbs: 15, fat: 0 },
  { keywords: ['mango'], name: 'Mango (1 cup)', calories: 99, protein: 1, carbs: 25, fat: 1 },
  // Vegetables
  { keywords: ['broccoli'], name: 'Broccoli (150g)', calories: 51, protein: 4, carbs: 10, fat: 0 },
  { keywords: ['spinach'], name: 'Spinach (100g)', calories: 23, protein: 3, carbs: 4, fat: 0 },
  { keywords: ['salad'], name: 'Mixed Salad (200g)', calories: 30, protein: 2, carbs: 5, fat: 0 },
  { keywords: ['zucchini', 'courgette'], name: 'Zucchini (200g)', calories: 34, protein: 2, carbs: 6, fat: 1 },
  { keywords: ['bell pepper', 'pepper', 'paprika'], name: 'Bell Pepper (150g)', calories: 47, protein: 1, carbs: 9, fat: 0 },
  { keywords: ['carrot', 'carrots', 'karotten'], name: 'Carrots (150g)', calories: 61, protein: 1, carbs: 14, fat: 0 },
  { keywords: ['tomato', 'tomatoes', 'paradeiser'], name: 'Tomatoes (150g)', calories: 27, protein: 1, carbs: 6, fat: 0 },
  { keywords: ['cucumber', 'gurke'], name: 'Cucumber (200g)', calories: 30, protein: 1, carbs: 7, fat: 0 },
  { keywords: ['green beans', 'beans', 'fisolen'], name: 'Green Beans (150g)', calories: 47, protein: 3, carbs: 10, fat: 0 },
  { keywords: ['cauliflower', 'karfiol'], name: 'Cauliflower (150g)', calories: 38, protein: 3, carbs: 8, fat: 0 },
  { keywords: ['mushroom', 'mushrooms', 'schwammerl', 'champignons'], name: 'Mushrooms (100g)', calories: 22, protein: 3, carbs: 3, fat: 0 },
  { keywords: ['peas', 'erbsen'], name: 'Peas (100g)', calories: 81, protein: 5, carbs: 14, fat: 0 },
  { keywords: ['corn', 'mais'], name: 'Corn (100g)', calories: 86, protein: 3, carbs: 19, fat: 1 },
  { keywords: ['asparagus', 'spargel'], name: 'Asparagus (150g)', calories: 30, protein: 3, carbs: 6, fat: 0 },
  { keywords: ['cabbage', 'kraut', 'kohl'], name: 'Cabbage (150g)', calories: 38, protein: 2, carbs: 9, fat: 0 },
  { keywords: ['leek', 'lauch'], name: 'Leek (100g)', calories: 61, protein: 1, carbs: 14, fat: 0 },
  { keywords: ['onion', 'zwiebel'], name: 'Onion (1 medium)', calories: 44, protein: 1, carbs: 10, fat: 0 },
  { keywords: ['eggplant', 'aubergine', 'melanzani'], name: 'Eggplant (200g)', calories: 50, protein: 2, carbs: 12, fat: 0 },
  { keywords: ['radish', 'radieschen', 'rettich'], name: 'Radish (100g)', calories: 16, protein: 1, carbs: 3, fat: 0 },
  { keywords: ['beet', 'beetroot', 'rote rüben'], name: 'Beetroot (150g)', calories: 65, protein: 2, carbs: 14, fat: 0 },
  { keywords: ['kohlrabi'], name: 'Kohlrabi (150g)', calories: 41, protein: 3, carbs: 9, fat: 0 },
  { keywords: ['fennel', 'fenchel'], name: 'Fennel (150g)', calories: 47, protein: 2, carbs: 11, fat: 0 },
  { keywords: ['kale', 'grünkohl'], name: 'Kale (100g)', calories: 49, protein: 4, carbs: 9, fat: 1 },
  // Fats
  { keywords: ['peanut butter', 'pb'], name: 'Peanut Butter (30g)', calories: 190, protein: 7, carbs: 7, fat: 16 },
  { keywords: ['avocado', 'avo'], name: 'Avocado (half)', calories: 160, protein: 2, carbs: 9, fat: 15 },
  { keywords: ['almonds', 'nuts'], name: 'Almonds/Nuts (30g)', calories: 175, protein: 6, carbs: 6, fat: 15 },
  { keywords: ['olive oil', 'oil'], name: 'Olive Oil (1 tbsp)', calories: 120, protein: 0, carbs: 0, fat: 14 },
  { keywords: ['butter'], name: 'Butter (1 tbsp)', calories: 102, protein: 0, carbs: 0, fat: 12 },
  // Drinks
  { keywords: ['latte', 'coffee'], name: 'Latte (250ml)', calories: 80, protein: 4, carbs: 6, fat: 4 },
  { keywords: ['orange juice', 'oj', 'juice'], name: 'Orange Juice (250ml)', calories: 112, protein: 2, carbs: 26, fat: 0 },
  { keywords: ['smoothie'], name: 'Fruit Smoothie (350ml)', calories: 220, protein: 5, carbs: 45, fat: 3 },
  { keywords: ['soda', 'coke', 'pepsi', 'sprite'], name: 'Soda (330ml)', calories: 140, protein: 0, carbs: 36, fat: 0 },
  // Quick meals
  { keywords: ['burger', 'hamburger'], name: 'Burger with Bun', calories: 540, protein: 34, carbs: 40, fat: 26 },
  { keywords: ['pizza'], name: 'Pizza (2 slices)', calories: 560, protein: 22, carbs: 64, fat: 24 },
  { keywords: ['burrito'], name: 'Burrito', calories: 550, protein: 28, carbs: 60, fat: 22 },
  { keywords: ['sandwich', 'sub'], name: 'Sandwich', calories: 400, protein: 24, carbs: 40, fat: 16 },
  { keywords: ['kebab', 'shawarma', 'gyro'], name: 'Kebab/Shawarma', calories: 500, protein: 35, carbs: 40, fat: 22 },
  { keywords: ['sushi', 'sushi roll'], name: 'Sushi (8 pieces)', calories: 350, protein: 18, carbs: 50, fat: 8 },
  { keywords: ['ramen'], name: 'Ramen Bowl', calories: 500, protein: 25, carbs: 60, fat: 18 },
  { keywords: ['fried rice'], name: 'Fried Rice (300g)', calories: 400, protein: 12, carbs: 55, fat: 14 },
  { keywords: ['stir fry', 'stir-fry'], name: 'Stir Fry with Protein', calories: 380, protein: 30, carbs: 30, fat: 14 },
  { keywords: ['acai', 'acai bowl'], name: 'Acai Bowl', calories: 380, protein: 6, carbs: 60, fat: 14 },
  { keywords: ['pancake', 'pancakes'], name: 'Pancakes (3)', calories: 350, protein: 10, carbs: 50, fat: 12 },
  { keywords: ['waffle', 'waffles'], name: 'Waffles (2)', calories: 380, protein: 8, carbs: 52, fat: 16 },
  // European / street food
  { keywords: ['currywurst', 'curry wurst'], name: 'Currywurst', calories: 450, protein: 20, carbs: 30, fat: 28 },
  { keywords: ['schnitzel', 'wiener schnitzel', 'wienerschnitzel'], name: 'Wiener Schnitzel (200g)', calories: 520, protein: 35, carbs: 30, fat: 28 },
  { keywords: ['cordon bleu', 'cordon blue'], name: 'Cordon Bleu', calories: 620, protein: 38, carbs: 28, fat: 36 },
  { keywords: ['chicken curry', 'curry chicken'], name: 'Chicken Curry with Rice', calories: 550, protein: 35, carbs: 55, fat: 18 },
  { keywords: ['curry'], name: 'Curry (1 serving)', calories: 400, protein: 20, carbs: 40, fat: 18 },
  { keywords: ['döner', 'doner'], name: 'Döner Kebab', calories: 550, protein: 35, carbs: 45, fat: 24 },
  { keywords: ['pommes', 'fries', 'french fries'], name: 'Fries (200g)', calories: 380, protein: 5, carbs: 48, fat: 20 },
  // Austrian / Central European
  { keywords: ['kaiserschmarrn', 'schmarrn'], name: 'Kaiserschmarrn (250g)', calories: 450, protein: 14, carbs: 55, fat: 18 },
  { keywords: ['semmelknödel', 'knödel', 'semmelknoedel', 'knoedel'], name: 'Semmelknödel (2 pieces)', calories: 320, protein: 10, carbs: 52, fat: 8 },
  { keywords: ['gulasch', 'goulash', 'gulaschsuppe'], name: 'Gulasch (300g)', calories: 380, protein: 38, carbs: 14, fat: 18 },
  { keywords: ['käsespätzle', 'spätzle', 'kaesespaetzle', 'spaetzle'], name: 'Käsespätzle (300g)', calories: 520, protein: 22, carbs: 48, fat: 26 },
  { keywords: ['topfenknödel', 'topfenknoedel'], name: 'Topfenknödel (3 pieces)', calories: 360, protein: 14, carbs: 48, fat: 12 },
  { keywords: ['leberkäse', 'leberkaese', 'leberkäsesemmel'], name: 'Leberkäse Semmel', calories: 480, protein: 18, carbs: 34, fat: 30 },
  { keywords: ['schweinsbraten', 'schweinebraten'], name: 'Schweinsbraten (250g)', calories: 520, protein: 42, carbs: 12, fat: 34 },
  { keywords: ['tafelspitz'], name: 'Tafelspitz (200g)', calories: 340, protein: 40, carbs: 0, fat: 20 },
  { keywords: ['germknödel', 'germknoedel'], name: 'Germknödel (1 piece)', calories: 420, protein: 10, carbs: 62, fat: 14 },
  { keywords: ['apfelstrudel', 'strudel'], name: 'Apfelstrudel (1 slice)', calories: 310, protein: 4, carbs: 44, fat: 14 },
  { keywords: ['brettljause', 'jause'], name: 'Brettljause (mixed plate)', calories: 650, protein: 32, carbs: 30, fat: 44 },
  { keywords: ['fritattensuppe', 'frittatensuppe'], name: 'Fritattensuppe (300ml)', calories: 120, protein: 6, carbs: 12, fat: 5 },
  { keywords: ['sauerkraut'], name: 'Sauerkraut (150g)', calories: 27, protein: 1, carbs: 6, fat: 0 },
  { keywords: ['erdäpfelsalat', 'kartoffelsalat', 'erdaepfelsalat', 'potato salad'], name: 'Erdäpfelsalat (200g)', calories: 230, protein: 3, carbs: 28, fat: 12 },
  { keywords: ['palatschinken', 'pfannkuchen'], name: 'Palatschinken (2 pieces)', calories: 340, protein: 10, carbs: 40, fat: 14 },
  { keywords: ['topfenstrudel'], name: 'Topfenstrudel (1 slice)', calories: 280, protein: 8, carbs: 34, fat: 12 },
  { keywords: ['bosna'], name: 'Bosna (1 piece)', calories: 420, protein: 16, carbs: 32, fat: 26 },
  { keywords: ['wurst', 'bratwurst', 'würstel', 'frankfurter'], name: 'Bratwurst/Würstel', calories: 300, protein: 14, carbs: 2, fat: 26 },
  { keywords: ['semmel', 'brötchen'], name: 'Semmel (1 roll)', calories: 150, protein: 5, carbs: 28, fat: 1 },
  { keywords: ['topfen', 'quark'], name: 'Topfen/Quark (200g)', calories: 140, protein: 24, carbs: 8, fat: 0 },
  // Snacks / sweets
  { keywords: ['haribo', 'goldbären', 'gummy bear', 'gummy bears', 'gummi'], name: 'Haribo Goldbären (100g)', calories: 343, protein: 7, carbs: 77, fat: 0 },
  { keywords: ['chocolate', 'chocolate bar'], name: 'Chocolate Bar (50g)', calories: 270, protein: 4, carbs: 30, fat: 15 },
  // High-protein snacks
  { keywords: ['beef jerky', 'jerky', 'biltong'], name: 'Beef Jerky (50g)', calories: 130, protein: 23, carbs: 3, fat: 3 },
  { keywords: ['skyr'], name: 'Skyr (200g)', calories: 130, protein: 22, carbs: 8, fat: 0 },
  { keywords: ['edamame'], name: 'Edamame (150g)', calories: 170, protein: 17, carbs: 8, fat: 8 },
  { keywords: ['string cheese', 'cheese stick'], name: 'String Cheese (2 sticks)', calories: 160, protein: 14, carbs: 2, fat: 10 },
  { keywords: ['turkey slices', 'deli turkey', 'putenbrust'], name: 'Turkey Slices (100g)', calories: 100, protein: 22, carbs: 1, fat: 1 },
  { keywords: ['hard boiled egg', 'boiled egg', 'boiled eggs'], name: 'Hard Boiled Eggs (2)', calories: 156, protein: 12, carbs: 1, fat: 11 },
  { keywords: ['tuna pouch', 'tuna packet'], name: 'Tuna Pouch (75g)', calories: 80, protein: 18, carbs: 0, fat: 1 },
  { keywords: ['protein pudding', 'high protein pudding'], name: 'Protein Pudding', calories: 150, protein: 20, carbs: 12, fat: 3 },
  { keywords: ['rice cake', 'rice cakes'], name: 'Rice Cakes (3)', calories: 105, protein: 2, carbs: 23, fat: 1 },
  { keywords: ['rice cake pb', 'rice cake peanut butter'], name: 'Rice Cakes + PB (2)', calories: 200, protein: 7, carbs: 20, fat: 11 },
  { keywords: ['trail mix'], name: 'Trail Mix (40g)', calories: 200, protein: 5, carbs: 18, fat: 13 },
  { keywords: ['hummus', 'hummus and veggies'], name: 'Hummus + Veggies', calories: 180, protein: 6, carbs: 18, fat: 10 },
  { keywords: ['protein cookie'], name: 'Protein Cookie', calories: 200, protein: 16, carbs: 20, fat: 8 },
  { keywords: ['overnight oats'], name: 'Overnight Oats + Protein', calories: 380, protein: 30, carbs: 45, fat: 8 },
  // Quick high-protein combos
  { keywords: ['chicken rice', 'chicken and rice'], name: 'Chicken + Rice', calories: 475, protein: 57, carbs: 42, fat: 7 },
  { keywords: ['salmon rice', 'salmon and rice'], name: 'Salmon + Rice', calories: 545, protein: 42, carbs: 42, fat: 23 },
  { keywords: ['tuna rice', 'tuna and rice'], name: 'Tuna + Rice Bowl', calories: 375, protein: 44, carbs: 42, fat: 3 },
  { keywords: ['eggs toast', 'eggs on toast'], name: 'Eggs on Toast (3 eggs)', calories: 434, protein: 26, carbs: 38, fat: 19 },
  { keywords: ['protein oats', 'proats'], name: 'Protein Oats (oats + whey)', calories: 427, protein: 38, carbs: 57, fat: 6 },
  { keywords: ['yogurt bowl', 'yogurt berries'], name: 'Greek Yogurt + Berries + Granola', calories: 320, protein: 24, carbs: 40, fat: 6 },
  { keywords: ['chicken wrap', 'grilled chicken wrap'], name: 'Grilled Chicken Wrap', calories: 380, protein: 35, carbs: 32, fat: 12 },
  { keywords: ['tuna sandwich', 'tuna sub'], name: 'Tuna Sandwich', calories: 400, protein: 35, carbs: 36, fat: 12 },
  { keywords: ['protein smoothie'], name: 'Protein Smoothie (banana + whey + milk)', calories: 350, protein: 35, carbs: 40, fat: 6 },
  { keywords: ['chipotle bowl', 'burrito bowl'], name: 'Burrito Bowl', calories: 550, protein: 40, carbs: 50, fat: 18 },
];

/**
 * Instant local macro estimation — fuzzy-matches user text against FOOD_DB.
 * Handles combos like "chicken and rice" by matching multiple items and summing.
 * Returns null if no reasonable match found.
 */
export function estimateLocally(input: string): { name: string; calories: number; protein: number; carbs: number; fat: number } | null {
  const text = input.toLowerCase().trim();
  if (!text) return null;

  // Split on connectors: "and", "&", "+", ",", "with", "w/"
  const parts = text.split(/\s+(?:and|&|\+|with|w\/)\s+|,\s*/);

  const matched: FoodEntry[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Try exact keyword match first (longest keyword wins for specificity)
    let best: FoodEntry | null = null;
    let bestLen = 0;
    for (const food of FOOD_DB) {
      for (const kw of food.keywords) {
        if (trimmed.includes(kw) && kw.length > bestLen) {
          best = food;
          bestLen = kw.length;
        }
      }
    }
    if (best) {
      matched.push(best);
    }
  }

  // If we split into parts but matched nothing, try the whole string
  if (matched.length === 0) {
    let best: FoodEntry | null = null;
    let bestLen = 0;
    for (const food of FOOD_DB) {
      for (const kw of food.keywords) {
        if (text.includes(kw) && kw.length > bestLen) {
          best = food;
          bestLen = kw.length;
        }
      }
    }
    if (best) matched.push(best);
  }

  if (matched.length === 0) return null;

  // Sum macros from all matched items
  const raw = matched.reduce(
    (acc, f) => ({
      calories: acc.calories + f.calories,
      protein: acc.protein + f.protein,
      carbs: acc.carbs + f.carbs,
      fat: acc.fat + f.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const name = matched.map(f => f.name).join(' + ');
  return { name, calories: Math.round(raw.calories), protein: +raw.protein.toFixed(1), carbs: +raw.carbs.toFixed(1), fat: +raw.fat.toFixed(1) };
}
