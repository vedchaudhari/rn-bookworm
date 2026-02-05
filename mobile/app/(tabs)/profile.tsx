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
import ImageCropper from '../../components/ImageCropper';
import FollowButton from '../../components/FollowButton';

interface User {
    _id: string;
    id?: string;
    username: string;
    email: string;
    bio?: string;
    profileImage?: string;
    currentStreak?: number;
    longestStreak?: number;
    isFollowing?: boolean;
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
    const [cropperVisible, setCropperVisible] = useState<boolean>(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
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

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: false, // Use custom cropper
                quality: 0.8,
            });

            if (result.canceled || !result.assets[0]) {
                setUploadingImage(false); // Stop indicator if canceled
                return;
            }

            setSelectedImage(result.assets[0].uri);
            setCropperVisible(true);
        } catch (err: any) {
            console.error("Upload error:", err);
            showAlert({ title: 'Error', message: err.message || 'Upload failed', type: 'error' });
            setUploadingImage(false); // Stop indicator on error
        }
    };

    const handleCropComplete = async (croppedUri: string) => {
        setCropperVisible(false);
        if (!croppedUri || !token) return;

        try {
            setUploadingImage(true);
            const fileName = croppedUri.split('/').pop() || 'profile.jpg';
            const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'jpg';

            let contentType = 'image/jpeg';
            if (fileExtension === 'png') contentType = 'image/png';
            else if (fileExtension === 'webp') contentType = 'image/webp';

            const { uploadUrl, finalUrl } = await apiClient.get<{ uploadUrl: string; finalUrl: string }>(
                '/api/users/presigned-url/profile-image', { fileName, contentType }
            );

            const blobResponse = await fetch(croppedUri);
            const blob = await blobResponse.blob();

            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                body: blob,
                headers: { 'Content-Type': contentType }
            });

            if (!uploadResponse.ok) throw new Error('Cloud upload failed');

            const updateResponse = await apiClient.put<{ success: boolean; user: any }>('/api/users/update-profile-image', {
                profileImage: finalUrl,
            });

            if (updateResponse.success) {
                useAuthStore.setState({ user: updateResponse.user });
                showAlert({ title: 'Success', message: 'Profile updated!', type: 'success' });
                fetchData();
            }
        } catch (err: any) {
            console.error("Crop upload error:", err);
            showAlert({ title: 'Error', message: err.message || 'Upload failed', type: 'error' });
        } finally {
            setUploadingImage(false);
            setSelectedImage(null);
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

    const renderUserStrip: ListRenderItem<User> = ({ item }) => {
        const isSelf = (currentUser?._id || currentUser?.id) === (item.id || item._id);

        return (
            <TouchableOpacity
                style={styles.userListItem}
                onPress={() => router.push({ pathname: '/user-profile', params: { userId: item.id || item._id } })}
                activeOpacity={0.7}
            >
                <Image source={{ uri: item.profileImage }} style={styles.userListAvatar} />
                <Text style={styles.userListName} numberOfLines={1}>{item.username}</Text>

                {!isSelf && (
                    <FollowButton
                        userId={item.id || item._id || ''}
                        initialFollowing={item.isFollowing}
                        compact={true}
                        style={{ marginLeft: 12 }}
                    />
                )}
            </TouchableOpacity>
        );
    };

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
                                color={COLORS.ratingGold}
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
                                value={currentUser?.currentStreak || 0}
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

            <ImageCropper
                visible={cropperVisible}
                imageUri={selectedImage}
                onCancel={() => setCropperVisible(false)}
                onCrop={handleCropComplete}
                aspectRatio={[1, 1]}
            />
        </SafeScreen>
    );
}
