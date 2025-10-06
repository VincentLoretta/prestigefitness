// app/services/entryService.ts
import { ID, Models, Permission, Query, Role } from "appwrite";
import { databases } from "./appwriteClient";

const DB = process.env.EXPO_PUBLIC_APPWRITE_DB_ID!;
const ENTRIES = process.env.EXPO_PUBLIC_COLL_ENTRIES_ID!;

export type EntryDoc = Models.Document & {
  userId: string;
  date: string;       // "YYYY-MM-DD" (string attr in Appwrite!)
  foodName: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  quantity?: number;
  unit?: string;
};

export async function addEntry(data: Omit<EntryDoc, keyof Models.Document>) {
  const perms = [
    Permission.read(Role.user(data.userId)),
    Permission.update(Role.user(data.userId)),
    Permission.delete(Role.user(data.userId)),
  ];
  return databases.createDocument<EntryDoc>(DB, ENTRIES, ID.unique(), data, perms);
}

export async function updateEntry(id: string, patch: Partial<Omit<EntryDoc, keyof Models.Document | "userId" | "date">>) {
  return databases.updateDocument<EntryDoc>(DB, ENTRIES, id, patch);
}

export async function deleteEntry(id: string) {
  return databases.deleteDocument(DB, ENTRIES, id);
}

export async function listEntriesByDate(userId: string, date: string) {
  return databases.listDocuments<EntryDoc>(DB, ENTRIES, [
    Query.equal("userId", userId),
    Query.equal("date", date),
    Query.orderDesc("$createdAt"),
    Query.limit(500),
  ]);
}
