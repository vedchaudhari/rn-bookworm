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
  const [activeView, setActiveView] = useState('posts'); // 'posts', 'followers', 'following'
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchData = async () => {
    try {
      // Guard: ensure user is fully loaded before making requests
      if (!currentUser?._id) {
        console.log('User not fully loaded yet, skipping fetch');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const [booksRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/books/user`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/social/follow-counts/${currentUser._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      // Check response status before parsing
      if (booksRes.ok) {
        const booksData = await booksRes.json();
        setBooks(booksData || []);
      } else {
        console.error('Books fetch failed:', booksRes.status);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          followers: statsData.followersCount || 0,
          following: statsData.followingCount || 0
        });
      } else {
        console.error('Stats fetch failed:', statsRes.status);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchFollowers = async () => {
    if (!currentUser?._id) return;
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_URL}/api/social/followers/${currentUser._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setFollowers(data.followers || []);
    } catch (error) {
      console.error('Error fetching followers:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchFollowing = async () => {
    if (!currentUser?._id) return;
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_URL}/api/social/following/${currentUser._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setFollowing(data.following || []);
    } catch (error) {
      console.error('Error fetching following:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  const handleStatClick = async (view) => {
    setActiveView(view);
    if (view === 'followers') {
      await fetchFollowers();
      // Refresh stats to get updated count
      if (currentUser?._id) {
        try {
          const res = await fetch(`${API_URL}/api/social/follow-counts/${currentUser._id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setStats({
              followers: data.followersCount || 0,
              following: data.followingCount || 0
            });
          }
        } catch (error) {
          console.error('Error refreshing stats:', error);
        }
      }
    } else if (view === 'following') {
      await fetchFollowing();
      // Refresh stats to get updated count
      if (currentUser?._id) {
        try {
          const res = await fetch(`${API_URL}/api/social/follow-counts/${currentUser._id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setStats({
              followers: data.followersCount || 0,
              following: data.followingCount || 0
            });
          }
        } catch (error) {
          console.error('Error refreshing stats:', error);
        }
      }
    }
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
      <Image
        source={{ uri: item.image }}
        style={styles.bookImage}
        contentFit="cover"
        transition={300}
      />
    </TouchableOpacity>
  );

  const renderUserStrip = ({ item }) => (
    <TouchableOpacity
      style={styles.userStripItem}
      onPress={() => router.push({ pathname: '/user-profile', params: { userId: item._id } })}
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
            <TouchableOpacity
              style={[styles.statBox, activeView === 'posts' && styles.statBoxActive]}
              onPress={() => handleStatClick('posts')}
              activeOpacity={0.7}
            >
              <Text style={styles.statNumber}>{books.length}</Text>
              <Text style={[styles.statLabel, activeView === 'posts' && styles.statLabelActive]}>Posts</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity
              style={[styles.statBox, activeView === 'followers' && styles.statBoxActive]}
              onPress={() => handleStatClick('followers')}
              activeOpacity={0.7}
            >
              <Text style={styles.statNumber}>{stats.followers ?? 0}</Text>
              <Text style={[styles.statLabel, activeView === 'followers' && styles.statLabelActive]}>Followers</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity
              style={[styles.statBox, activeView === 'following' && styles.statBoxActive]}
              onPress={() => handleStatClick('following')}
              activeOpacity={0.7}
            >
              <Text style={styles.statNumber}>{stats.following ?? 0}</Text>
              <Text style={[styles.statLabel, activeView === 'following' && styles.statLabelActive]}>Following</Text>
            </TouchableOpacity>
          </View>

          {/* Content Section - Conditional based on activeView */}
          {activeView === 'posts' && (
            <>
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
            </>
          )}

          {activeView === 'followers' && (
            <View style={styles.stripContainer}>
              <Text style={styles.stripTitle}>Followers ({stats.followers})</Text>
              {loadingUsers ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
              ) : followers.length > 0 ? (
                <FlatList
                  data={followers}
                  renderItem={renderUserStrip}
                  keyExtractor={(item) => item._id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.stripContent}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyText}>No followers yet</Text>
                </View>
              )}
            </View>
          )}

          {activeView === 'following' && (
            <View style={styles.stripContainer}>
              <Text style={styles.stripTitle}>Following ({stats.following})</Text>
              {loadingUsers ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
              ) : following.length > 0 ? (
                <FlatList
                  data={following}
                  renderItem={renderUserStrip}
                  keyExtractor={(item) => item._id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.stripContent}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyText}>Not following anyone yet</Text>
                </View>
              )}
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