import { View, Text, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Dimensions, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import COLORS from '../../constants/colors';
import { API_URL } from '../../constants/api';
import { useAuthStore } from '../../store/authContext';
import LogoutButton from '../../components/LogoutButton';
import SafeScreen from '../../components/SafeScreen';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3;

export default function Profile() {
  const { user: currentUser, token } = useAuthStore();
  const router = useRouter();

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ followers: 0, following: 0 });

  const fetchData = async () => {
    try {
      const [booksRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/books/user`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/social/follow-counts/${currentUser.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const booksData = await booksRes.json();
      const statsData = await statsRes.json();

      if (booksRes.ok) setBooks(booksData || []);
      if (statsRes.ok) setStats(statsData);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderBookItem = ({ item }) => (
    <TouchableOpacity
      style={styles.bookItem}
      onPress={() => router.push({ pathname: '/book-detail', params: { bookId: item._id } })}
    >
      <Image
        source={{ uri: item.image }}
        style={styles.bookImage}
        contentFit="cover"
        transition={300}
      />
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeScreen>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
          }
        >
          {/* Centered Profile Header */}
          <View style={styles.profileHeaderCentered}>
            <LogoutButton />
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: currentUser?.profileImage }} style={styles.avatarLarge} />
              <View style={styles.activeGlow} />
            </View>

            <Text style={styles.usernameCentered}>{currentUser?.username}</Text>
            <Text style={styles.emailCentered}>{currentUser?.email}</Text>
            {currentUser?.bio && <Text style={styles.bioCentered}>{currentUser.bio}</Text>}
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{books.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statDivider} />
            <TouchableOpacity
              style={styles.statBox}
              onPress={() => router.push({ pathname: '/followers-list', params: { userId: currentUser.id, type: 'followers' } })}
            >
              <Text style={styles.statNumber}>{stats.followers}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity
              style={styles.statBox}
              onPress={() => router.push({ pathname: '/followers-list', params: { userId: currentUser.id, type: 'following' } })}
            >
              <Text style={styles.statNumber}>{stats.following}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>

          {/* Bookshelf */}
          <View style={styles.booksHeader}>
            <Text style={styles.sectionTitle}>My Bookshelf</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/create')}>
              <Ionicons name="add-circle" size={28} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {books.length > 0 ? (
            <FlatList
              data={books}
              renderItem={renderBookItem}
              keyExtractor={(item) => item._id}
              numColumns={3}
              scrollEnabled={false}
              contentContainerStyle={styles.gridContent}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="book-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Start sharing your reads!</Text>
              <TouchableOpacity style={styles.addButton} onPress={() => router.push('/(tabs)/create')}>
                <Text style={styles.addButtonText}>Create First Post</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeScreen>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  profileHeaderCentered: {
    alignItems: 'center',
    paddingVertical: 32,
    position: 'relative',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.surfaceLight,
  },
  activeGlow: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.success,
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  usernameCentered: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  emailCentered: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  bioCentered: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    borderRadius: 24,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.surfaceLight,
    height: '60%',
    alignSelf: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  booksHeader: {
    marginTop: 40,
    paddingHorizontal: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  gridContent: {
    paddingHorizontal: 2,
  },
  bookItem: {
    width: COLUMN_WIDTH - 4,
    height: (COLUMN_WIDTH - 4) * 1.5,
    margin: 2,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bookImage: {
    width: '100%',
    height: '100%',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: COLORS.textMuted,
    marginTop: 12,
    fontWeight: '600',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
};