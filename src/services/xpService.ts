// app/services/xpService.ts
import { ID, Models, Permission, Query, Role } from "appwrite";
import { applyXpDelta, levelCapFor, MAX_PRESTIGE } from "src/lib/xp";
import { databases } from "./appwriteClient";

const DB = process.env.EXPO_PUBLIC_APPWRITE_DB_ID!;
const XPEVENTS = process.env.EXPO_PUBLIC_COLL_XPEVENTS_ID!;
const PROFILES = process.env.EXPO_PUBLIC_COLL_PROFILES_ID!;
const ENTRIES = process.env.EXPO_PUBLIC_COLL_ENTRIES_ID!;

type ProfileDoc = Models.Document & {
  userId: string;
  level: number;
  xp: number;
  prestige?: number;
  calorieGoal?: number;
};

type XpEvent = Models.Document & {
  userId: string;
  eventType: "LOG_ENTRY" | "HIT_GOAL" | "REVERSAL" | "WEIGHT_LOG" | "PRESTIGE";
  amount: number;
  meta?: string; // JSON string
};

function metaStr(obj: any) {
  const s = JSON.stringify(obj ?? {});
  return s.length > 4096 ? JSON.stringify({ note: "truncated" }) : s;
}

async function getProfileByUserId(userId: string): Promise<ProfileDoc | null> {
  const res = await databases.listDocuments<ProfileDoc>(DB, PROFILES, [
    Query.equal("userId", userId),
    Query.limit(1),
  ]);
  return res.documents[0] ?? null;
}

async function updateProfileXp(profileId: string, delta: number) {
  const prof = await databases.getDocument<ProfileDoc>(DB, PROFILES, profileId);
  const { level, xp } = applyXpDelta(prof.level ?? 1, prof.xp ?? 0, delta);

  // Clamp at cap
  const cap = levelCapFor(prof.prestige ?? 0);
  const finalLevel = Math.min(level, cap);

  return databases.updateDocument<ProfileDoc>(DB, PROFILES, profileId, {
    level: finalLevel,
    xp: xp,
  });
}

async function createXpEvent(
  userId: string,
  eventType: XpEvent["eventType"],
  amount: number,
  meta: any = {}
) {
  const perms = [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];
  return databases.createDocument<XpEvent>(
    DB,
    XPEVENTS,
    ID.unique(),
    { userId, eventType, amount, meta: metaStr(meta) },
    perms
  );
}

// Food entry XP
export async function grantLogEntry(userId: string, entryId: string) {
  const prof = await getProfileByUserId(userId);
  if (!prof) return;
  await createXpEvent(userId, "LOG_ENTRY", +5, { entryId });
  await updateProfileXp(prof.$id, +5);
}

export async function revokeLogEntry(userId: string, entryId: string) {
  const prof = await getProfileByUserId(userId);
  if (!prof) return;
  await createXpEvent(userId, "REVERSAL", -5, { entryId, reason: "entry_deleted" });
  await updateProfileXp(prof.$id, -5);
}

// Daily goal bonus (±50)
export async function syncDailyGoalBonus(userId: string, date: string) {
  const prof = await getProfileByUserId(userId);
  if (!prof) return;

  const goal = prof.calorieGoal ?? 2000;
  const entries = await databases.listDocuments(DB, ENTRIES, [
    Query.equal("userId", userId),
    Query.equal("date", date),
    Query.limit(500),
  ]);
  const total = entries.documents.reduce((sum: number, d: any) => sum + Number(d.calories || 0), 0);
  const within = goal > 0 ? Math.abs(total - goal) <= goal * 0.05 : false;

  const existing = await databases.listDocuments<XpEvent>(DB, XPEVENTS, [
    Query.equal("userId", userId),
    Query.equal("eventType", "HIT_GOAL"),
    Query.limit(100),
  ]);
  const hasBonus = existing.documents.some((d) => {
    try {
      const m = d.meta ? JSON.parse(d.meta) : {};
      return m.date === date;
    } catch {
      return false;
    }
  });

  if (within && !hasBonus) {
    await createXpEvent(userId, "HIT_GOAL", +50, { date });
    await updateProfileXp(prof.$id, +50);
  } else if (!within && hasBonus) {
    await createXpEvent(userId, "REVERSAL", -50, { date, reason: "goal_no_longer_met" });
    await updateProfileXp(prof.$id, -50);
  }
}

// Weight XP (+5 on add, -5 on delete)
export async function grantWeightLog(userId: string, weightId: string) {
  const prof = await getProfileByUserId(userId);
  if (!prof) return;
  await createXpEvent(userId, "WEIGHT_LOG", +5, { weightId });
  await updateProfileXp(prof.$id, +5);
}

export async function revokeWeightLog(userId: string, weightId: string) {
  const prof = await getProfileByUserId(userId);
  if (!prof) return;
  await createXpEvent(userId, "REVERSAL", -5, { weightId, reason: "weight_deleted" });
  await updateProfileXp(prof.$id, -5);
}

// Prestige (reset to Lv1, XP 0, +1 prestige)
export async function doPrestige(profile: ProfileDoc) {
  const current = profile.prestige ?? 0;
  if (current >= MAX_PRESTIGE) {
    throw new Error("Already at max prestige.");
  }
  const next = current + 1;

  await databases.updateDocument<ProfileDoc>(DB, PROFILES, profile.$id, {
    prestige: next,
    level: 1,
    xp: 0,
  });

  await createXpEvent(profile.userId, "PRESTIGE", 0, { from: current, to: next });
}
