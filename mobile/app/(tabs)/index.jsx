import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authContext'
import styles from "../../assets/styles/home.styles";
import { Image } from 'expo-image'
import { API_URL } from '../../constants/api';
import { Ionicons } from "@expo/vector-icons"
import COLORS from '../../constants/colors';
import { formatPublishDate } from '../../lib/utils';
import Loader from '../../components/Loader';
import LikeButton from '../../components/LikeButton';
import GlassCard from '../../components/GlassCard';
import Animated, { FadeInDown } from 'react-native-reanimated';

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function Home() {
  const { token } = useAuthStore();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();

  const fetchBooks = async (pageNum = 1, refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);

      const response = await fetch(`${API_URL}/api/books?page=${pageNum}&limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to fetch books");

      const allBooks = refresh || pageNum === 1 ? data.books : [...books, ...data.books];
      const uniqueBooks = Array.from(new Map(allBooks.map(book => [book._id, book])).values());

      setBooks(uniqueBooks);
      setHasMore(pageNum < data.totalPages);
      setPage(pageNum);
    } catch (error) {
      console.log("Error fetching books:", error);
    } finally {
      if (refresh) {
        await sleep(100);
        setRefreshing(false);
      } else setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchBooks();
    }, [])
  );

  const handleLoadMore = async () => {
    if (hasMore && !loading && !refreshing) {
      await fetchBooks(page + 1);
    }
  };

  const renderRatingStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? "star" : "star-outline"}
          size={16}
          color={i <= rating ? "#f4b400" : COLORS.textMuted}
          style={{ marginRight: 2 }}
        />
      );
    }
    return stars;
  };

  const renderItem = ({ item, index }) => (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/book-detail', params: { bookId: item._id } })}
        activeOpacity={0.9}
        style={{ marginBottom: 24 }}
      >
        <GlassCard style={styles.bookCard}>
          <View style={styles.bookImageContainer}>
            <Image
              source={{ uri: item.image }}
              style={styles.bookImage}
              contentFit='cover'
              transition={500}
            />
            <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' }} />
          </View>

          <View style={styles.floatHeader}>
            <TouchableOpacity
              style={styles.userInfo}
              onPress={() => router.push({ pathname: '/user-profile', params: { userId: item.user._id } })}
            >
              <Image source={{ uri: item.user.profileImage }} style={styles.avatar} />
              <Text style={styles.username}>{item.user.username}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bookDetails}>
            <Text style={styles.bookTitle}>{item.title}</Text>
            <View style={styles.ratingContainer}>
              {renderRatingStars(item.rating)}
            </View>
            <Text style={styles.caption} numberOfLines={3}>{item.caption}</Text>

            <View style={styles.cardFooter}>
              <Text style={styles.date}>{formatPublishDate(item.createdAt)}</Text>
              <View style={styles.socialGroup}>
                <LikeButton
                  bookId={item._id}
                  initialLiked={item.isLiked}
                  initialCount={item.likeCount || 0}
                  size={22}
                />
                <TouchableOpacity
                  style={styles.commentInfo}
                  onPress={() => router.push({ pathname: '/book-detail', params: { bookId: item._id, tab: 'comments' } })}
                >
                  <Ionicons name="chatbubble-outline" size={20} color={COLORS.textSecondary} />
                  <Text style={styles.commentCount}>{item.commentCount || 0}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  );

  if (loading) return <Loader size="large" />;

  return (
    <View style={styles.container}>
      <FlatList
        data={books}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchBooks(1, true)}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Feed</Text>
            <Text style={styles.headerSubtitle}>Curated stories for your shelf</Text>
          </View>
        }
        ListFooterComponent={hasMore && books.length > 0 ? <ActivityIndicator style={styles.footerLoader} size="small" color={COLORS.primary} /> : null}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={60} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No recommendations yet</Text>
            <Text style={styles.emptySubtext}>Be the first to share a book!</Text>
          </View>
        }
      />
    </View>
  );
}