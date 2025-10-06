// app/services/profileService.ts
import { ID, Models, Permission, Query, Role } from "appwrite";
import { databases } from "./appwriteClient";

const DB = process.env.EXPO_PUBLIC_APPWRITE_DB_ID!;
const PROFILES = process.env.EXPO_PUBLIC_COLL_PROFILES_ID!;

export type ProfileDoc = Models.Document & {
  userId: string;
  level: number;
  prestige: number;
  xp: number;                // XP into current level
  calorieGoal: number;
  phase?: "cut" | "bulk";
  streak?: number;
};

const DEFAULT_PROFILE: Omit<ProfileDoc, keyof Models.Document> = {
  userId: "",
  level: 1,
  prestige: 0,
  xp: 0,
  calorieGoal: 2000,
  phase: "cut",
};

export async function getProfileByUserId(userId: string): Promise<ProfileDoc | null> {
  const res = await databases.listDocuments<ProfileDoc>(DB, PROFILES, [
    Query.equal("userId", userId),
    Query.limit(1),
  ]);
  return res.documents[0] ?? null;
}

export async function createDefaultProfile(userId: string): Promise<ProfileDoc> {
  const perms = [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];
  const data: typeof DEFAULT_PROFILE = { ...DEFAULT_PROFILE, userId };
  return await databases.createDocument<ProfileDoc>(DB, PROFILES, ID.unique(), data, perms);
}

export async function ensureProfile(userId: string): Promise<ProfileDoc> {
  const existing = await getProfileByUserId(userId);
  return existing ?? (await createDefaultProfile(userId));
}

type ProfilePatch = Partial<Pick<ProfileDoc, "level" | "prestige" | "xp" | "calorieGoal" | "phase" | "streak">>;

export async function updateProfile(id: string, patch: ProfilePatch): Promise<ProfileDoc> {
  return await databases.updateDocument<ProfileDoc>(DB, PROFILES, id, patch);
}
