import { View, Text, Alert, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useRouter, useFocusEffect } from 'expo-router'
import { API_URL } from '../../constants/api';
import { useAuthStore } from '../../store/authContext';
import styles from "../../assets/styles/profile.styles";
import ProfileHeader from '../../components/ProfileHeader';
import LogoutButton from '../../components/LogoutButton';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../constants/colors';
import { Image } from "expo-image";
import { sleep } from "./index";
import Loader from '../../components/Loader';

export default function Profile() {

  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteBookId, setDeleteBookId] = useState(null);


  const { token } = useAuthStore();

  const router = useRouter();

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/books/user`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

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

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  const handleDeleteBook = async (bookId) => {
    try {
      setDeleteBookId(bookId);
      const response = await fetch(
        `${API_URL}/api/books/${bookId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to delete book")

      setBooks(prev => prev.filter(book => book._id !== bookId))
      Alert.alert("Success", "Recommendation deleted successfully")
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to delete recommendation");
    } finally {
      setDeleteBookId(null);
    }
  }

  const confirmDelete = (bookId) => {
    Alert.alert("Delete Recommendation", "Are you sure you want to delete this recommendation", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => handleDeleteBook(bookId) }
    ]);
  };

  const renderBookItem = ({ item }) => (
    <View style={styles.bookItem}>

      {/*Image*/}

      <Image
        source={{ uri: item.image }}
        style={styles.bookImage}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={400}
        placeholder={{ blurhash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj" }}
      />


      {/*Text section*/}

      <View style={styles.bookInfo}>

        <Text style={styles.bookTitle}>{item.title}</Text>

        <View style={styles.ratingContainer}>
          {renderRatingStars(item.rating)}
        </View>

        <Text style={styles.bookCaption}>{item.caption}</Text>

        <Text style={styles.bookDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>

      </View>

      {/*Delete button*/}
      <TouchableOpacity style={styles.deleteButton} onPress={() => { confirmDelete(item._id) }}>
        {
          deleteBookId === item._id
            ? (
              <ActivityIndicator size="small" color={COLORS.primary} />)
            : (
              <Ionicons name="trash-outline" size={20} color={COLORS.primary} />
            )
        }
      </TouchableOpacity>

    </View>
  );

  const renderRatingStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? "star" : "star-outline"}
          size={14}
          color={i <= rating ? "#f4b400" : COLORS.textSecondary}
          style={{ marginRight: 2 }}
        />
      )
    }
    return stars;
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    await sleep(100);
    await fetchData();
    setRefreshing(false);
  }

  if (isLoading && !refreshing) {
    return <Loader size='large' />
  }


  return (
    <View style={styles.container}>
      <ProfileHeader />
      <LogoutButton />

      {/*Your recommendations*/}
      <View style={styles.booksHeader}>
        <Text style={styles.bookTitle}>Your recommendations 📚</Text>
        <Text style={styles.booksCount}>{books.length}</Text>
      </View>

      <FlatList
        data={books}
        renderItem={renderBookItem}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.booksList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={50} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No recommendations yet</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => router.push("/create")}>
              <Text style={styles.addButtonText}>Add your first book</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  )
}