// components/AddEntryModal.tsx
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "src/context/AuthContext";
import { syncStreakAndBonus } from "src/services/streakServices";
import { addEntry, deleteEntry, updateEntry } from "../../src/services/entryService";
import { addFavorite } from "../../src/services/favoriteService";
import { enrichFood } from "../../src/services/nutritionService";
import { grantLogEntry, revokeLogEntry, syncDailyGoalBonus } from "../../src/services/xpService";

import FoodSearchModal from "./FoodSearchModal";
import QuickAddModal from "./QuickAddModal";
import RecipePickerModal from "./RecipePickerModal";

type BaseEntry = {
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

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
  userId: string;
  date: string; // 'YYYY-MM-DD'
  entry?: BaseEntry | null;
};

export default function AddEntryModal({
  visible,
  onClose,
  onSaved,
  onDeleted,
  userId,
  date,
  entry,
}: Props) {
  const isEdit = !!entry;

  // form fields (displayed totals)
  const [foodName, setFoodName] = useState("");
  const [calories, setCalories] = useState<string>("");
  const [protein, setProtein] = useState<string>("");
  const [carbs, setCarbs] = useState<string>("");
  const [fat, setFat] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [unit, setUnit] = useState<string>("");

  // modals
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [recipeOpen, setRecipeOpen] = useState(false);

  // loading guards
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // auto-scale baseline per serving (when chosen from search/favorite/recipe)
  const baseRef = useRef({
    baseQty: 1,
    cal: 0,
    p: 0,
    c: 0,
    f: 0,
  });
  const [autoScale, setAutoScale] = useState(false);

  // refresh profile after XP change
  const { refreshProfile, profile } = useAuth();

  useEffect(() => {
    if (!visible) return;
    if (isEdit && entry) {
      setFoodName(entry.foodName ?? "");
      setCalories(entry.calories != null ? String(entry.calories) : "");
      setProtein(entry.protein != null ? String(entry.protein) : "");
      setCarbs(entry.carbs != null ? String(entry.carbs) : "");
      setFat(entry.fat != null ? String(entry.fat) : "");
      setQuantity(entry.quantity != null ? String(entry.quantity) : "");
      setUnit(entry.unit ?? "");
      setAutoScale(false);
      baseRef.current = { baseQty: 1, cal: 0, p: 0, c: 0, f: 0 };
    } else {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isEdit, entry?.$id]);

  const reset = () => {
    setFoodName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setQuantity("");
    setUnit("");
    setAutoScale(false);
    baseRef.current = { baseQty: 1, cal: 0, p: 0, c: 0, f: 0 };
  };

  // scale totals when quantity changes (only if autoScale is on)
  const onChangeQuantity = (val: string) => {
    setQuantity(val);
    if (!autoScale) return;

    const q = Number(val);
    const bq = Number(baseRef.current.baseQty) || 1;
    const factor = !Number.isFinite(q) || q <= 0 ? 0 : q / bq;

    const round1 = (n: number) => Math.round(n); // cals int
    const roundG = (n: number) => Math.round(n * 10) / 10; // macros 1 decimal

    setCalories(String(round1(baseRef.current.cal * factor)));
    setProtein(baseRef.current.p ? String(roundG(baseRef.current.p * factor)) : "");
    setCarbs(baseRef.current.c ? String(roundG(baseRef.current.c * factor)) : "");
    setFat(baseRef.current.f ? String(roundG(baseRef.current.f * factor)) : "");
  };

  const handleSave = async () => {
    if (saving) return; // guard
    if (!foodName.trim()) return Alert.alert("Missing name", "Enter a food name");
    const cal = Number(calories);
    if (!Number.isFinite(cal) || cal < 0) {
      return Alert.alert("Invalid calories", "Enter a valid number");
    }

    setSaving(true);
    try {
      if (isEdit && entry) {
        await updateEntry(entry.$id, {
          foodName: foodName.trim(),
          calories: cal,
          protein: protein ? Number(protein) : undefined,
          carbs: carbs ? Number(carbs) : undefined,
          fat: fat ? Number(fat) : undefined,
          quantity: quantity ? Number(quantity) : undefined,
          unit: unit || undefined,
        });
        await syncDailyGoalBonus(userId, date);
      } else {
        const doc = await addEntry({
          userId,
          date,
          foodName: foodName.trim(),
          calories: cal,
          protein: protein ? Number(protein) : undefined,
          carbs: carbs ? Number(carbs) : undefined,
          fat: fat ? Number(fat) : undefined,
          quantity: quantity ? Number(quantity) : undefined,
          unit: unit || undefined,
        });
        await grantLogEntry(userId, (doc as any).$id); // +5 XP
        await syncDailyGoalBonus(userId, date);
      }

      // ✅ streak update (needs profileId)
      if (profile?.$id) {
        await syncStreakAndBonus(userId, profile.$id, date);
      }

      await refreshProfile?.(); // reflect XP/level immediately
      reset();
      onSaved();
    } catch (e: any) {
      console.warn("Failed to save entry:", e);
      Alert.alert("Save failed", e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting || !isEdit || !entry) return;
    Alert.alert("Delete entry", "Are you sure you want to delete this entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteEntry(entry.$id);
            await revokeLogEntry(userId, entry.$id); // −5 XP
            await syncDailyGoalBonus(userId, date);

            // ✅ recompute streak for that day after deletion
            if (profile?.$id) {
              await syncStreakAndBonus(userId, profile.$id, date);
            }

            await refreshProfile?.();
            reset();
            onDeleted?.();
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            Alert.alert("Delete failed", msg);
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <>
      <Modal visible={!!visible} transparent animationType="slide" onRequestClose={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: "padding", android: undefined })}
          style={styles.wrap}
        >
          <View style={styles.sheet}>
            <Text style={styles.title}>{isEdit ? "Edit Food" : "Add Food"}</Text>

            {/* Search / Quick / Recipes */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, { flex: 1 }]}
                onPress={() => setSearchOpen(true)}
                disabled={saving || deleting}
              >
                <Text style={styles.btnPrimaryText}>Search foods</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, { flex: 1 }]}
                onPress={() => setQuickOpen(true)}
                disabled={saving || deleting}
              >
                <Text style={styles.btnPrimaryText}>Quick Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, { flex: 1 }]}
                onPress={() => setRecipeOpen(true)}
                disabled={saving || deleting}
              >
                <Text style={styles.btnPrimaryText}>Recipes</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Food name</Text>
            <TextInput
              placeholder="e.g., Chicken bowl"
              placeholderTextColor="#6B7280"
              value={foodName}
              onChangeText={setFoodName}
              style={styles.input}
            />

            <Text style={styles.label}>Calories</Text>
            <TextInput
              placeholder="e.g., 520"
              placeholderTextColor="#6B7280"
              keyboardType="numeric"
              value={calories}
              onChangeText={setCalories}
              style={styles.input}
            />

            <View style={styles.row3}>
              <View style={styles.col}>
                <Text style={styles.label}>Protein (g)</Text>
                <TextInput
                  placeholder="35"
                  placeholderTextColor="#6B7280"
                  keyboardType="numeric"
                  value={protein}
                  onChangeText={setProtein}
                  style={styles.input}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Carbs (g)</Text>
                <TextInput
                  placeholder="60"
                  placeholderTextColor="#6B7280"
                  keyboardType="numeric"
                  value={carbs}
                  onChangeText={setCarbs}
                  style={styles.input}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Fat (g)</Text>
                <TextInput
                  placeholder="18"
                  placeholderTextColor="#6B7280"
                  keyboardType="numeric"
                  value={fat}
                  onChangeText={setFat}
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.row2}>
              <View style={styles.col}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput
                  placeholder="1"
                  placeholderTextColor="#6B7280"
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={onChangeQuantity}
                  style={styles.input}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Unit</Text>
                <TextInput
                  placeholder="serving / g / cup"
                  placeholderTextColor="#6B7280"
                  value={unit}
                  onChangeText={setUnit}
                  style={styles.input}
                />
              </View>
            </View>

            {/* Optional: Save as Favorite (only when adding) */}
            {!isEdit && profile?.$id && (
              <TouchableOpacity
                style={[styles.btn, styles.btnGhost, { marginTop: 10 }]}
                onPress={async () => {
                  if (!foodName.trim() || !calories) {
                    Alert.alert("Missing info", "Enter at least a name and calories.");
                    return;
                  }
                  try {
                    await addFavorite(profile.userId, {
                      name: foodName.trim(),
                      calories: Number(calories),
                      protein: protein ? Number(protein) : undefined,
                      carbs: carbs ? Number(carbs) : undefined,
                      fat: fat ? Number(fat) : undefined,
                      quantity: quantity ? Number(quantity) : undefined,
                      unit: unit || undefined,
                    });
                    Alert.alert("Saved", "Added to favorites!");
                  } catch (e: any) {
                    Alert.alert("Failed", e?.message ?? String(e));
                  }
                }}
              >
                <Text style={styles.btnGhostText}>Save as Favorite</Text>
              </TouchableOpacity>
            )}

            <View style={styles.actions}>
              {isEdit && (
                <TouchableOpacity
                  style={[styles.btn, styles.btnDanger]}
                  onPress={handleDelete}
                  disabled={saving || deleting}
                >
                  {deleting ? <ActivityIndicator /> : <Text style={styles.btnDangerText}>Delete</Text>}
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={[styles.btn, styles.btnGhost]}
                onPress={onClose}
                disabled={saving || deleting}
              >
                <Text style={styles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={handleSave}
                disabled={saving || deleting}
              >
                {saving ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={styles.btnPrimaryText}>{isEdit ? "Save Changes" : "Save"}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Nutrition search modal */}
      <FoodSearchModal
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onPick={async (hit) => {
          setSearchOpen(false);
          setFoodName(hit.name);

          // set baseline per serving
          baseRef.current = {
            baseQty: hit.servingQty ?? 1,
            cal: hit.calories ?? 0,
            p: hit.protein ?? 0,
            c: hit.carbs ?? 0,
            f: hit.fat ?? 0,
          };
          setAutoScale(true);

          // initial quantity = API serving
          const initialQty = hit.servingQty ?? 1;
          setQuantity(String(initialQty));
          setUnit(hit.servingUnit ?? "");

          // derive totals
          const baseQty = hit.servingQty ?? 1;
          const factor = initialQty / baseQty;
          const round1 = (n: number) => Math.round(n);
          const roundG = (n: number) => Math.round(n * 10) / 10;

          setCalories(String(round1((hit.calories ?? 0) * factor)));
          setProtein(hit.protein != null ? String(roundG(hit.protein * factor)) : "");
          setCarbs(hit.carbs != null ? String(roundG(hit.carbs * factor)) : "");
          setFat(hit.fat != null ? String(roundG(hit.fat * factor)) : "");

          // optional enrichment if some macros missing
          const missing =
            hit.calories == null || hit.protein == null || hit.carbs == null || hit.fat == null;
          if (missing) {
            try {
              const more = await enrichFood(hit.name);
              baseRef.current = {
                baseQty: more.servingQty ?? baseRef.current.baseQty,
                cal: more.calories ?? baseRef.current.cal,
                p: more.protein ?? baseRef.current.p,
                c: more.carbs ?? baseRef.current.c,
                f: more.fat ?? baseRef.current.f,
              };
              onChangeQuantity(String(initialQty));
              if (more.servingUnit && !unit) setUnit(more.servingUnit);
            } catch (e) {
              console.warn("enrichFood failed:", e);
            }
          }
        }}
      />

      {/* Quick Add (favorites) */}
      <QuickAddModal
        visible={quickOpen}
        onClose={() => setQuickOpen(false)}
        onPick={(fav) => {
          setQuickOpen(false);
          setFoodName(fav.name);
          setCalories(String(fav.calories ?? 0));
          setProtein(fav.protein != null ? String(fav.protein) : "");
          setCarbs(fav.carbs != null ? String(fav.carbs) : "");
          setFat(fav.fat != null ? String(fav.fat) : "");
          setQuantity(fav.quantity != null ? String(fav.quantity) : "");
          setUnit(fav.unit ?? "");

          // baseline so quantity rescales
          baseRef.current = {
            baseQty: (fav.quantity ?? 1) || 1,
            cal: fav.calories ?? 0,
            p: fav.protein ?? 0,
            c: fav.carbs ?? 0,
            f: fav.fat ?? 0,
          };
          setAutoScale(true);
        }}
      />

      {/* Recipes (per serving) */}
      <RecipePickerModal
        visible={recipeOpen}
        onClose={() => setRecipeOpen(false)}
        onPick={(r) => {
          setRecipeOpen(false);
          setFoodName(r.name);
          setCalories(String(r.calories ?? 0));
          setProtein(r.protein != null ? String(r.protein) : "");
          setCarbs(r.carbs != null ? String(r.carbs) : "");
          setFat(r.fat != null ? String(r.fat) : "");
          setQuantity("1");
          setUnit("serving");

          baseRef.current = {
            baseQty: 1,
            cal: r.calories ?? 0,
            p: r.protein ?? 0,
            c: r.carbs ?? 0,
            f: r.fat ?? 0,
          };
          setAutoScale(true);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#0B0F1A",
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  title: { color: "white", fontSize: 18, fontWeight: "800", marginBottom: 12 },
  label: { color: "#9AA4B2", fontSize: 12, marginTop: 8, marginBottom: 4 },
  input: {
    backgroundColor: "#111827",
    color: "white",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  row3: { flexDirection: "row", gap: 8, marginTop: 8 },
  row2: { flexDirection: "row", gap: 8, marginTop: 8 },
  col: { flex: 1 },
  actions: { flexDirection: "row", alignItems: "center", marginTop: 16 },

  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  btnGhost: { borderWidth: 1, borderColor: "#374151" },
  btnGhostText: { color: "#CBD5E1", fontWeight: "700" },

  btnPrimary: { backgroundColor: "#FFD166" },
  btnPrimaryText: { color: "#0B0F1A", fontWeight: "900" },

  btnDanger: { backgroundColor: "#3F1D1D", borderWidth: 1, borderColor: "#7F1D1D", marginRight: 8 },
  btnDangerText: { color: "#FCA5A5", fontWeight: "800" },
});
