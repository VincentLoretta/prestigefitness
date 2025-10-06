// app/services/nutritionService.ts
const NIX_BASE = "https://trackapi.nutritionix.com/v2";

export type FoodHit = {
  name: string;
  brand?: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  servingQty?: number;
  servingUnit?: string;
  nixItemId?: string;
};

function getHeaders() {
  const appId = process.env.EXPO_PUBLIC_NUTRITIONIX_APP_ID;
  const apiKey = process.env.EXPO_PUBLIC_NUTRITIONIX_API_KEY;
  if (!appId || !apiKey) throw new Error("Nutritionix keys missing");
  return {
    "x-app-id": appId,
    "x-app-key": apiKey,
    "Content-Type": "application/json",
  } as const;
}

export async function searchFoods(query: string): Promise<FoodHit[]> {
  if (!query.trim()) return [];
  const headers = getHeaders();
  const url =
    `${NIX_BASE}/search/instant?` +
    `query=${encodeURIComponent(query)}&detailed=true&branded=true&common=true`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Nutritionix instant failed (${res.status}): ${text}`);
  }
  const data = await res.json();

  const map = (item: any): FoodHit => ({
    name: item.food_name || item.brand_name_item_name || item.food_name,
    brand: item.brand_name || undefined,
    calories: Math.round(item.nf_calories ?? 0),
    protein: item.nf_protein != null ? Number(item.nf_protein) : undefined,
    carbs: item.nf_total_carbohydrate != null ? Number(item.nf_total_carbohydrate) : undefined,
    fat: item.nf_total_fat != null ? Number(item.nf_total_fat) : undefined,
    servingQty: item.serving_qty ?? undefined,
    servingUnit: item.serving_unit ?? undefined,
    nixItemId: item.nix_item_id ?? undefined,
  });

  const commons = (data.common || []).map(map);
  const branded = (data.branded || []).map(map);
  return [...commons, ...branded].slice(0, 25);
}

export async function enrichFood(name: string): Promise<Partial<FoodHit>>{
  const headers = getHeaders();
  const res = await fetch(`${NIX_BASE}/natural/nutrients`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: name }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Nutritionix nutrients failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  const first = (data.foods || [])[0];
  if (!first) return {};
  return {
    calories: first.nf_calories != null ? Math.round(first.nf_calories) : undefined,
    protein: first.nf_protein != null ? Number(first.nf_protein) : undefined,
    carbs: first.nf_total_carbohydrate != null ? Number(first.nf_total_carbohydrate) : undefined,
    fat: first.nf_total_fat != null ? Number(first.nf_total_fat) : undefined,
    servingQty: first.serving_qty ?? undefined,
    servingUnit: first.serving_unit ?? undefined,
  };
}
