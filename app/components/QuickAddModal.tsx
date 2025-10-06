import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "src/context/AuthContext";
import { deleteFavorite, FavoriteDoc, listFavorites } from "src/services/favoriteService";



type Props = {
    visible: boolean;
  onClose: () => void;
  onPick: (fav: FavoriteDoc) => void;
}

export default function QuickAddModal({visible, onClose, onPick}:Props) {
    const {user} = useAuth();
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<FavoriteDoc[]>([]);

    const load = async () => {
        if(!user?.$id) return;
        setLoading(true);
        try {
            const res = await listFavorites(user.$id);
            setItems(res.documents);
        } catch (e) {
            console.warn(e);
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        if (visible) load();
    }, [visible]);

    return (
    <Modal visible={!!visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.wrap}>
        <View style={s.sheet}>
          <Text style={s.title}>Quick Add</Text>

          {loading ? (
            <ActivityIndicator />
          ) : (
            <FlatList
              data={items}
              keyExtractor={(it) => it.$id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.row}
                  onPress={() => {
                    onPick(item);
                    onClose();
                  }}
                  onLongPress={() => {
                    Alert.alert("Remove favorite?", item.name, [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: async () => {
                          await deleteFavorite(item.$id);
                          load();
                        },
                      },
                    ]);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{item.name}</Text>
                    <Text style={s.meta}>
                      {item.calories} kcal
                      {item.protein != null ? ` • P:${item.protein}g` : ""}
                      {item.carbs != null ? ` • C:${item.carbs}g` : ""}
                      {item.fat != null ? ` • F:${item.fat}g` : ""}
                      {item.quantity ? ` • x${item.quantity} ${item.unit ?? ""}` : ""}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={s.meta}>No favorites yet.</Text>}
            />
          )}

          <TouchableOpacity style={[s.btn, s.btnGhost]} onPress={onClose}>
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
  title: { color: "white", fontSize: 18, fontWeight: "800", marginBottom: 8 },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1F2937",
  },
  name: { color: "white", fontWeight: "800" },
  meta: { color: "#9AA4B2", marginTop: 2 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginTop: 8 },
  btnGhost: { borderWidth: 1, borderColor: "#374151" },
  btnGhostText: { color: "#CBD5E1", textAlign: "center", fontWeight: "800" },
});