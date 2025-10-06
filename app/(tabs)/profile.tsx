// app/(tabs)/profile.tsx
import { format } from "date-fns";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "src/context/AuthContext";
import { levelCapFor, MAX_PRESTIGE } from "src/lib/xp";
import { updateProfile } from "src/services/profileService";
import { doPrestige } from "src/services/xpService";
import AddWeightModal from "../components/AddWeightModal";
import WeightChart, { WeightPoint } from "../components/WeightChart";
import XpBar from "../components/XpBar";

import {
  addWeight,
  deleteWeight, // expects (userId: string, id: string)
  listWeights,
  updateWeight,
  WeightDoc,
} from "src/services/weightService";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { cancelDailyReminder, ensureAndroidChannel, scheduleDailyReminder } from "src/util/notification";
// ---- date helpers to avoid UTC shifting ----
function datePart(s?: string) {
  if (!s) return "";
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s;
}
function friendlyDateAny(input: string) {
  const ymd = datePart(input);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd || input;
  const [y, m, d] = ymd.split("-").map(Number);
  const dd = new Date(y, m - 1, d, 12, 0, 0); // local noon
  const thisYear = new Date().getFullYear();
  const base = format(dd, "EEE, MMM d");
  return dd.getFullYear() === thisYear ? base : `${base}, ${dd.getFullYear()}`;
}
// --------------------------------------------

