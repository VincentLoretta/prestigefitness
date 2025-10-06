// app/services/favoritesService.ts
import { ID, Models, Permission, Query, Role } from "appwrite";
import { databases } from "src/services/appwriteClient";

const DB = process.env.EXPO_PUBLIC_APPWRITE_DB_ID!;
const FAVORITES = process.env.EXPO_PUBLIC_COLL_FAVORITES_ID || "favorites";

export type FavoriteDoc = Models.Document & {
  userId: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  quantity?: number;
  unit?: string;
};

export async function addFavorite(
  userId: string,
  data: Omit<FavoriteDoc, keyof Models.Document | "userId">
) {
  const perms = [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];
  return databases.createDocument<FavoriteDoc>(DB, FAVORITES, ID.unique(), { userId, ...data }, perms);
}

export async function listFavorites(userId: string, limit = 100) {
  return databases.listDocuments<FavoriteDoc>(DB, FAVORITES, [
    Query.equal("userId", userId),
    Query.orderAsc("name"),
    Query.limit(limit),
  ]);
}

export async function deleteFavorite(id: string) {
  return databases.deleteDocument(DB, FAVORITES, id);
}

export async function updateFavorite(
  id: string,
  patch: Partial<Omit<FavoriteDoc, keyof Models.Document | "userId">>
){
  return databases.updateDocument<FavoriteDoc>(DB, FAVORITES, id, patch);
}
