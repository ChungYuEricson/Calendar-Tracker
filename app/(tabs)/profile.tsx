import { Button, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../lib/auth-context"; // adjust path if needed

export default function ProfileScreen() {
  const { user, signOut, isLoadingUser } = useAuth();

  if (isLoadingUser) {
    return (
      <View style={styles.container}>
        <Text>Loading user...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>No user signed in.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {user.email}</Text>

      <Button title="Log Out" onPress={signOut} color="#e74c3c" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
  },
});
