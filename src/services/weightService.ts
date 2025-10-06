// app/services/weightService.ts
import { ID, Models, Permission, Query, Role } from "appwrite";
import { databases } from "./appwriteClient";
import { grantWeightLog, revokeWeightLog } from "./xpService";

const DB = process.env.EXPO_PUBLIC_APPWRITE_DB_ID!;
const WEIGHTS = process.env.EXPO_PUBLIC_COLL_WEIGHTS_ID || "weights";

export type WeightDoc = Models.Document & {
  userId: string;
  date: string;   // "YYYY-MM-DD"
  weight: number;
};

export async function addWeight(userId: string, date: string, weight: number) {
  const perms = [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];
  const doc = await databases.createDocument<WeightDoc>(DB, WEIGHTS, ID.unique(), { userId, date, weight }, perms);
  await grantWeightLog(userId, doc.$id); // +5 XP
  return doc;
}

export async function updateWeight(id: string, weight: number) {
  return databases.updateDocument<WeightDoc>(DB, WEIGHTS, id, { weight });
}

export async function deleteWeight(userId: string, id: string) {
  await databases.deleteDocument(DB, WEIGHTS, id);
  await revokeWeightLog(userId, id); // -5 XP
}

export async function listWeights(userId: string, limit = 60) {
  return databases.listDocuments<WeightDoc>(DB, WEIGHTS, [
    Query.equal("userId", userId),
    Query.orderDesc("date"),
    Query.limit(limit),
  ]);
}

export async function getWeightByDate(userId: string, date: string) {
  const res = await databases.listDocuments<WeightDoc>(DB, WEIGHTS, [
    Query.equal("userId", userId),
    Query.equal("date", date),
    Query.limit(1),
  ]);
  return res.documents[0] ?? null;
}
