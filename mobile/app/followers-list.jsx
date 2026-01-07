import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import COLORS from '../constants/colors';
import { useAuthStore } from '../store/authContext';
import { API_URL } from '../constants/api';
import FollowButton from '../components/FollowButton';

export default function FollowersListScreen() {
    const { userId, username, type } = useLocalSearchParams();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const { token } = useAuthStore();
    const router = useRouter();

    const isFollowers = type === 'followers';

    useEffect(() => {
        fetchUsers();
    }, [userId, type]);

    const fetchUsers = async () => {
        try {
            const endpoint = isFollowers
                ? `${API_URL}/api/social/followers/${userId}`
                : `${API_URL}/api/social/following/${userId}`;

            const response = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            setUsers(data.users || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching users:', error);
            setLoading(false);
        }
    };

    const handleUserPress = (user) => {
        router.push({
            pathname: '/user-profile',
            params: { userId: user._id },
        });
    };

    const renderUser = ({ item }) => (
        <TouchableOpacity
            style={styles.userItem}
            onPress={() => handleUserPress(item)}
        >
            <Image source={{ uri: item.profileImage }} style={styles.avatar} />
            <View style={styles.userInfo}>
                <Text style={styles.username}>{item.username}</Text>
                {item.bio && <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text>}
                <View style={styles.levelBadge}>
                    <Text style={styles.levelText}>Level {item.level || 1}</Text>
                </View>
            </View>
            <FollowButton userId={item._id} />
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: `${username}'s ${isFollowers ? 'Followers' : 'Following'}`,
                    headerStyle: { backgroundColor: COLORS.cardBackground },
                    headerTintColor: COLORS.textPrimary,
                    headerShadowVisible: false,
                }}
            />
            <View style={styles.container}>
                <FlatList
                    data={users}
                    renderItem={renderUser}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                                {isFollowers ? 'No followers yet' : 'Not following anyone yet'}
                            </Text>
                        </View>
                    }
                />
            </View>
        </>
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
    listContent: {
        paddingBottom: 20,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        gap: 12,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    userInfo: {
        flex: 1,
    },
    username: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    bio: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    levelBadge: {
        alignSelf: 'flex-start',
        backgroundColor: COLORS.primary + '20',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    levelText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.primary,
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 40,
        marginTop: 40,
    },
    emptyText: {
        fontSize: 16,
        color: COLORS.textSecondary,
    },
};
