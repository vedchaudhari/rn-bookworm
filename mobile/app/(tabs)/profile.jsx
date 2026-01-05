import { View, Text, Alert } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'expo-router'
import { API_URL } from '../../constants/api';
import { useAuthStore } from '../../store/authContext';
import styles from "../../assets/styles/profile.styles";
import ProfileHeader from '../../components/ProfileHeader';
import LogoutButton from '../../components/LogoutButton';

export default function Profile() {

  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { token } = useAuthStore();

  const router = useRouter();

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/books/user`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to fetch your books");

      setBooks(data || []);

    } catch (error) {
      console.log("Error fetching books:", error);
      Alert.alert("Error", "Failed to load profile data. Pull down to refresh");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [])

  return (
    <View style={styles.container}>
      <ProfileHeader />
      <LogoutButton />

      {/*Your recommendations*/}
      <View style={styles.booksHeader}>
        <Text style={styles.bookTitle}>Your recommendations 📚</Text>
        <Text style={styles.booksCount}>{books.length}</Text>
      </View>
    </View>
  )
}