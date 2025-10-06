// app/recipes/new.tsx
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import FoodSearchModal from "@/components/FoodSearchModal";
import { useAuth } from "src/context/AuthContext";
import {
  addRecipe,
  computeTotals, // sums ALL items (totals for whole recipe)
  perServingTotals,
  type RecipeItem,
} from "src/services/recipeService";

export default function NewRecipeScreen() {
  const router = useRouter();
  const { user, authReady, ensureFresh } = useAuth(); // 👈 new: use authReady + ensureFresh

  // recipe fields
  const [name, setName] = useState("");
  const [servings, setServings] = useState<string>("1");

  // ingredient editor (manual add)
  const [ingName, setIngName] = useState("");
  const [ingCals, setIngCals] = useState("");
  const [ingP, setIngP] = useState("");
  const [ingC, setIngC] = useState("");
  const [ingF, setIngF] = useState("");
  const [ingQty, setIngQty] = useState("");
  const [ingUnit, setIngUnit] = useState("");

  // ingredient list
  const [items, setItems] = useState<RecipeItem[]>([]);

  // search modal
  const [searchOpen, setSearchOpen] = useState(false);

  // saving flag
  const [saving, setSaving] = useState(false);

  const totals = useMemo(() => computeTotals(items), [items]);

  const perServing = useMemo(() => {
    const s = Math.max(1, Number(servings) || 1);
    return perServingTotals(totals, s);
  }, [totals, servings]);

  function addManualIngredient() {
    if (!ingName.trim()) {
      Alert.alert("Missing name", "Enter an ingredient name.");
      return;
    }
    const next: RecipeItem = {
      name: ingName.trim(),
      calories: ingCals ? Number(ingCals) : undefined,
      protein: ingP ? Number(ingP) : undefined,
      carbs: ingC ? Number(ingC) : undefined,
      fat: ingF ? Number(ingF) : undefined,
      quantity: ingQty ? Number(ingQty) : undefined,
      unit: ingUnit || undefined,
    };
    setItems((prev) => [...prev, next]);
    // reset inputs
    setIngName("");
    setIngCals("");
    setIngP("");
    setIngC("");
    setIngF("");
    setIngQty("");
    setIngUnit("");
  }

  async function onSave() {
    if (!authReady) {
      Alert.alert("Please wait", "Still finishing sign-in. Try again in a moment.");
      return;
    }
    if (!user?.$id) {
      Alert.alert("Not signed in", "Please log in again.");
      return;
    }
    if (!name.trim()) {
      Alert.alert("Missing name", "Give your recipe a name.");
      return;
    }
    const s = Number(servings);
    if (!Number.isFinite(s) || s <= 0) {
      Alert.alert("Invalid servings", "Enter a positive number for servings.");
      return;
    }
    if (items.length === 0) {
      Alert.alert("No ingredients", "Add at least one ingredient.");
      return;
    }

    setSaving(true);
    try {
      // 👇 ensure a fresh JWT before the write (prevents random expiry failures)
      await ensureFresh();

      // The service computes per-serving macros and serializes items to array<string>.
      await addRecipe(user.$id, {
        name: name.trim(),
        servings: s,
        items,
      });

      Alert.alert("Saved!", "Your recipe was created.");
      router.back();
    } catch (e: any) {
      console.warn("Save failed:", e);
      Alert.alert("Save failed", e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={s.wrap}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          <Text style={s.title}>Create Recipe</Text>

          {/* Recipe name & servings */}
          <Text style={s.label}>Recipe name</Text>
          <TextInput
            style={s.input}
            placeholder="e.g., Chicken Rice Bowl"
            placeholderTextColor="#6B7280"
            value={name}
            onChangeText={setName}
          />

          <Text style={s.label}>Servings</Text>
          <TextInput
            style={s.input}
            placeholder="e.g., 4"
            placeholderTextColor="#6B7280"
            keyboardType="numeric"
            value={servings}
            onChangeText={setServings}
          />

          {/* Quick add from API */}
          <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={[s.btn, s.btnPrimary, { flex: 1 }]} onPress={() => setSearchOpen(true)}>
              <Text style={s.btnPrimaryText}>Add from Search</Text>
            </TouchableOpacity>
          </View>

          {/* Manual ingredient row */}
          <Text style={[s.sectionTitle, { marginTop: 16 }]}>Add Ingredient (Manual)</Text>
          <View style={s.card}>
            <Text style={s.smallLabel}>Name</Text>
            <TextInput
              style={s.input}
              placeholder="e.g., Cooked chicken breast"
              placeholderTextColor="#6B7280"
              value={ingName}
              onChangeText={setIngName}
            />

            <View style={s.row}>
              <View style={s.col}>
                <Text style={s.smallLabel}>Calories</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g., 220"
                  placeholderTextColor="#6B7280"
                  keyboardType="numeric"
                  value={ingCals}
                  onChangeText={setIngCals}
                />
              </View>
              <View style={s.col}>
                <Text style={s.smallLabel}>Protein (g)</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g., 35"
                  placeholderTextColor="#6B7280"
                  keyboardType="numeric"
                  value={ingP}
                  onChangeText={setIngP}
                />
              </View>
            </View>

            <View style={s.row}>
              <View style={s.col}>
                <Text style={s.smallLabel}>Carbs (g)</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g., 0"
                  placeholderTextColor="#6B7280"
                  keyboardType="numeric"
                  value={ingC}
                  onChangeText={setIngC}
                />
              </View>
              <View style={s.col}>
                <Text style={s.smallLabel}>Fat (g)</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g., 5"
                  placeholderTextColor="#6B7280"
                  keyboardType="numeric"
                  value={ingF}
                  onChangeText={setIngF}
                />
              </View>
            </View>

            <View style={s.row}>
              <View style={s.col}>
                <Text style={s.smallLabel}>Quantity</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g., 1"
                  placeholderTextColor="#6B7280"
                  keyboardType="numeric"
                  value={ingQty}
                  onChangeText={setIngQty}
                />
              </View>
              <View style={s.col}>
                <Text style={s.smallLabel}>Unit</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g., cup / g / serving"
                  placeholderTextColor="#6B7280"
                  value={ingUnit}
                  onChangeText={setIngUnit}
                />
              </View>
            </View>

            <TouchableOpacity style={[s.btn, s.btnGhost, { marginTop: 8 }]} onPress={addManualIngredient}>
              <Text style={s.btnGhostText}>Add Ingredient</Text>
            </TouchableOpacity>
          </View>

          {/* Ingredients list */}
          <Text style={[s.sectionTitle, { marginTop: 16 }]}>Ingredients</Text>
          <View style={s.card}>
            {items.length === 0 ? (
              <Text style={s.dim}>No ingredients yet.</Text>
            ) : (
              items.map((it, idx) => (
                <View key={`${it.name}-${idx}`} style={s.ingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.ingName}>{it.name}</Text>
                    <Text style={s.meta}>
                      {(it.quantity ?? 1)} {it.unit ?? "unit"}
                      {it.calories != null ? ` • ${Math.round(it.calories)} kcal` : ""}
                      {it.protein != null ? ` • P:${it.protein}g` : ""}
                      {it.carbs != null ? ` • C:${it.carbs}g` : ""}
                      {it.fat != null ? ` • F:${it.fat}g` : ""}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[s.btn, { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: "#2A1A1A", borderColor: "#7F1D1D", borderWidth: 1 }]}
                    onPress={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Text style={{ color: "#FCA5A5", fontWeight: "800" }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* Totals */}
          <Text style={[s.sectionTitle, { marginTop: 16 }]}>Totals</Text>
          <View style={s.card}>
            <Text style={s.sum}>
              Whole recipe: <Text style={s.highlight}>{Math.round(totals.calories || 0)} kcal</Text>
            </Text>
            <Text style={s.meta}>
              {totals.protein != null ? `P:${round1(totals.protein)}g  ` : ""}
              {totals.carbs != null ? `C:${round1(totals.carbs)}g  ` : ""}
              {totals.fat != null ? `F:${round1(totals.fat)}g` : ""}
            </Text>

            <View style={{ height: 8 }} />

            <Text style={s.sum}>
              Per serving: <Text style={s.highlight}>{Math.round(perServing.calories || 0)} kcal</Text>
            </Text>
            <Text style={s.meta}>
              {perServing.protein != null ? `P:${round1(perServing.protein)}g  ` : ""}
              {perServing.carbs != null ? `C:${round1(perServing.carbs)}g  ` : ""}
              {perServing.fat != null ? `F:${round1(perServing.fat)}g` : ""}
            </Text>
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[s.btn, s.btnPrimary, { marginTop: 16, opacity: authReady && !saving ? 1 : 0.6 }]}
            onPress={onSave}
            disabled={saving || !authReady} // 👈 disabled until auth is ready
          >
            {saving ? <ActivityIndicator /> : <Text style={s.btnPrimaryText}>Save Recipe</Text>}
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity
            style={[s.btn, s.btnGhost, { marginTop: 8 }]}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text style={s.btnGhostText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Food search (adds as ingredient) */}
      <FoodSearchModal
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onPick={(hit) => {
          setSearchOpen(false);
          const next: RecipeItem = {
            name: hit.name,
            calories: hit.calories ?? undefined,
            protein: hit.protein ?? undefined,
            carbs: hit.carbs ?? undefined,
            fat: hit.fat ?? undefined,
            quantity: hit.servingQty ?? 1,
            unit: hit.servingUnit ?? "serving",
          };
          setItems((prev) => [...prev, next]);
        }}
      />
    </SafeAreaView>
  );
}

function round1(n?: number) {
  if (n == null) return 0;
  return Math.round(n * 10) / 10;
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#0B0F1A" },
  title: { color: "white", fontSize: 22, fontWeight: "800", marginBottom: 12 },
  label: { color: "#9AA4B2", marginTop: 8, marginBottom: 4 },
  smallLabel: { color: "#9AA4B2", marginBottom: 4, fontSize: 12 },
  sectionTitle: { color: "white", fontWeight: "800", fontSize: 16 },
  input: {
    backgroundColor: "#111827",
    color: "white",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  col: { flex: 1 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  btnPrimary: { backgroundColor: "#FFD166" },
  btnPrimaryText: { color: "#0B0F1A", fontWeight: "900", textAlign: "center" },
  btnGhost: { borderWidth: 1, borderColor: "#374151" },
  btnGhostText: { color: "#CBD5E1", fontWeight: "800", textAlign: "center" },
  card: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#131A2A",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  ingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1F2937",
    gap: 8,
  },
  ingName: { color: "white", fontWeight: "800" },
  meta: { color: "#9AA4B2", marginTop: 2 },
  sum: { color: "white", fontWeight: "800" },
  highlight: { color: "#FFD166", fontWeight: "900" },
  dim: { color: "#6B7280", fontStyle: "italic" },
});
