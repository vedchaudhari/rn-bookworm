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

import styles from '../../assets/styles/profile.styles';

const { width } = Dimensions.get('window');

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
      <View style={{ flex: 1 }}>
        <Text style={styles.userStripName} numberOfLines={1}>{item.username}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <SafeScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen isTabScreen={true}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.profileHeaderCentered}>
          <LogoutButton />
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: currentUser?.profileImage }} style={styles.avatarLarge} />
          </View>
          <Text style={styles.usernameCentered}>{currentUser?.username}</Text>
          <Text style={styles.emailCentered}>{currentUser?.email}</Text>
          {currentUser?.bio && <Text style={styles.bioCentered}>{currentUser.bio}</Text>}
        </View>

        <View style={styles.statsRow}>
          <TouchableOpacity onPress={() => handleStatClick('posts')} style={styles.statBox}>
            <Text style={styles.statNumber}>{books.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity onPress={() => handleStatClick('followers')} style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity onPress={() => handleStatClick('following')} style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.following}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            onPress={() => setActiveView('posts')}
            style={[styles.tab, activeView === 'posts' && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeView === 'posts' && styles.tabTextActive]}>Posts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleStatClick('followers')}
            style={[styles.tab, activeView === 'followers' && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeView === 'followers' && styles.tabTextActive]}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleStatClick('following')}
            style={[styles.tab, activeView === 'following' && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeView === 'following' && styles.tabTextActive]}>Following</Text>
          </TouchableOpacity>
        </View>

        {activeView === 'posts' && (
          <FlatList
            data={books}
            renderItem={renderBookItem}
            keyExtractor={(i) => i._id}
            numColumns={3}
            scrollEnabled={false}
            contentContainerStyle={styles.gridContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="book-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>You haven't recommended any books yet.</Text>
                <TouchableOpacity style={styles.addButton} onPress={() => router.push('/create')}>
                  <Text style={styles.addButtonText}>Share your first book</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}

        {(activeView === 'followers' || activeView === 'following') && (
          <View style={styles.stripContainer}>
            {loadingUsers ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                horizontal
                data={activeView === 'followers' ? followers : following}
                renderItem={renderUserStrip}
                keyExtractor={(item) => item.id || item._id}
                showsHorizontalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={[styles.emptyContainer, { width: width - 40 }]}>
                    <Text style={styles.emptyText}>
                      {activeView === 'followers' ? "No followers yet." : "You're not following anyone yet."}
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        )}

      </ScrollView>
    </SafeScreen>
  );
}
