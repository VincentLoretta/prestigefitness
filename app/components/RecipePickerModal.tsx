// components/RecipePickerModal.tsx
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "src/context/AuthContext";
import { listRecipes, type RecipeDoc } from "src/services/recipeService";

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (r: {
    name: string;
    calories: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  }) => void;
};

export default function RecipePickerModal({ visible, onClose, onPick }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<RecipeDoc[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !user?.$id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await listRecipes(user.$id, 200);
        setRecipes(res.documents); // ✅ typed now
      } catch (e) {
        console.warn("Failed to fetch recipes:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, user?.$id]);

  return (
    <Modal visible={!!visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.wrap}>
        <View style={s.sheet}>
          <Text style={s.title}>Pick Recipe</Text>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 8 }} />
          ) : (
            <FlatList
              data={recipes}
              keyExtractor={(item) => item.$id}
              contentContainerStyle={{ paddingBottom: 8 }}
              renderItem={({ item }) => {
                const cals = Math.round(item.calories ?? 0);
                return (
                  <TouchableOpacity
                    style={s.row}
                    onPress={() => {
                      onPick({
                        name: item.name,
                        calories: cals,
                        protein: item.protein ?? undefined,
                        carbs: item.carbs ?? undefined,
                        fat: item.fat ?? undefined,
                      });
                      onClose();
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.recipeName}>{item.name}</Text>
                      <Text style={s.meta}>
                        {cals} kcal / serving
                        {item.protein != null ? ` • P:${item.protein}g` : ""}
                        {item.carbs != null ? ` • C:${item.carbs}g` : ""}
                        {item.fat != null ? ` • F:${item.fat}g` : ""}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={s.dim}>No recipes yet.</Text>}
            />
          )}

          <TouchableOpacity
            style={[s.btn, s.btnPrimary, { marginTop: 8 }]}
            onPress={() => {
              onClose();
              router.push("/recipes/new");
            }}
          >
            <Text style={s.btnPrimaryText}>Create Recipe</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.btn, s.btnGhost, { marginTop: 8 }]} onPress={onClose}>
            <Text style={s.btnGhostText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#0B0F1A",
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
    maxHeight: "80%",
  },
  title: { color: "white", fontSize: 18, fontWeight: "800", marginBottom: 12 },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1F2937",
  },
  recipeName: { color: "white", fontWeight: "800" },
  meta: { color: "#9AA4B2", marginTop: 2 },
  dim: { color: "#6B7280", fontStyle: "italic", marginTop: 8 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  btnGhost: { borderWidth: 1, borderColor: "#374151" },
  btnGhostText: { color: "#CBD5E1", fontWeight: "700", textAlign: "center" },
  btnPrimary: { backgroundColor: "#FFD166" },
  btnPrimaryText: { color: "#0B0F1A", fontWeight: "900", textAlign: "center" },
});
