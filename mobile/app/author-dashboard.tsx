import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import COLORS from '../constants/colors';
import { API_URL } from '../constants/api';
import { useAuthStore } from '../store/authContext';
import { useUIStore } from '../store/uiStore';
import SafeScreen from '../components/SafeScreen';
import GlassCard from '../components/GlassCard';
import PremiumButton from '../components/PremiumButton';
import AppHeader from '../components/AppHeader';
import { BORDER_RADIUS, FONT_SIZE, SPACING, SHADOWS, PADDING } from '../constants/styleConstants';

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
    const { showAlert } = useUIStore();
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
            showAlert({ title: 'Error', message: error.message || 'Failed to fetch books', type: 'error' });
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
                <Image source={{ uri: item.image }} style={styles.bookCover} contentFit="cover" transition={200} />
                <View style={styles.bookText}>
                    <Text style={styles.bookTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={styles.metaRow}>
                        <Ionicons name="document-text-outline" size={12} color={COLORS.textSecondary} />
                        <Text style={styles.bookMeta}>
                            {item.totalChapters} Chapters
                        </Text>
                        <View style={styles.dotSeparator} />
                        <Text style={[
                            styles.statusBadge,
                            { color: item.publishStatus === 'published' ? COLORS.success : COLORS.warning }
                        ]}>
                            {item.publishStatus.toUpperCase()}
                        </Text>
                    </View>
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
                    <Text style={[styles.actionText, { color: COLORS.primary }]}>Chapters</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, !item.hasContent && styles.disabledButton]}
                    onPress={() => item.hasContent && router.push({ pathname: '/author-stats', params: { bookId: item._id, bookTitle: item.title } })}
                    disabled={!item.hasContent}
                >
                    <Ionicons name="stats-chart-outline" size={18} color={item.hasContent ? COLORS.textSecondary : COLORS.textMuted} />
                    <Text style={[styles.actionText, !item.hasContent && { color: COLORS.textMuted }]}>Stats</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push({ pathname: '/book-detail', params: { bookId: item._id } })}
                >
                    <Ionicons name="eye-outline" size={18} color={COLORS.textSecondary} />
                    <Text style={styles.actionText}>View</Text>
                </TouchableOpacity>
            </View>
        </GlassCard>
    );

    return (
        <SafeScreen top={false}>
            {/* Using the new AppHeader for the premium look */}
            <AppHeader showSearch={true} showBack={false} />

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
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
                        }
                        ListEmptyComponent={
                            <GlassCard style={styles.emptyCard}>
                                <View style={styles.iconContainer}>
                                    <View style={styles.iconGlow} />
                                    <Ionicons name="book-outline" size={64} color={COLORS.textTertiary} style={styles.emptyIcon} />
                                </View>

                                <Text style={styles.emptyText}>You haven't recommended any books yet.</Text>

                                <View style={styles.buttonContainer}>
                                    <PremiumButton
                                        title="Create New Book"
                                        onPress={() => router.push('/(tabs)/create')}
                                        style={{ width: '100%' }}
                                    />
                                </View>
                            </GlassCard>
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
        paddingHorizontal: SPACING.lg,
    },
    header: {
        marginVertical: SPACING.xl,
        alignItems: 'center',
    },
    title: {
        fontSize: FONT_SIZE.giant,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
        opacity: 0.8,
    },
    listContent: {
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
    },

    // Book Card
    bookCard: {
        marginBottom: SPACING.lg,
        padding: PADDING.card.vertical,
    },
    bookInfo: {
        flexDirection: 'row',
        marginBottom: SPACING.lg,
    },
    bookCover: {
        width: 70,
        height: 100,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.surfaceHighlight,
    },
    bookText: {
        flex: 1,
        marginLeft: SPACING.md,
        justifyContent: 'center',
    },
    bookTitle: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    dotSeparator: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: COLORS.textTertiary,
        marginHorizontal: 6,
    },
    bookMeta: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textSecondary,
        marginLeft: 4,
        fontWeight: '500',
    },
    statusBadge: {
        fontSize: FONT_SIZE.xs - 2,
        fontWeight: 'bold',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
    },
    noContentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.sm,
        gap: 4,
        backgroundColor: 'rgba(255, 51, 102, 0.1)', // Error red alpha
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.sm,
    },
    noContentText: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.error,
        fontWeight: '600',
    },

    // Action Buttons
    actionRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: COLORS.glassBorder,
        paddingTop: SPACING.md,
        gap: SPACING.md,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surfaceLight,
        paddingVertical: SPACING.sm + 2,
        borderRadius: BORDER_RADIUS.md,
        gap: 6,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    actionText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    disabledButton: {
        opacity: 0.4,
    },

    // Empty State (The requested large glass card)
    emptyCard: {
        marginTop: SPACING.xl * 2,
        padding: SPACING.xxl,
        alignItems: 'center',
        minHeight: 300,
        justifyContent: 'center',
        borderColor: COLORS.primary + '40', // Subtle cyan border glow
        borderWidth: 1,
    },
    iconContainer: {
        position: 'relative',
        marginBottom: SPACING.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconGlow: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.primaryGlow,
        opacity: 0.2,
        transform: [{ scale: 1.5 }],
    },
    emptyIcon: {
        opacity: 0.8,
    },
    emptyText: {
        color: COLORS.textSecondary,
        textAlign: 'center',
        fontSize: FONT_SIZE.md,
        fontWeight: '500',
        marginBottom: SPACING.xxl,
    },
    buttonContainer: {
        width: '80%',
    }
});
