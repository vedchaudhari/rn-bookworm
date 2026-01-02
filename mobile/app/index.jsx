import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image"
import { Link } from "expo-router";
import { useAuthStore } from '../store/authContext';
import { useEffect } from "react";


export default function Index() {

  const { user, token, checkAuth, logout } = useAuthStore();

  useEffect(() => {
    checkAuth()
  }, [user, token])

  return (
    <View style={styles.container}>


      <Text style={styles.title}>Hello {user?.username}</Text>
      <Text style={styles.title}>Token : {token}</Text>
      <Link href={"/signup"}>SignUP page</Link>
      <Link href={"/login"}>Login page</Link>
      <TouchableOpacity onPress={logout}>
        <Text>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  title: { color: "blue" }
})