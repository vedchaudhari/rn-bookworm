import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, ListRenderItemInfo } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, Stack, useRouter, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../constants/colors';
import { useAuthStore } from '../store/authContext';
import { apiClient } from '../lib/apiClient';
import FollowButton from '../components/FollowButton';
import SafeScreen from '../components/SafeScreen';

interface User { _id: string; username: string; profileImage: string; bio?: string; level?: number; isFollowing?: boolean; }

export default function FollowersListScreen() {
    const insets = useSafeAreaInsets();
    const { userId, username, type } = useLocalSearchParams<{ userId: string; username: string; type: string }>();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuthStore();
    const router = useRouter();
    const isFollowers = type === 'followers';

    useEffect(() => { fetchUsers(); }, [userId, type]);
    useFocusEffect(React.useCallback(() => { fetchUsers(); }, [userId, type]));

    const fetchUsers = async () => {
        try {
            const endpoint = isFollowers ? `/api/social/followers/${userId}` : `/api/social/following/${userId}`;
            const data = await apiClient.get<any>(endpoint);
            const usersList = isFollowers ? (data.followers || []) : (data.following || []);
            const uniqueUsers = Array.from(new Map(usersList.map((u: any) => [u._id, u])).values());
            setUsers(uniqueUsers as User[]);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching users:', error);
            setLoading(false);
        }
    };

    const handleUserPress = (user: User) => { router.push({ pathname: '/user-profile', params: { userId: user._id } }); };

    const renderUser = ({ item }: ListRenderItemInfo<User>) => (
        <TouchableOpacity style={styles.userItem} onPress={() => handleUserPress(item)}>
            <Image source={{ uri: item.profileImage }} style={styles.avatar} />
            <View style={styles.userInfo}>
                <Text style={styles.username}>{item.username}</Text>
                {!!item.bio && <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text>}
                <View style={styles.levelBadge}>
                    <Text style={styles.levelText}>Level {item.level || 1}</Text>
                </View>
            </View>
            <FollowButton userId={item._id} initialFollowing={item.isFollowing || false} />
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <SafeScreen>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </SafeScreen>
        );
    }

    return (
        <SafeScreen top={true} bottom={false}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.container}>
                {/* Custom Header */}
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {`${username || 'User'}'s ${isFollowers ? 'Followers' : 'Following'}`}
                    </Text>
                    <View style={{ width: 40 }} />
                </View>

                <FlatList
                    data={users}
                    renderItem={renderUser}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                                {isFollowers ? 'No followers yet' : 'Not following anyone yet'}
                            </Text>
                        </View>
                    }
                />
            </View>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 5 },
    backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.5 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    listContent: { paddingBottom: 20 },
    userItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    avatar: { width: 56, height: 56, borderRadius: 28 },
    userInfo: { flex: 1, marginHorizontal: 12 },
    username: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
    bio: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
    levelBadge: { alignSelf: 'flex-start', backgroundColor: COLORS.primary + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    levelText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
    emptyContainer: { alignItems: 'center', padding: 40, marginTop: 40 },
    emptyText: { fontSize: 16, color: COLORS.textSecondary },
});
