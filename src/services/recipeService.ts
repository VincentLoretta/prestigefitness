// src/services/recipeService.ts
import { ID, Models, Query } from "appwrite";
import { databases } from "src/services/appwriteClient";

const DB = process.env.EXPO_PUBLIC_APPWRITE_DB_ID!;
const RECIPES = process.env.EXPO_PUBLIC_COLL_RECIPES_ID!;

/** The Appwrite attribute `items` is an array<string> (each string is JSON). */
export type RecipeDoc = Models.Document & {
  userId: string;
  name: string;
  servings: number;
  calories?: number; // per serving
  protein?: number;
  carbs?: number;
  fat?: number;
  items?: string[]; // array of JSON strings
};

export type RecipeItem = {
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  quantity?: number;
  unit?: string;
};

export async function listRecipes(userId: string, limit = 200) {
  return databases.listDocuments<RecipeDoc>(DB, RECIPES, [
    Query.equal("userId", userId),
    Query.orderAsc("name"),
    Query.limit(limit),
  ]);
}

/** Parse `doc.items` (array<string>) into RecipeItem[]. */
export function parseRecipeItems(doc: Pick<RecipeDoc, "items">): RecipeItem[] {
  if (!Array.isArray(doc.items)) return [];
  const out: RecipeItem[] = [];
  for (const s of doc.items) {
    try {
      const obj = JSON.parse(String(s));
      if (obj && typeof obj === "object" && "name" in obj) out.push(obj as RecipeItem);
    } catch {
      // ignore bad element
    }
  }
  return out;
}

export function computeTotals(items: RecipeItem[]): {
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
} {
  let calories = 0;
  let protein: number | undefined;
  let carbs: number | undefined;
  let fat: number | undefined;

  for (const it of items) {
    if (Number.isFinite(it.calories)) calories += it.calories as number;
    if (Number.isFinite(it.protein)) protein = (protein ?? 0) + (it.protein as number);
    if (Number.isFinite(it.carbs))   carbs   = (carbs   ?? 0) + (it.carbs   as number);
    if (Number.isFinite(it.fat))     fat     = (fat     ?? 0) + (it.fat     as number);
  }
  return { calories, protein, carbs, fat };
}

export function perServingTotals(
  totals: { calories: number; protein?: number; carbs?: number; fat?: number },
  servings: number
): { calories: number; protein?: number; carbs?: number; fat?: number } {
  const s = Math.max(1, Math.floor(servings) || 1);
  const div = (n?: number) => (Number.isFinite(n as number) ? (n as number) / s : undefined);
  return {
    calories: totals.calories / s,
    protein: div(totals.protein),
    carbs: div(totals.carbs),
    fat: div(totals.fat),
  };
}

export async function addRecipe(
  userId: string,
  data: { name: string; servings: number; items: RecipeItem[] }
): Promise<RecipeDoc> {
  const totals = computeTotals(data.items);
  const perServ = perServingTotals(totals, data.servings);

  // Serialize each item -> array<string>
  const itemsArr = data.items.map((it) => JSON.stringify(it));

  const payload = {
    userId,
    name: data.name,
    servings: data.servings,
    items: itemsArr, // matches Appwrite array<string> attribute
    calories: Math.round(perServ.calories),
    protein:
      typeof perServ.protein === "number"
        ? Math.round(perServ.protein * 10) / 10
        : undefined,
    carbs:
      typeof perServ.carbs === "number"
        ? Math.round(perServ.carbs * 10) / 10
        : undefined,
    fat:
      typeof perServ.fat === "number"
        ? Math.round(perServ.fat * 10) / 10
        : undefined,
  };

  return databases.createDocument<RecipeDoc>(DB, RECIPES, ID.unique(), payload);
}
