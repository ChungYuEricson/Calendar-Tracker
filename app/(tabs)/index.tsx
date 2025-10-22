import { useCalendar } from "@/lib/calendar-context";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

const COLOR_PALETTE = [
  "#FF6347", "#4682B4", "#3CB371", "#FFD700", "#9370DB",
  "#FF69B4", "#00CED1", "#FFA07A", "#008080", "#A0522D",
];

// --- 1. UPDATE THE MODAL PROPS ---
interface AddCalendarModalProps {
  isVisible: boolean;
  onClose: () => void;
  onAdd: () => Promise<void>;
  title: string;
  setTitle: (text: string) => void;
  theme: string;
  setTheme: (color: string) => void;
  colorPalette: string[]; // <-- Add the color palette prop
}

// --- 2. UPDATE THE MODAL COMPONENT ---
const AddCalendarModal = ({
  isVisible,
  onClose,
  onAdd,
  title,
  setTitle,
  theme,
  setTheme,
  colorPalette, // <-- Destructure the new prop
}: AddCalendarModalProps) => (
  <Modal
    animationType="fade"
    transparent={true}
    visible={isVisible}
    onRequestClose={onClose}
  >
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.centeredView}>
        <TouchableWithoutFeedback>
          <View style={styles.modalView}>
            {/* ... (Modal Title and TextInput are the same) */}
            <Text style={styles.modalTitle}>Create New Calendar</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Calendar Title"
              placeholderTextColor="#999"
              value={title}
              onChangeText={setTitle}
            />
            <Text style={styles.modalSubtitle}>Select Color Theme:</Text>
            
            <View style={styles.colorPalette}>
              {/* Use the prop instead of the global constant */}
              {colorPalette.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    theme === color && styles.selectedSwatch,
                  ]}
                  onPress={() => setTheme(color)}
                />
              ))}
            </View>

            {/* ... (Buttons are the same) */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme }]}
                onPress={onAdd}
              >
                <Text style={styles.buttonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
);

// --- 3. UPDATE THE MAIN COMPONENT ---
export default function Index() {
  const { calendars, fetchCalendars, addCalendar } = useCalendar();
  const router = useRouter();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newCalendarTitle, setNewCalendarTitle] = useState("");
  const [newCalendarTheme, setNewCalendarTheme] = useState(COLOR_PALETTE[0]);

  useEffect(() => {
    fetchCalendars();
  }, []);

  const resetAndCloseModal = () => {
    setNewCalendarTitle("");
    setNewCalendarTheme(COLOR_PALETTE[0]);
    setIsModalVisible(false);
  };

  const handleAddCalendar = async () => {
    if (!newCalendarTitle.trim()) {
      alert("Please enter a title for the new calendar.");
      return;
    }
    await addCalendar(newCalendarTitle.trim(), newCalendarTheme);
    resetAndCloseModal();
  };

  const data = [
    ...calendars,
    { $id: "add_new", title: "", theme: "", user_id: "", $createdAt: "", $updatedAt: "" },
  ];

  return (
    <View style={{ flex: 1 }}>
      <AddCalendarModal
        isVisible={isModalVisible}
        onClose={resetAndCloseModal}
        onAdd={handleAddCalendar}
        title={newCalendarTitle}
        setTitle={setNewCalendarTitle}
        theme={newCalendarTheme}
        setTheme={setNewCalendarTheme}
        colorPalette={COLOR_PALETTE} // <-- Pass the palette as a prop here
      />
      
      <FlatList
        data={data}
        keyExtractor={(item) => item.$id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        renderItem={({ item }) => {
          if (item.$id === "add_new") {
            return (
              <TouchableOpacity
                style={[styles.box, styles.addBox]}
                onPress={() => setIsModalVisible(true)}
              >
                <Text style={styles.plus}>+</Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              style={[styles.box, { backgroundColor: item.theme || "#ccc" }]}
              onPress={() => {
                router.push({
                  pathname: "/CalendarViewScreen",
                  params: {
                    calendarId: item.$id,
                    calendarTitle: item.title,
                    calendarTheme: item.theme,
                  },
                });
              }}
            >
              <Text style={styles.title}>{item.title}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

// ... (Styles remain the same)
const styles = StyleSheet.create({
  container: { padding: 16 },
  box: {
    width: "47%",
    margin: 8,
    minHeight: 120,
    borderRadius: 12,
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  addBox: {
    borderWidth: 2,
    borderStyle: "dotted",
    borderColor: "#aaa",
    backgroundColor: "transparent",
  },
  plus: { fontSize: 36, color: "#aaa" },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    alignItems: "stretch",
    width: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 10,
    color: "#555",
  },
  input: {
    height: 45,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  colorPalette: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "transparent",
    margin: 5,
  },
  selectedSwatch: { borderColor: "#333" },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    marginHorizontal: 5,
  },
  cancelButton: { backgroundColor: "#ccc" },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 16,
  },
});