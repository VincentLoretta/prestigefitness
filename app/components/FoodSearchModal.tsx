// components/FoodSearchModal.tsx
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { FoodHit, searchFoods } from "src/services/nutritionService";

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (hit: FoodHit) => void;
};

export default function FoodSearchModal({ visible, onClose, onPick }: Props) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<FoodHit[]>([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim()) {
        setHits([]);
        return;
      }
      setLoading(true);
      try {
        const results = await searchFoods(q);
        setHits(results);
      } catch (e) {
        console.warn("Food search failed:", e);
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <Modal
      visible={!!visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={s.wrap}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <View style={s.sheet}>
          <Text style={s.title}>Search Foods</Text>

          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="e.g., chicken bowl"
            placeholderTextColor="#6B7280"
            style={s.input}
            autoFocus
            returnKeyType="search"
          />

          {loading ? (
            <ActivityIndicator style={{ marginTop: 8 }} />
          ) : (
            <FlatList
              data={hits}
              keyExtractor={(it, i) => `${it.name}-${i}`}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.row}
                  onPress={() => {
                    onPick(item);
                    onClose();
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>
                      {item.name}
                      {item.brand ? ` • ${item.brand}` : ""}
                    </Text>
                    <Text style={s.meta}>
                      {item.calories ?? 0} kcal
                      {item.protein != null ? ` • P:${item.protein}g` : ""}
                      {item.carbs != null ? ` • C:${item.carbs}g` : ""}
                      {item.fat != null ? ` • F:${item.fat}g` : ""}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                q.trim().length > 0 ? (
                  <Text style={s.meta}>No foods found.</Text>
                ) : null
              }
            />
          )}

          <TouchableOpacity style={[s.btn, s.btnGhost]} onPress={onClose}>
            <Text style={s.btnGhostText}>Close</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#0B0F1A",
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
    height: "80%",
  },
  title: { color: "white", fontSize: 18, fontWeight: "800", marginBottom: 12 },
  input: {
    backgroundColor: "#111827",
    color: "white",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1F2937",
    marginBottom: 8,
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1F2937",
  },
  name: { color: "white", fontWeight: "700" },
  meta: { color: "#9AA4B2", marginTop: 2 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginTop: 8 },
  btnGhost: { borderWidth: 1, borderColor: "#374151" },
  btnGhostText: { color: "#CBD5E1", fontWeight: "700", textAlign: "center" },
});
