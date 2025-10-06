import { MaterialCommunityIcons } from "@expo/vector-icons";
import { addDays, format } from "date-fns";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, ListRenderItemInfo, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "src/context/AuthContext";
import { listEntriesByDate } from "src/services/entryService";
import AddEntryModal from "../components/AddEntryModal";

// ---------- helpers ----------
const fmt = (d: Date) => format(d, "yyyy-MM-dd");
const weekday = (d: Date) => format(d, "EEE");
const monthDay = (d: Date) => format(d, "MMM d");

function buildRange(center = new Date(), span = 30): string[] {
  const out: string[] = [];
  for (let i = -span; i <= span; i++) out.push(fmt(addDays(center, i)));
  return out;
}

// ---------- types ----------
type Entry = {
  $id: string;
  userId: string;
  date: string;
  foodName: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  quantity?: number;
  unit?: string;
};

export default function Dashboard() {
  const { user, profile } = useAuth();

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selected, setSelected] = useState<Entry | null>(null);

  const today = useMemo(() => fmt(new Date()), []);
  const [picked, setPicked] = useState<string>(today);

  // stable window so the list doesn't jump
  const days = useMemo(() => buildRange(new Date(), 30), []);
  const pickedDate = useMemo(() => new Date(`${picked}T00:00:00`), [picked]);
  const selectedLabel = useMemo(() => format(pickedDate, "EEE, MMM d"), [pickedDate]);

  const fetchEntries = useCallback(async () => {
    if (!user?.$id) return; // 🔒 guard: only fetch when authenticated
    setLoading(true);
    try {
      const res = await listEntriesByDate(user.$id, picked);
      setEntries(res.documents as unknown as Entry[]);
    } catch (e: unknown) {
      console.warn("Failed to fetch entries:", e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [user?.$id, picked]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const totalCalories = entries.reduce((sum, e) => sum + (Number(e.calories) || 0), 0);

  // ---- date chip renderer with fixed size ----
  const ITEM_W = 72;
  const ITEM_H = 52;

  const renderChip = ({ item }: ListRenderItemInfo<string>) => {
    const d = new Date(`${item}T00:00:00`);
    const active = item === picked;
    const isToday = item === today;

    return (
      <TouchableOpacity
        onPress={() => setPicked(item)}
        style={[
          styles.dayChip,
          {
            width: ITEM_W,
            height: ITEM_H,
            backgroundColor: active ? "#FFD166" : "#131A2A",
          },
          active && styles.dayChipActive,
        ]}
      >
        <Text
          style={[
            styles.dayTop,
            { color: active ? "#0B0F1A" : isToday ? "#FFD166" : "#CBD5E1" },
          ]}
        >
          {weekday(d)}
        </Text>
        <Text style={[styles.dayBot, { color: active ? "#0B0F1A" : "white" }]}>{monthDay(d)}</Text>
      </TouchableOpacity>
    );
  };

  const getItemLayout = (_: any, index: number) => ({
    length: ITEM_W + 8,
    offset: (ITEM_W + 8) * index,
    index,
  });

  const streak = profile?.streak ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with streak flame */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <Text style={styles.title}>Prestige Fitness</Text>
          <Text style={styles.subtitle}>{selectedLabel}</Text>
        </View>

        {streak >= 3 && (
          <View style={{ flexDirection: "row", alignItems: "center", columnGap: 6 }}>
            <MaterialCommunityIcons name="fire" size={22} color="#FFA500" />
            <Text style={{ color: "white", fontWeight: "800" }}>{streak}d</Text>
          </View>
        )}
      </View>

      {/* Compact, stable date strip */}
      <View style={{ marginTop: 8 }}>
        <FlatList
          data={days}
          keyExtractor={(d) => d}
          renderItem={renderChip}
          getItemLayout={getItemLayout}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 4 }}
          ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
          initialScrollIndex={Math.max(0, days.indexOf(picked))}
        />
      </View>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryText}>Calories: {totalCalories}</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.$id}
          contentContainerStyle={{ paddingBottom: 96 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {user?.$id ? "No entries yet. Add your first meal!" : "Please sign in to track meals."}
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => {
                setSelected(item);
                setModalVisible(true);
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.foodName}>{item.foodName}</Text>
                <Text style={styles.meta}>
                  {item.quantity ? `${item.quantity} ${item.unit ?? ""} • ` : ""}
                  {item.protein ? `P:${item.protein}g ` : ""}
                  {item.carbs ? `C:${item.carbs}g ` : ""}
                  {item.fat ? `F:${item.fat}g` : ""}
                </Text>
              </View>
              <Text style={styles.calories}>{item.calories} kcal</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {user?.$id && (
        <>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => {
              setSelected(null);
              setModalVisible(true);
            }}
          >
            <Text style={styles.fabText}>＋</Text>
          </TouchableOpacity>

          <AddEntryModal
            visible={modalVisible}
            onClose={() => {
              setModalVisible(false);
              setSelected(null);
            }}
            userId={user.$id}
            date={picked}
            entry={selected}
            onSaved={() => {
              setModalVisible(false);
              setSelected(null);
              fetchEntries();
            }}
            onDeleted={() => {
              setModalVisible(false);
              setSelected(null);
              fetchEntries();
            }}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#0B0F1A" },
  title: { fontSize: 22, fontWeight: "800", color: "white" },
  subtitle: { fontSize: 14, color: "#9AA4B2", marginTop: 4 },

  dayChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
  },
  dayChipActive: {
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  dayTop: { fontSize: 11, fontWeight: "700" },
  dayBot: { fontSize: 12, fontWeight: "800", marginTop: 2 },

  summaryBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#131A2A",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  summaryText: { color: "white", fontSize: 16, fontWeight: "600" },
  emptyText: { color: "#94A3B8", textAlign: "center", marginTop: 24 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1F2937",
  },
  foodName: { color: "white", fontSize: 16, fontWeight: "700" },
  meta: { color: "#9AA4B2", fontSize: 12, marginTop: 2 },
  calories: { color: "#FFD166", fontSize: 14, fontWeight: "800", marginLeft: 8 },

  fab: {
    position: "absolute",
    right: 16,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFD166",
  },
  fabText: { fontSize: 28, color: "#0B0F1A", fontWeight: "900", marginTop: -2 },
});
