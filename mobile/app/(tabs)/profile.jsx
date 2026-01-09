import { View, Text, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
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
  const { user: currentUser, token, isCheckingAuth } = useAuthStore();
  const router = useRouter();

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [activeView, setActiveView] = useState('posts');
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    // console.log("Current user:", currentUser?._id);
  }, [currentUser]);

  const fetchData = async () => {
    // Standardize on _id
    const userId = currentUser?._id || currentUser?.id;

    if (!userId || !token) {
      setLoading(false);
      return;
    }

    try {
      if (!refreshing) setLoading(true);

      const [booksRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/books/user`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/social/follow-counts/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (booksRes.ok) {
        const booksData = await booksRes.json();
        setBooks(booksData || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          followers: statsData.followersCount || 0,
          following: statsData.followingCount || 0
        });
      }

    } catch (err) {
      console.error("Profile fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchFollowers = async () => {
    const userId = currentUser?._id || currentUser?.id;
    if (!userId) return;

    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_URL}/api/social/followers/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setFollowers(data.followers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchFollowing = async () => {
    const userId = currentUser?._id || currentUser?.id;
    if (!userId) return;

    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_URL}/api/social/following/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setFollowing(data.following || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const userId = currentUser?._id || currentUser?.id;
      if (userId && token) {
        fetchData();
      } else if (!isCheckingAuth && !currentUser) {
        setLoading(false);
      }
    }, [currentUser, token, isCheckingAuth])
  );

  const handleStatClick = async (view) => {
    setActiveView(view);
    if (view === 'followers') fetchFollowers();
    if (view === 'following') fetchFollowing();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderBookItem = ({ item }) => (
    <TouchableOpacity
      style={styles.bookItem}
      onPress={() => router.push({ pathname: '/book-detail', params: { bookId: item._id } })}
    >
      <Image source={{ uri: item.image }} style={styles.bookImage} />
    </TouchableOpacity>
  );

  const renderUserStrip = ({ item }) => (
    <TouchableOpacity
      style={styles.userStripItem}
      onPress={() => router.push({ pathname: '/user-profile', params: { userId: item.id || item._id } })}
    >
      <Image source={{ uri: item.profileImage }} style={styles.userStripAvatar} />
      <Text style={styles.userStripName} numberOfLines={1}>{item.username}</Text>
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
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >

        <View style={styles.profileHeaderCentered}>
          <LogoutButton />
          <Image source={{ uri: currentUser?.profileImage }} style={styles.avatarLarge} />
          <Text style={styles.usernameCentered}>{currentUser?.username}</Text>
          <Text style={styles.emailCentered}>{currentUser?.email}</Text>
          {currentUser?.bio && <Text style={styles.bioCentered}>{currentUser.bio}</Text>}
        </View>

        <View style={styles.statsRow}>
          <TouchableOpacity onPress={() => handleStatClick('posts')} style={styles.statBox}>
            <Text style={styles.statNumber}>{books.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleStatClick('followers')} style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleStatClick('following')} style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.following}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>

        {activeView === 'posts' && (
          <FlatList
            data={books}
            renderItem={renderBookItem}
            keyExtractor={(i) => i._id}
            numColumns={3}
            scrollEnabled={false}
          />
        )}

        {activeView === 'followers' && (
          <FlatList horizontal data={followers} renderItem={renderUserStrip} />
        )}

        {activeView === 'following' && (
          <FlatList horizontal data={following} renderItem={renderUserStrip} />
        )}

      </ScrollView>
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
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.white,
    textShadowColor: 'rgba(217, 119, 6, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  statBoxActive: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.primary,
  },
  statLabelActive: {
    color: COLORS.primary,
  },
  stripContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  stripTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  stripContent: {
    paddingVertical: 10,
    gap: 16,
  },
  userStripItem: {
    alignItems: 'center',
    width: 90,
  },
  userStripAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: COLORS.surfaceLight,
  },
  userStripName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
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