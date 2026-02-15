import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import COLORS from '../../constants/colors';
import { API_URL } from '../../constants/api';
import { useAuthStore } from '../../store/authContext';
import SafeScreen from '../../components/SafeScreen';
import GlassCard from '../../components/GlassCard';
import GlazedButton from '../../components/GlazedButton';
import { useUIStore } from '../../store/uiStore';
import { apiClient } from '../../lib/apiClient';

interface Club {
    _id: string;
    name: string;
    description: string;
    image: string;
    memberCount: number;
    createdBy: {
        username: string;
        profileImage: string;
    };
    tags: string[];
    isMember?: boolean;
}

export default function ClubsScreen() {
    const [clubs, setClubs] = useState<Club[]>([]);
    const [myClubs, setMyClubs] = useState<Club[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'explore' | 'my_clubs'>('explore');

    const { token, user } = useAuthStore();
    const router = useRouter();
    const { showAlert } = useUIStore();

    useEffect(() => {
        fetchClubs();
    }, [activeTab]);

    const fetchClubs = async () => {
        setLoading(true);
        try {
            if (activeTab === 'explore') {
                const data = await apiClient.get<Club[]>(`/api/clubs?search=${searchQuery}`);
                setClubs(data);
            } else {
                const data = await apiClient.get<Club[]>(`/api/clubs/my-clubs`);
                setMyClubs(data);
            }
        } catch (error) {
            console.error('Error fetching clubs:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleJoinClub = async (clubId: string) => {
        try {
            await apiClient.post(`/api/clubs/${clubId}/join`, {});
            showAlert({ title: 'Success', message: 'Joined club successfully!', type: 'success' });
            fetchClubs(); // Refresh list to update UI state (or ideally just update local state)
        } catch (error: any) {
            showAlert({ title: 'Error', message: error.message || 'Failed to join club', type: 'error' });
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchClubs();
    };

    const renderClubItem = ({ item }: { item: Club }) => (
        <TouchableOpacity
            style={styles.clubCardContainer}
            onPress={() => router.push({ pathname: '/clubs/[id]', params: { id: item._id, name: item.name } })}
        >
            <GlassCard style={styles.clubCard}>
                <Image source={{ uri: item.image || 'https://via.placeholder.com/150' }} style={styles.clubImage} />
                <View style={styles.clubInfo}>
                    <Text style={styles.clubName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.clubDescription} numberOfLines={2}>{item.description}</Text>
                    <View style={styles.clubMeta}>
                        <View style={styles.memberBadge}>
                            <Ionicons name="people" size={12} color={COLORS.textSecondary} />
                            <Text style={styles.memberCount}>{item.memberCount} members</Text>
                        </View>
                        {item.tags.slice(0, 2).map((tag, index) => (
                            <View key={index} style={styles.tagBadge}>
                                <Text style={styles.tagText}>#{tag}</Text>
                            </View>
                        ))}
                    </View>
                </View>
                {activeTab === 'explore' && (
                    <TouchableOpacity
                        style={[styles.joinButton, item.isMember && styles.joinedButton]}
                        onPress={(e) => {
                            e.stopPropagation();
                            if (!item.isMember) {
                                handleJoinClub(item._id);
                            }
                        }}
                        disabled={item.isMember}
                    >
                        <Text style={[styles.joinButtonText, item.isMember && styles.joinedButtonText]}>
                            {item.isMember ? 'Joined' : 'Join'}
                        </Text>
                    </TouchableOpacity>
                )}
            </GlassCard>
        </TouchableOpacity>
    );

    return (
        <SafeScreen top={true} bottom={false}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Book Clubs</Text>
                    <TouchableOpacity
                        style={styles.createButton}
                        onPress={() => router.push('/clubs/create-club')}
                    >
                        <Ionicons name="add" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>

                {/* Tabs */}
                <View style={styles.tabs}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'explore' && styles.activeTab]}
                        onPress={() => setActiveTab('explore')}
                    >
                        <Text style={[styles.tabText, activeTab === 'explore' && styles.activeTabText]}>Explore</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'my_clubs' && styles.activeTab]}
                        onPress={() => setActiveTab('my_clubs')}
                    >
                        <Text style={[styles.tabText, activeTab === 'my_clubs' && styles.activeTabText]}>My Clubs</Text>
                    </TouchableOpacity>
                </View>

                {/* Search Bar (Only for Explore) */}
                {activeTab === 'explore' && (
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={COLORS.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search clubs..."
                            placeholderTextColor={COLORS.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onSubmitEditing={fetchClubs}
                        />
                    </View>
                )}

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={activeTab === 'explore' ? clubs : myClubs}
                        renderItem={renderClubItem}
                        keyExtractor={item => item._id}
                        contentContainerStyle={styles.listContent}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="people-outline" size={64} color={COLORS.textMuted} />
                                <Text style={styles.emptyText}>No clubs found</Text>
                                {activeTab === 'my_clubs' && (
                                    <GlazedButton
                                        title="Create a Club"
                                        onPress={() => router.push('/clubs/create-club')}
                                        style={{ marginTop: 20 }}
                                    />
                                )}
                            </View>
                        }
                    />
                )}
            </View>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
    backButton: { padding: 8 },
    createButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
    tabs: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: COLORS.primary },
    tabText: { color: COLORS.textSecondary, fontWeight: '600' },
    activeTabText: { color: COLORS.primary, fontWeight: '700' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, marginHorizontal: 20, borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 16 },
    searchInput: { flex: 1, marginLeft: 8, color: COLORS.textPrimary },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    clubCardContainer: { marginBottom: 16 },
    clubCard: { flexDirection: 'row', padding: 12, alignItems: 'center' },
    clubImage: { width: 60, height: 60, borderRadius: 12, marginRight: 12 },
    clubInfo: { flex: 1 },
    clubName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
    clubDescription: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
    clubMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    memberBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    memberCount: { fontSize: 12, color: COLORS.textSecondary },
    tagBadge: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    tagText: { fontSize: 10, color: COLORS.primary },
    joinButton: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginLeft: 8 },
    joinButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    joinedButton: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: COLORS.primary },
    joinedButtonText: { color: COLORS.primary },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
    emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 16, fontWeight: '600' },
});
