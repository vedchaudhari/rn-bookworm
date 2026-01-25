import { View, Text, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, useWindowDimensions, ListRenderItem } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import COLORS from '../../constants/colors';
import { API_URL } from '../../constants/api';
import { useAuthStore } from '../../store/authContext';
import styles from '../../assets/styles/profile.styles';
import SafeScreen from '../../components/SafeScreen';
import PremiumBadge from '../../components/PremiumBadge';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { useCurrencyStore } from '../../store/currencyStore';
import GlassCard from '../../components/GlassCard';
import StatCard from '../../components/StatCard';
import PremiumButton from '../../components/PremiumButton';
import { useUIStore } from '../../store/uiStore';
import { apiClient } from '../../lib/apiClient';

interface User {
    _id: string;
    id?: string;
    username: string;
    email: string;
    bio?: string;
    profileImage?: string;
    streakDays?: number;
}

interface Book {
    _id: string;
    image: string;
}

interface Stats {
    followers: number;
    following: number;
}

interface AuthStore {
    user: User | null;
    token: string | null;
    isCheckingAuth: boolean;
}

interface SubscriptionStore {
    isPro: boolean;
}

type ActiveView = 'posts' | 'followers' | 'following';

export default function Profile() {
    const { user: currentUser, token, isCheckingAuth } = useAuthStore() as AuthStore;
    const { isPro } = useSubscriptionStore() as SubscriptionStore;
    const { balance, fetchBalance } = useCurrencyStore();
    const router = useRouter();
    const { width } = useWindowDimensions();

    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    const [stats, setStats] = useState<Stats>({ followers: 0, following: 0 });
    const [activeView, setActiveView] = useState<ActiveView>('posts');
    const [followers, setFollowers] = useState<User[]>([]);
    const [following, setFollowing] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
    const [uploadingImage, setUploadingImage] = useState<boolean>(false);
    const { showAlert } = useUIStore();

    useEffect(() => {
        // User effect
    }, [currentUser]);

    const fetchData = async () => {
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
        if (!userId || !token) return;

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
        if (!userId || !token) return;

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

    const handleChangeProfileImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                showAlert({ title: 'Permission Required', message: 'Please grant photo library access.', type: 'error' });
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (result.canceled || !result.assets[0]) return;

            setUploadingImage(true);
            const imageUri = result.assets[0].uri;
            const fileName = imageUri.split('/').pop() || 'profile.jpg';
            const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
            const contentType = `image/${fileExtension === 'png' ? 'png' : 'jpeg'}`;

            const { uploadUrl, finalUrl } = await apiClient.get<{ uploadUrl: string; finalUrl: string }>(
                '/api/users/presigned-url/profile-image', { fileName, contentType }
            );

            console.log('[Upload] 2. Uploading to S3 (Legacy API)...', uploadUrl);
            const { uploadAsync, FileSystemUploadType } = await import('expo-file-system/legacy');
            const uploadResponse = await uploadAsync(uploadUrl, imageUri, {
                httpMethod: 'PUT',
                headers: { 'Content-Type': contentType },
                uploadType: FileSystemUploadType.BINARY_CONTENT,
            });

            if (uploadResponse.status !== 200) {
                console.error('[Upload] S3 Error:', uploadResponse);
                throw new Error(`Cloud upload failed: Status ${uploadResponse.status}`);
            }

            console.log('[Upload] 3. Syncing with backend...');
            const updateResponse = await apiClient.put<{ success: boolean; user: any }>('/api/users/update-profile-image', {
                profileImage: finalUrl,
            });

            if (updateResponse.success) {
                const updatedUser = updateResponse.user;
                useAuthStore.setState({ user: updatedUser });
                showAlert({ title: 'Success', message: 'Profile updated!', type: 'success' });
                fetchData();
            }
        } catch (err: any) {
            console.error("Upload error:", err);
            showAlert({ title: 'Error', message: err.message || 'Upload failed', type: 'error' });
        } finally {
            setUploadingImage(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            const userId = currentUser?._id || currentUser?.id;
            if (userId && token) {
                fetchData();
                fetchBalance(token);
            } else if (!isCheckingAuth && !currentUser) {
                setLoading(false);
            }
        }, [currentUser, token, isCheckingAuth])
    );

    const handleStatClick = async (view: ActiveView) => {
        setActiveView(view);
        if (view === 'followers') fetchFollowers();
        if (view === 'following') fetchFollowing();
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const renderBookItem: ListRenderItem<Book> = ({ item }) => (
        <TouchableOpacity
            style={styles.bookItem}
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: '/book-detail', params: { bookId: item._id } })}
        >
            <Image source={{ uri: item.image }} style={styles.bookImage} contentFit="cover" transition={200} />
        </TouchableOpacity>
    );

    const renderUserStrip: ListRenderItem<User> = ({ item }) => (
        <TouchableOpacity
            style={styles.userListItem}
            onPress={() => router.push({ pathname: '/user-profile', params: { userId: item.id || item._id } })}
        >
            <Image source={{ uri: item.profileImage }} style={styles.userListAvatar} />
            <Text style={styles.userListName} numberOfLines={1}>{item.username}</Text>
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
        <SafeScreen isTabScreen={true} style={{ backgroundColor: COLORS.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
            >
                {/* Header Actions */}
                <TouchableOpacity style={styles.logoutButton} onPress={() => router.push('/settings')}>
                    <Ionicons name="settings-outline" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>

                <View style={styles.headerContainer}>
                    {/* Glowing Avatar */}
                    <TouchableOpacity
                        style={styles.avatarContainer}
                        onPress={handleChangeProfileImage}
                        disabled={uploadingImage}
                    >
                        <View style={styles.avatarGlowRing}>
                            <Image source={{ uri: currentUser?.profileImage }} style={styles.avatarImage} />
                            {uploadingImage && (
                                <View style={[styles.avatarImage, { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }]}>
                                    <ActivityIndicator color={COLORS.white} />
                                </View>
                            )}
                        </View>
                        <View style={styles.cameraButton}>
                            <Ionicons name="camera" size={18} color={COLORS.white} />
                        </View>
                    </TouchableOpacity>

                    {/* User Info */}
                    <View style={styles.userInfoContainer}>
                        <View style={styles.usernameRow}>
                            <Text style={styles.usernameText}>{currentUser?.username}</Text>
                            {isPro && <PremiumBadge size="small" />}
                        </View>
                        <Text style={styles.emailText}>{currentUser?.email}</Text>
                    </View>

                    {/* Main CTA */}
                    <View style={styles.dashboardButtonContainer}>
                        <PremiumButton
                            title="Author Dashboard"
                            icon="stats-chart"
                            onPress={() => router.push('/author-dashboard')}
                        />
                    </View>

                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                        <TouchableOpacity
                            style={{ flex: 1 }}
                            onPress={() => router.push('/rewards')}
                            activeOpacity={0.8}
                        >
                            <StatCard
                                label="Ink Drops"
                                value={balance}
                                icon="water"
                                color={COLORS.gold}
                                style={styles.statCard}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{ flex: 1 }}
                            onPress={() => router.push('/streaks')}
                            activeOpacity={0.8}
                        >
                            <StatCard
                                label="Streak Days"
                                value={currentUser?.streakDays || 12}
                                icon="flame"
                                color={COLORS.accent}
                                style={styles.statCard}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Segmented Tabs */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity onPress={() => setActiveView('posts')} style={[styles.tabItem, activeView === 'posts' && styles.activeTabItem]}>
                        <Text style={[styles.tabText, activeView === 'posts' && styles.activeTabText]}>Posts</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleStatClick('followers')} style={[styles.tabItem, activeView === 'followers' && styles.activeTabItem]}>
                        <Text style={[styles.tabText, activeView === 'followers' && styles.activeTabText]}>
                            {stats.followers} Followers
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleStatClick('following')} style={[styles.tabItem, activeView === 'following' && styles.activeTabItem]}>
                        <Text style={[styles.tabText, activeView === 'following' && styles.activeTabText]}>
                            {stats.following} Following
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Content Area */}
                {activeView === 'posts' && (
                    <FlatList
                        data={books}
                        renderItem={renderBookItem}
                        keyExtractor={(i) => i._id}
                        numColumns={3}
                        scrollEnabled={false}
                        contentContainerStyle={styles.gridContainer}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="book-outline" size={48} color={COLORS.textTertiary} />
                                <Text style={styles.emptyText}>No books shared yet.</Text>
                                <View style={{ marginTop: 20 }}>
                                    <PremiumButton
                                        title="Share your first book"
                                        onPress={() => router.push('/create')}
                                        variant="secondary"
                                    />
                                </View>
                            </View>
                        }
                    />
                )}

                {(activeView === 'followers' || activeView === 'following') && (
                    <View style={styles.userListContainer}>
                        {loadingUsers ? (
                            <ActivityIndicator color={COLORS.primary} />
                        ) : (
                            <FlatList
                                data={activeView === 'followers' ? followers : following}
                                renderItem={renderUserStrip}
                                keyExtractor={(item) => item.id || item._id}
                                scrollEnabled={false} // Since parent is ScrollView
                                ListEmptyComponent={
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyText}>
                                            {activeView === 'followers' ? "No followers yet." : "Not following anyone yet."}
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
