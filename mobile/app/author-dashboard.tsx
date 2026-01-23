import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import { API_URL } from '../constants/api';
import { useAuthStore } from '../store/authContext';
import SafeScreen from '../components/SafeScreen';
import GlassCard from '../components/GlassCard';

interface Book {
    _id: string;
    title: string;
    image: string;
    totalChapters: number;
    hasContent: boolean;
    publishStatus: string;
    createdAt: string;
}

export default function AuthorDashboard() {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const { token } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        fetchMyBooks();
    }, []);

    const fetchMyBooks = async () => {
        try {
            const response = await fetch(`${API_URL}/api/books/user`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            setBooks(data);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to fetch books');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchMyBooks();
    };

    const renderBookItem = ({ item }: { item: Book }) => (
        <GlassCard style={styles.bookCard}>
            <View style={styles.bookInfo}>
                <Image source={{ uri: item.image }} style={styles.bookCover} />
                <View style={styles.bookText}>
                    <Text style={styles.bookTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.bookMeta}>
                        {item.totalChapters} Chapters • {item.publishStatus.toUpperCase()}
                    </Text>
                    {!item.hasContent && (
                        <View style={styles.noContentBadge}>
                            <Ionicons name="alert-circle" size={12} color={COLORS.error} />
                            <Text style={styles.noContentText}>No content uploaded</Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push({ pathname: '/chapter-manager', params: { bookId: item._id, bookTitle: item.title } })}
                >
                    <Ionicons name="layers-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.actionText}>Chapters</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, !item.hasContent && styles.disabledButton]}
                    onPress={() => item.hasContent && router.push({ pathname: '/author-stats', params: { bookId: item._id, bookTitle: item.title } })}
                    disabled={!item.hasContent}
                >
                    <Ionicons name="stats-chart-outline" size={18} color={item.hasContent ? COLORS.secondary : COLORS.textMuted} />
                    <Text style={[styles.actionText, !item.hasContent && { color: COLORS.textMuted }]}>Stats</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push({ pathname: '/book-detail', params: { bookId: item._id } })}
                >
                    <Ionicons name="eye-outline" size={18} color={COLORS.textTertiary} />
                    <Text style={styles.actionText}>View</Text>
                </TouchableOpacity>
            </View>
        </GlassCard>
    );

    return (
        <SafeScreen top={true}>
            <Stack.Screen options={{ title: 'Author Dashboard', headerTintColor: COLORS.textPrimary }} />

            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Your Library</Text>
                    <Text style={styles.subtitle}>Manage your books and track reader engagement</Text>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={books}
                        keyExtractor={(item) => item._id}
                        renderItem={renderBookItem}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="book-outline" size={60} color={COLORS.textMuted} />
                                <Text style={styles.emptyText}>You haven't recommended any books yet.</Text>
                                <TouchableOpacity
                                    style={styles.createButton}
                                    onPress={() => router.push('/(tabs)/create')}
                                >
                                    <Text style={styles.createButtonText}>Create New Book</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                )}
            </View>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    header: {
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    listContent: {
        paddingBottom: 20,
    },
    bookCard: {
        marginBottom: 16,
        padding: 12,
        borderRadius: 16,
    },
    bookInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    bookCover: {
        width: 60,
        height: 80,
        borderRadius: 8,
        backgroundColor: COLORS.surface,
    },
    bookText: {
        flex: 1,
        marginLeft: 12,
    },
    bookTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    bookMeta: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    noContentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 4,
    },
    noContentText: {
        fontSize: 11,
        color: COLORS.error,
        fontWeight: '600',
    },
    actionRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: 12,
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    disabledButton: {
        opacity: 0.5,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
    },
    emptyText: {
        color: COLORS.textMuted,
        textAlign: 'center',
        marginTop: 16,
        fontSize: 16,
    },
    createButton: {
        marginTop: 24,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
    },
    createButtonText: {
        color: COLORS.white,
        fontWeight: '700',
        fontSize: 16,
    }
});