export default function Profile() {
  const { user, logout, profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  // weight tracking state
  const [weights, setWeights] = useState<WeightDoc[]>([]);
  const [wLoading, setWLoading] = useState(true);
  const [wModal, setWModal] = useState(false);
  const [selectedWeight, setSelectedWeight] = useState<WeightDoc | null>(null);

  // notifications toggle
  const [reminderOn, setReminderOn] = useState<boolean>(false);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayWeight = weights.find((w) => datePart(w.date) === todayStr);

  const chartData: WeightPoint[] = [...weights]
    .sort((a, b) => datePart(a.date).localeCompare(datePart(b.date)))
    .slice(-30)
    .map((w) => ({ date: datePart(w.date), weight: Number(w.weight) }));

  // notifications: load toggle + ensure channel
  useEffect(() => {
    (async () => {
      await ensureAndroidChannel();
      const v = await AsyncStorage.getItem("reminder:on");
      setReminderOn(v === "1");
    })();
  }, []);

  async function enableReminder() {
    await scheduleDailyReminder(20, 0); // 8:00 PM
    await AsyncStorage.setItem("reminder:on", "1");
    setReminderOn(true);
  }

  async function disableReminder() {
    await cancelDailyReminder();
    await AsyncStorage.setItem("reminder:on", "0");
    setReminderOn(false);
  }

  // fetch weight history
  useEffect(() => {
    if (!user?.$id) return;
    (async () => {
      setWLoading(true);
      try {
        const res = await listWeights(user.$id, 60);
        setWeights(res.documents);
      } catch (e) {
        console.warn("Failed to fetch weights", e);
      } finally {
        setWLoading(false);
      }
    })();
  }, [user?.$id]);

  const switchPhase = async (phase: "cut" | "bulk") => {
    if (!profile) return;
    setSaving(true);
    try {
      const nextGoal = phase === "cut" ? 2000 : 0;
      await updateProfile(profile.$id, { phase, calorieGoal: nextGoal });
      await refreshProfile();
    } catch (e: unknown) {
      Alert.alert("Update failed", e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const adjustGoal = async (delta: number) => {
    if (!profile) return;
    const newGoal = Math.max(0, (profile.calorieGoal ?? 0) + delta);
    setSaving(true);
    try {
      await updateProfile(profile.$id, { calorieGoal: newGoal });
      await refreshProfile();
    } catch (e: unknown) {
      Alert.alert("Update failed", e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const onLogout = async () => {
    try {
      await logout();
    } catch (e: unknown) {
      Alert.alert("Logout Failed", e instanceof Error ? e.message : String(e));
    }
  };

  const loading = !profile;
  const eligibleForPrestige =
    !!profile &&
    profile.level >= levelCapFor(profile.prestige ?? 0) &&
    (profile.prestige ?? 0) < MAX_PRESTIGE;

  return (
    <SafeAreaView style={s.wrap}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <Text style={s.title}>Profile</Text>
        <Text style={s.meta}>Email: {user?.email}</Text>

        {/* XP */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Progress</Text>
          {loading ? (
            <View style={s.loadingRow}>
              <ActivityIndicator />
              <Text style={[s.dim, { marginLeft: 8 }]}>Loading…</Text>
            </View>
          ) : (
            <XpBar
              level={profile.level ?? 1}
              prestige={profile.prestige ?? 0}
              xp={profile.xp ?? 0}
            />
          )}
        </View>

        {/* Cut / Bulk */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Goal Phase</Text>
          <View style={s.segment}>
            <TouchableOpacity
              style={[s.segBtn, profile?.phase === "cut" ? s.segActive : null]}
              onPress={() => switchPhase("cut")}
              disabled={saving || loading}
            >
              <Text
                style={[
                  s.segText,
                  profile?.phase === "cut" ? s.segTextActive : null,
                ]}
              >
                Cut
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.segBtn, profile?.phase === "bulk" ? s.segActive : null]}
              onPress={() => switchPhase("bulk")}
              disabled={saving || loading}
            >
              <Text
                style={[
                  s.segText,
                  profile?.phase === "bulk" ? s.segTextActive : null,
                ]}
              >
                Bulk
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={s.meta}>
            {profile?.phase === "bulk"
              ? "Bulking: start at 0 and increase your target."
              : "Cutting: start at 2000 and reduce as needed."}
          </Text>
        </View>

        {/* Calorie Goal */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Daily Calorie Goal</Text>
          <Text style={s.goal}>{profile?.calorieGoal ?? 0} kcal</Text>
          <View style={s.row}>
            <TouchableOpacity
              style={[s.btnGhost, s.btn]}
              onPress={() => adjustGoal(-100)}
              disabled={saving || loading}
            >
              <Text style={s.btnGhostText}>-100</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btnGhost, s.btn]}
              onPress={() => adjustGoal(-50)}
              disabled={saving || loading}
            >
              <Text style={s.btnGhostText}>-50</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={[s.btnGhost, s.btn]}
              onPress={() => adjustGoal(+50)}
              disabled={saving || loading}
            >
              <Text style={s.btnGhostText}>+50</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btnGhost, s.btn]}
              onPress={() => adjustGoal(+100)}
              disabled={saving || loading}
            >
              <Text style={s.btnGhostText}>+100</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Prestige */}
        {!!profile && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Prestige</Text>
            <Text style={s.meta}>
              Prestige Rank: {profile.prestige ?? 0} / {MAX_PRESTIGE}
            </Text>
            {eligibleForPrestige ? (
              <TouchableOpacity
                style={[s.btn, { backgroundColor: "#FFD166", marginTop: 8 }]}
                onPress={async () => {
                  Alert.alert("Prestige?", "Reset to Lv 1 and gain a star.", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Prestige",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          await doPrestige(profile);
                          await refreshProfile();
                        } catch (e: any) {
                          Alert.alert("Prestige failed", e?.message ?? String(e));
                        }
                      },
                    },
                  ]);
                }}
              >
                <Text
                  style={{
                    color: "#0B0F1A",
                    fontWeight: "900",
                    textAlign: "center",
                  }}
                >
                  Prestige Now
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={s.dim}>Reach level cap to prestige.</Text>
            )}
          </View>
        )}

        {/* Notifications */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Daily Reminder</Text>
          <Text style={s.meta}>
            Sends a reminder once per day to log your meals.
          </Text>
          {reminderOn ? (
            <TouchableOpacity
              style={[s.btn, { backgroundColor: "#3F1D1D", marginTop: 8 }]}
              onPress={disableReminder}
            >
              <Text
                style={{
                  color: "#FCA5A5",
                  fontWeight: "900",
                  textAlign: "center",
                }}
              >
                Disable
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.btn, s.btnPrimary, { marginTop: 8 }]}
              onPress={enableReminder}
            >
              <Text
                style={{
                  color: "#0B0F1A",
                  fontWeight: "900",
                  textAlign: "center",
                }}
              >
                Enable 8:00 PM
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Weight Tracking */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Weight Tracking</Text>
          {wLoading ? (
            <ActivityIndicator />
          ) : (
            <>
              <WeightChart data={chartData} />

              {/* One button — opens modal; user can change date inside */}
              <TouchableOpacity
                style={[s.btn, s.btnGhost, { marginTop: 8 }]}
                onPress={() => {
                  setSelectedWeight(null);
                  setWModal(true);
                }}
              >
                <Text style={s.btnGhostText}>Add / Edit Weight</Text>
              </TouchableOpacity>

              <View style={{ marginTop: 12 }}>
                {weights.slice(0, 7).map((w) => (
                  <TouchableOpacity
                    key={w.$id}
                    style={s.rowItem}
                    onPress={() => {
                      setSelectedWeight(w);
                      setTimeout(() => setWModal(true), 0);
                    }}
                  >
                    <Text style={s.rowDate} numberOfLines={1} ellipsizeMode="tail">
                      {friendlyDateAny(w.date)}
                    </Text>
                    <Text style={s.rowWeight}>{w.weight} lb</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logout} onPress={onLogout}>
          <Text style={s.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add/Edit Weight Modal */}
      <AddWeightModal
        visible={wModal}
        onClose={() => setWModal(false)}
        defaultDate={selectedWeight?.date ? datePart(selectedWeight.date) : todayStr}
        unit="lb"
        mode={selectedWeight ? "edit" : "add"}
        defaultWeight={selectedWeight?.weight}
        // onSave(date, weight) — your AddWeightModal should expose (date, weight)
        onSave={async (date, n) => {
          if (!user?.$id) return;

          if (selectedWeight) {
            // editing this exact record (keep its id)
            // If date changed, move record (net XP 0 if just move; +5 on fresh add)
            if (datePart(selectedWeight.date) !== date) {
              const existing = weights.find((w) => datePart(w.date) === date);
              if (existing) {
                await updateWeight(existing.$id, n);
                await deleteWeight(user.$id, selectedWeight.$id); // -5 XP in service
              } else {
                await addWeight(user.$id, date, n); // +5 XP in service
                await deleteWeight(user.$id, selectedWeight.$id); // -5 XP
              }
            } else {
              await updateWeight(selectedWeight.$id, n); // same date edit (no XP change)
            }
          } else {
            // adding (for any chosen date)
            const existing = weights.find((w) => datePart(w.date) === date);
            if (existing) {
              await updateWeight(existing.$id, n); // no XP change
            } else {
              await addWeight(user.$id, date, n); // +5 XP
            }
          }

          const res = await listWeights(user.$id, 60);
          setWeights(res.documents);
          await refreshProfile();
        }}
        onDelete={
          selectedWeight
            ? async () => {
                if (!user?.$id) return;
                await deleteWeight(user.$id, selectedWeight.$id); // -5 XP in service
                const res = await listWeights(user.$id, 60);
                setWeights(res.documents);
                await refreshProfile();
              }
            : undefined
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#0B0F1A" },
  title: { color: "white", fontSize: 22, fontWeight: "800", margin: 16 },
  meta: { color: "#9AA4B2", marginLeft: 16, marginBottom: 8 },

  card: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#131A2A",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  cardTitle: { color: "white", fontWeight: "800", marginBottom: 8 },

  segment: {
    flexDirection: "row",
    backgroundColor: "#0F172A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
    overflow: "hidden",
    marginBottom: 8,
  },
  segBtn: { flex: 1, paddingVertical: 10, alignItems: "center" },
  segActive: { backgroundColor: "#21304a" },
  segText: { color: "#9AA4B2", fontWeight: "800" },
  segTextActive: { color: "#FFD166" },

  goal: { color: "white", fontSize: 22, fontWeight: "900", marginBottom: 8 },

  row: { flexDirection: "row", alignItems: "center", gap: 8 },

  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  btnGhost: { borderWidth: 1, borderColor: "#374151" },
  btnGhostText: { color: "#CBD5E1", fontWeight: "800" },
  btnPrimary: { backgroundColor: "#FFD166" },

  logout: {
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: "#FFD166",
    padding: 12,
    borderRadius: 10,
  },
  logoutText: { color: "#0B0F1A", fontWeight: "900", textAlign: "center" },

  loadingRow: { flexDirection: "row", alignItems: "center" },
  dim: { color: "#6B7280", fontStyle: "italic" },

  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  rowDate: {
    flex: 1,
    color: "#CBD5E1",
    fontSize: 14,
    marginRight: 8,
    flexShrink: 1,
  },
  rowWeight: {
    color: "white",
    fontWeight: "800",
    textAlign: "right",
    minWidth: 88,
  },
});
