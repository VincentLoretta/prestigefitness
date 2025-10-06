// app/services/streakService.ts
import { ID, Models, Query } from "appwrite";
import { databases } from "src/services/appwriteClient";

const DB = process.env.EXPO_PUBLIC_APPWRITE_DB_ID!;
const ENTRIES = process.env.EXPO_PUBLIC_COLL_ENTRIES_ID!;
const PROFILES = process.env.EXPO_PUBLIC_COLL_PROFILES_ID!;
const XPEVENTS = process.env.EXPO_PUBLIC_COLL_XPEVENTS_ID!;

type ProfileDoc = Models.Document & {
  userId: string;
  level: number;
  prestige: number;
  xp: number;
  calorieGoal: number;
  phase?: "cut" | "bulk";
  streak?: number;
};

type XpEvent = Models.Document & {
  userId: string;
  eventType: "STREAK";
  amount: number;     // 5
  meta?: string;      // JSON: { date: 'YYYY-MM-DD' }
};

/** Extract 'YYYY-MM-DD' safely */
function datePart(s?: string) {
  if (!s) return "";
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s;
}

/** yyy-mm-dd -> local Date (noon) to avoid UTC drift */
function parseYMD(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

function fmtYMD(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const da = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function subDaysLocal(d: Date, n: number) {
  const t = new Date(d);
  t.setDate(t.getDate() - n);
  return t;
}

/**
 * Count consecutive days with ≥1 entry, ending at `dateStr` (inclusive).
 * Looks back up to ~500 entries for the user.
 */
export async function computeStreak(userId: string, dateStr: string): Promise<number> {
  const res = await databases.listDocuments<Models.Document>(DB, ENTRIES, [
    Query.equal("userId", userId),
    Query.limit(500),
  ]);

  // Build a set of days that have entries
  const have: Set<string> = new Set();
  for (const doc of res.documents) {
    const ymd = datePart((doc as any).date);
    if (ymd) have.add(ymd);
  }

  // Walk backward from dateStr until a gap is found
  let streak = 0;
  const end = parseYMD(dateStr);
  for (let i = 0; ; i++) {
    const day = fmtYMD(subDaysLocal(end, i));
    if (have.has(day)) streak += 1;
    else break;
  }
  return streak;
}

/**
 * Update profile.streak and (once per day) grant +5 XP when streak >= 3.
 * Call this after an entry add/delete for that specific `dateStr` (YYYY-MM-DD).
 */
export async function syncStreakAndBonus(userId: string, profileId: string, dateStr: string) {
  const todayYMD = datePart(dateStr);
  if (!todayYMD) return;

  // 1) compute streak
  const streak = await computeStreak(userId, todayYMD);

  // 2) update profile.streak (non-breaking even if the field doesn’t exist yet)
  await databases.updateDocument<ProfileDoc>(DB, PROFILES, profileId, { /* @ts-ignore */ streak });

  // 3) if streak >= 3, award +5 XP ONCE for this date
  if (streak >= 3) {
    // already awarded?
    const evs = await databases.listDocuments<XpEvent>(DB, XPEVENTS, [
      Query.equal("userId", userId),
      Query.equal("eventType", "STREAK"),
      Query.limit(200),
    ]);

    const hasForDay = evs.documents.some((d) => {
      try {
        const meta = d.meta ? JSON.parse(d.meta) : {};
        return meta.date === todayYMD;
      } catch {
        return false;
      }
    });

    if (!hasForDay) {
      // create XP event
      await databases.createDocument<XpEvent>(DB, XPEVENTS, ID.unique(), {
        userId,
        eventType: "STREAK",
        amount: 5,
        meta: JSON.stringify({ date: todayYMD }),
      });

      // bump profile.xp minimally (+5). Leveling logic can live in your xpService if needed.
      const prof = await databases.getDocument<ProfileDoc>(DB, PROFILES, profileId);
      const nextXp = Math.max(0, Number(prof.xp || 0) + 5);
      await databases.updateDocument<ProfileDoc>(DB, PROFILES, profileId, { xp: nextXp });
    }
  }
}
