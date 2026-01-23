import { View, Text, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Dimensions, Alert, StyleSheet, ListRenderItemInfo } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../constants/colors';
import { apiClient } from '../lib/apiClient';
import { useAuthStore } from '../store/authContext';
import FollowButton from '../components/FollowButton';
import GlassCard from '../components/GlassCard';
import SafeScreen from '../components/SafeScreen';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3;

interface UserProfile { _id: string; username: string; profileImage: string; bio?: string; level?: number; currentStreak?: number; followersCount?: number; followingCount?: number; }
interface Book { _id: string; image: string; }

export default function UserProfile() {
    const insets = useSafeAreaInsets();
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const { user: currentUser, token } = useAuthStore();
    const router = useRouter();

    const [user, setUser] = useState<UserProfile | null>(null);
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ followers: 0, following: 0 });
    const [isFollowing, setIsFollowing] = useState(false);

    const isOwnProfile = (currentUser?._id || (currentUser as any)?.id) === userId;

    const fetchData = async () => {
        if (!userId || !token) return;
        try {
            const [userData, booksData] = await Promise.all([
                apiClient.get<any>(`/api/users/${userId}`),
                apiClient.get<any>(`/api/books/user/${userId}`)
            ]);

            const userProfile = userData?.user || (userData?._id ? userData : null);

            if (userProfile) {
                setUser(userProfile);
                setStats({
                    followers: userProfile.followersCount || 0,
                    following: userProfile.followingCount || 0
                });
                setIsFollowing(userData.isFollowing || false);
            } else {
                console.warn('[UserProfile] No user data found in response:', userData);
            }

            if (booksData) {
                const rawBooks = Array.isArray(booksData) ? booksData : [];
                const uniqueBooks = Array.from(new Map(rawBooks.map((b: any) => [b._id, b])).values());
                setBooks(uniqueBooks as Book[]);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleUpdateProfileImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: true
            });
            if (!result.canceled && result.assets[0].base64) {
                const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
                setUser(prev => prev ? { ...prev, profileImage: base64Img } : null);

                await apiClient.put('/api/users/update-profile-image', { profileImage: base64Img });
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update profile image');
            fetchData();
        }
    };

    useEffect(() => { fetchData(); }, [userId, token]);
    const handleRefresh = () => { setRefreshing(true); fetchData(); };
    const handleFollowersPress = () => { router.push({ pathname: '/followers-list', params: { userId, username: user?.username, type: 'followers' } }); };
    const handleFollowingPress = () => { router.push({ pathname: '/followers-list', params: { userId, username: user?.username, type: 'following' } }); };
    const handleMessage = () => { router.push({ pathname: '/chat', params: { userId, username: user?.username, profileImage: user?.profileImage } }); };

    const renderBookItem = ({ item }: ListRenderItemInfo<Book>) => (
        <TouchableOpacity style={styles.bookItem} onPress={() => router.push({ pathname: '/book-detail', params: { bookId: item._id } })}>
            <Image source={{ uri: item.image }} style={styles.bookImage} contentFit="cover" transition={300} />
        </TouchableOpacity>
    );

    if (loading) return (<SafeScreen><View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeScreen>);

    return (
        <SafeScreen top={true} bottom={false}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.container}>
                {/* Custom Header Row */}
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />}>
                    <View style={styles.profileHeaderCentered}>
                        <TouchableOpacity style={styles.avatarWrapper} onPress={isOwnProfile ? handleUpdateProfileImage : undefined} activeOpacity={isOwnProfile ? 0.7 : 1}>
                            <Image source={{ uri: user?.profileImage }} style={styles.avatarLarge} />
                            {isOwnProfile && <View style={styles.editIconBadge}><Ionicons name="camera" size={12} color="#fff" /></View>}
                            <View style={styles.activeGlow} />
                        </TouchableOpacity>
                        <Text style={styles.usernameCentered}>{user?.username || ''}</Text>
                        {!!user?.bio && <Text style={styles.bioCentered}>{user.bio}</Text>}
                    </View>
                    <GlassCard style={styles.statsRow}>
                        <View style={styles.statBox}><Text style={styles.statNumber}>{books.length}</Text><Text style={styles.statLabel}>Posts</Text></View>
                        <View style={styles.statDivider} />
                        <TouchableOpacity style={styles.statBox} onPress={handleFollowersPress}><Text style={styles.statNumber}>{stats.followers}</Text><Text style={styles.statLabel}>Followers</Text></TouchableOpacity>
                        <View style={styles.statDivider} />
                        <TouchableOpacity style={styles.statBox} onPress={handleFollowingPress}><Text style={styles.statNumber}>{stats.following}</Text><Text style={styles.statLabel}>Following</Text></TouchableOpacity>
                    </GlassCard>
                    <View style={styles.badgesRow}>
                        <View style={styles.levelBadge}><Ionicons name="trophy" size={14} color={COLORS.gold} /><Text style={styles.levelText}>Level {user?.level || 1}</Text></View>
                        {(user?.currentStreak || 0) > 0 && <View style={styles.streakBadge}><Ionicons name="flame" size={14} color={COLORS.error} /><Text style={styles.streakText}>{user?.currentStreak} day streak</Text></View>}
                    </View>
                    <View style={styles.actionButtonsCentered}>
                        {!isOwnProfile && (
                            <FollowButton
                                userId={String(userId)}
                                initialFollowing={isFollowing}
                                onFollowChange={(following) => {
                                    setIsFollowing(following);
                                    setStats(prev => ({
                                        ...prev,
                                        followers: following ? prev.followers + 1 : Math.max(0, prev.followers - 1)
                                    }));
                                }}
                            />
                        )}
                        <TouchableOpacity onPress={handleMessage} style={styles.glassMessageButton}>
                            <Ionicons name={isOwnProfile ? "bookmark-outline" : "chatbubble-outline"} size={18} color={COLORS.textPrimary} />
                            <Text style={styles.messageButtonText}>{isOwnProfile ? "Saved Messages" : "Message"}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.booksHeader}><Text style={styles.sectionTitle}>Bookshelf</Text></View>
                    {books.length > 0 ? <FlatList data={books} renderItem={renderBookItem} keyExtractor={(item, index) => `${item._id || 'book'}-${index}`} numColumns={3} scrollEnabled={false} contentContainerStyle={styles.gridContent} /> : <View style={styles.emptyContainer}><Ionicons name="book-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>Empty bookshelf</Text></View>}
                </ScrollView>
            </View>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    headerRow: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 5 },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    profileHeaderCentered: { alignItems: 'center', paddingVertical: 32 },
    avatarWrapper: { position: 'relative', marginBottom: 16 },
    avatarLarge: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.surfaceLight },
    activeGlow: { position: 'absolute', bottom: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.success, borderWidth: 3, borderColor: COLORS.background },
    editIconBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: COLORS.primary, padding: 6, borderRadius: 12, zIndex: 10, borderWidth: 2, borderColor: COLORS.background },
    usernameCentered: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.5, textAlign: 'center' },
    bioCentered: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 40, lineHeight: 22, fontWeight: '500', opacity: 0.9 },
    statsRow: { flexDirection: 'row', marginHorizontal: 24, paddingVertical: 20 },
    statBox: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, backgroundColor: COLORS.surfaceLight, height: '60%', alignSelf: 'center' },
    statNumber: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
    statLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', marginTop: 4, letterSpacing: 0.5 },
    badgesRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 20 },
    levelBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(244, 180, 0, 0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, gap: 6, borderWidth: 1, borderColor: 'rgba(244, 180, 0, 0.2)' },
    levelText: { color: COLORS.gold, fontSize: 13, fontWeight: '800' },
    streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 71, 87, 0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, gap: 6, borderWidth: 1, borderColor: 'rgba(255, 71, 87, 0.2)' },
    streakText: { color: COLORS.error, fontSize: 13, fontWeight: '800' },
    actionButtonsCentered: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 24, paddingHorizontal: 20 },
    glassMessageButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderRadius: 16, height: 50, gap: 8, borderWidth: 1, borderColor: COLORS.surfaceLight, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    messageButtonText: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 15 },
    booksHeader: { marginTop: 32, paddingHorizontal: 24, marginBottom: 16 },
    sectionTitle: { fontSize: 22, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: -0.5, marginBottom: 8 },
    gridContent: { paddingHorizontal: 2, paddingBottom: 40 },
    bookItem: { width: COLUMN_WIDTH - 6, height: (COLUMN_WIDTH - 6) * 1.5, margin: 3, backgroundColor: COLORS.surface, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.surfaceLight },
    bookImage: { width: '100%', height: '100%' },
    emptyContainer: { alignItems: 'center', paddingVertical: 60, opacity: 0.7 },
    emptyText: { color: COLORS.textSecondary, marginTop: 12, fontWeight: '600', fontSize: 15 },
});
