import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../constants/colors';
import { useAuthStore } from '../store/authContext';
import { API_URL } from '../constants/api';
import LikeButton from '../components/LikeButton';
import CommentSection from '../components/CommentSection';
import FollowButton from '../components/FollowButton';
import GlassCard from '../components/GlassCard';
import SafeScreen from '../components/SafeScreen';

export default function BookDetailScreen() {
    const insets = useSafeAreaInsets();
    const { bookId } = useLocalSearchParams();
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('details'); // details, comments, read

    const { token, user } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        fetchBookDetails();
    }, [bookId]);

    const fetchBookDetails = async () => {
        try {
            const response = await fetch(`${API_URL}/api/books?page=1&limit=100`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            const foundBook = data.books.find(b => b._id === bookId);
            if (foundBook) {
                setBook(foundBook);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching book:', error);
            setLoading(false);
        }
    };

    const handleMessageUser = () => {
        if (book?.user?._id === user.id) {
            Alert.alert('Info', 'This is your own book');
            return;
        }

        router.push({
            pathname: '/chat',
            params: {
                userId: book.user._id,
                username: book.user.username,
                profileImage: book.user.profileImage,
            },
        });
    };

    const handleReadBook = () => {
        router.push({
            pathname: '/book-reader',
            params: {
                bookId: book._id,
                bookTitle: book.title,
            },
        });
    };

    const renderRatingStars = (rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <Ionicons
                    key={i}
                    name={i <= rating ? 'star' : 'star-outline'}
                    size={20}
                    color={COLORS.gold}
                    style={{ marginRight: 4 }}
                />
            );
        }
        return stars;
    };

    if (loading) {
        return (
            <SafeScreen>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </SafeScreen>
        );
    }

    if (!book) {
        return (
            <SafeScreen>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Book not found</Text>
                </View>
            </SafeScreen>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: '', // Title shown in hero section
                    headerStyle: { backgroundColor: COLORS.background },
                    headerTintColor: COLORS.textPrimary,
                    headerShadowVisible: false,
                    headerTitleAlign: 'center',
                    headerStatusBarHeight: insets.top,
                }}
            />
            <SafeScreen top={true} bottom={false}>
                <View style={[styles.container, { paddingTop: 0 }]}>
                    {/* Modern Tabs */}
                    <View style={styles.tabContainer}>
                        {['details', 'comments', 'read'].map(tab => (
                            <TouchableOpacity
                                key={tab}
                                onPress={() => setActiveTab(tab)}
                                style={[styles.tab, activeTab === tab && styles.tabActive]}
                            >
                                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Content */}
                    {activeTab === 'details' && (
                        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                            <Image source={{ uri: book.image }} style={styles.bookImage} contentFit="cover" />

                            <View style={styles.infoSection}>
                                <View style={styles.headerInfoCentered}>
                                    <Text style={styles.titleCentered}>{book.title}</Text>
                                    {book.author && <Text style={styles.authorCentered}>by {book.author}</Text>}

                                    <View style={styles.ratingCentered}>
                                        {renderRatingStars(book.rating)}
                                    </View>

                                    {book.genre && (
                                        <View style={styles.genreBadgeCentered}>
                                            <Text style={styles.genreText}>{book.genre}</Text>
                                        </View>
                                    )}
                                </View>

                                <Text style={styles.captionCentered}>{book.caption}</Text>

                                <View style={styles.detailDivider} />

                                <GlassCard style={styles.userSectionCentered}>
                                    <TouchableOpacity style={styles.profileRow} onPress={() => router.push({ pathname: '/user-profile', params: { userId: book.user._id } })}>
                                        <Image source={{ uri: book.user.profileImage }} style={styles.avatarSmall} />
                                        <View>
                                            <Text style={styles.usernameSmall}>{book.user.username}</Text>
                                            <Text style={styles.userLevelSmall}>Lvl {book.user.level || 1}</Text>
                                        </View>
                                    </TouchableOpacity>

                                    {book.user._id !== user.id && (
                                        <View style={styles.userActionsRow}>
                                            <FollowButton
                                                userId={book.user._id}
                                                initialFollowing={book.user.isFollowing || false}
                                            />
                                            <TouchableOpacity onPress={handleMessageUser} style={styles.glassIconButton}>
                                                <Ionicons name="chatbubble-outline" size={18} color={COLORS.textPrimary} />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </GlassCard>

                                <View style={styles.statsRowLarge}>
                                    <LikeButton
                                        bookId={book._id}
                                        initialLiked={book.isLiked}
                                        initialCount={book.likeCount || 0}
                                        size={28}
                                    />
                                    <View style={styles.statLarge}>
                                        <Ionicons name="chatbubble-outline" size={28} color={COLORS.textSecondary} />
                                        <View>
                                            <Text style={styles.statValLarge}>{book.commentCount || 0}</Text>
                                            <Text style={styles.statLabLarge}>COMMENTS</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>
                    )}

                    {activeTab === 'comments' && (
                        <CommentSection bookId={book._id} />
                    )}

                    {activeTab === 'read' && (
                        <View style={styles.readTab}>
                            <Ionicons name="book-outline" size={80} color={COLORS.primary} />
                            <Text style={styles.readTitle}>Read this book</Text>
                            <Text style={styles.readSubtitle}>
                                Dive into the full content and chapters
                            </Text>
                            <TouchableOpacity onPress={handleReadBook} style={styles.readButton}>
                                <Ionicons name="book-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.readButtonText}>Start Reading</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </SafeScreen>
        </>
    );
}

const styles = StyleSheet.create({
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    errorText: {
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        marginHorizontal: 20,
        borderRadius: 30, // Pill shape
        padding: 4,
        marginVertical: 16,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 24,
    },
    tabActive: {
        backgroundColor: COLORS.surfaceHighlight,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textSecondary,
        letterSpacing: 0.5,
    },
    tabTextActive: {
        color: COLORS.textPrimary,
        fontWeight: '700',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    bookImage: {
        width: '100%',
        height: 450,
    },
    infoSection: {
        padding: 24,
        marginTop: -60,
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
    },
    headerInfoCentered: {
        alignItems: 'center',
        marginBottom: 24,
    },
    titleCentered: {
        fontSize: 32,
        fontWeight: '900',
        color: COLORS.textPrimary,
        textAlign: 'center',
        letterSpacing: -1,
        marginBottom: 8,
    },
    authorCentered: {
        fontSize: 18,
        color: COLORS.textSecondary,
        fontWeight: '700',
        marginBottom: 16,
    },
    ratingCentered: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    genreBadgeCentered: {
        backgroundColor: 'rgba(217, 119, 6, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(217, 119, 6, 0.3)',
    },
    genreText: {
        fontSize: 12,
        fontWeight: '800',
        color: COLORS.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    captionCentered: {
        fontSize: 16,
        color: COLORS.textSecondary,
        lineHeight: 26,
        textAlign: 'center',
        paddingHorizontal: 10,
    },
    detailDivider: {
        height: 1,
        backgroundColor: COLORS.surfaceLight,
        marginVertical: 32,
        opacity: 0.5,
    },
    userSectionCentered: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        marginBottom: 32,
        // GlassCard handles background and border
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarSmall: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: COLORS.surfaceLight,
    },
    usernameSmall: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    userLevelSmall: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '700',
    },
    userActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        justifyContent: 'flex-end',
    },
    glassIconButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.surfaceLight,
    },
    statsRowLarge: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 20,
    },
    statLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statValLarge: {
        fontSize: 20,
        fontWeight: '900',
        color: COLORS.textPrimary,
    },
    statLabLarge: {
        fontSize: 10,
        fontWeight: '800',
        color: COLORS.textMuted,
        letterSpacing: 1,
    },
    readTab: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    readTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.textPrimary,
        marginTop: 20,
        marginBottom: 8,
    },
    readSubtitle: {
        fontSize: 15,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 32,
    },
    readButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 16,
    },
    readButtonText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#fff',
    },
});
