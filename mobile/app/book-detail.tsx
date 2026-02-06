import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, ListRenderItemInfo, Share, Modal, TextInput, FlatList } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeInDown, SlideInDown, useSharedValue, withSpring } from 'react-native-reanimated';
import COLORS from '../constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS, FONT_SIZE, FONT_WEIGHT, createColoredShadow } from '../constants/styleConstants';
import { useAuthStore } from '../store/authContext';
import { apiClient } from '../lib/apiClient';
import { useUIStore } from '../store/uiStore';
import { useBookshelfStore } from '../store/bookshelfStore';
import { useMessageStore } from '../store/messageStore';
import { useSocialStore } from '../store/socialStore';
import LikeButton from '../components/LikeButton';
import CommentSection from '../components/CommentSection';
import FollowButton from '../components/FollowButton';
import GlassCard from '../components/GlassCard';
import SafeScreen from '../components/SafeScreen';
import ReadingProgressBar from '../components/ReadingProgressBar';
import GlazedButton from '../components/GlazedButton';
import { useCurrencyStore } from '../store/currencyStore';
import { INK_DROPS_CONFIG } from '../constants/monetization';
import BookDetailSkeleton from '../components/BookDetailSkeleton';

interface BookUser { _id: string; username: string; profileImage: string; level?: number; isFollowing?: boolean; }
interface Book {
    _id: string;
    title: string;
    author?: string;
    image: string;
    caption: string;
    rating: number;
    genre?: string;
    isLiked?: boolean;
    likeCount?: number;
    commentCount?: number;
    user: BookUser;
    hasContent?: boolean;
    contentType?: 'chapters' | 'external' | 'none' | 'pdf';
    pdfUrl?: string;
}

export default function BookDetailScreen() {
    const insets = useSafeAreaInsets();
    const { bookId, tab } = useLocalSearchParams<{ bookId: string; tab?: string }>();
    const [book, setBook] = useState<Book | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'read'>('details');
    const { items, addBook, updateStatus, isLoading: isBookshelfLoading } = useBookshelfStore();
    const bookshelfItem = items.find(item => {
        const itemBookId = typeof item.bookId === 'object' ? item.bookId._id : item.bookId;
        return itemBookId === bookId;
    });

    const [authorBooks, setAuthorBooks] = useState<Book[]>([]);
    const [loadingAuthorBooks, setLoadingAuthorBooks] = useState(false);

    // Tipping State
    const [showTipModal, setShowTipModal] = useState(false);
    const [tipAmount, setTipAmount] = useState('');
    const [isTipping, setIsTipping] = useState(false);

    const { token, user } = useAuthStore();
    const { balance, sendTip, fetchBalance } = useCurrencyStore();
    const { conversations, fetchConversations, sendMessage } = useMessageStore();
    const { followingList, fetchFollowing } = useSocialStore();
    const { showAlert } = useUIStore();
    const router = useRouter();

    const [showShareModal, setShowShareModal] = useState(false);
    const [sharingTo, setSharingTo] = useState<string | null>(null);

    useEffect(() => {
        if (bookId) {
            setLoading(true);
            // Reset book to null to ensure we don't show stale data while fetching
            setBook(null);
            if (tab === 'comments' || tab === 'read') setActiveTab(tab as any);
            fetchBookDetails();
        }
    }, [bookId, tab]);

    const fetchBookDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('[BookDetail] Fetching details for bookId:', bookId);

            const fetchedBook = await apiClient.get<Book>(`/api/books/${bookId}`);
            if (fetchedBook) {
                console.log('[BookDetail] Book fetched successfully:', fetchedBook.title);
                setBook(fetchedBook);
                fetchAuthorBooks(fetchedBook.user._id, fetchedBook._id);
            } else {
                setError('Book not found');
            }
        } catch (err: any) {
            console.error('[BookDetail] Error fetching book:', err);
            setError(err.message || 'Failed to load book details');
        } finally {
            setLoading(false);
        }
    };

    const fetchAuthorBooks = async (userId: string, currentBookId: string) => {
        setLoadingAuthorBooks(true);
        try {
            const data = await apiClient.get<Book[]>(`/api/books/user/${userId}`);
            // Filter out the current book
            const filtered = data.filter(b => b._id !== currentBookId);
            setAuthorBooks(filtered);
        } catch (error) {
            console.error('[BookDetail] Error fetching author books:', error);
        } finally {
            setLoadingAuthorBooks(false);
        }
    };

    const handleShare = async () => {
        if (!book) return;
        try {
            await Share.share({
                message: `Check out "${book.title}" by ${book.author || book.user.username} on Bookworm!`,
                url: `https://bookworm.app/books/${book._id}`,
            });
        } catch (error) {
            console.error('[BookDetail] Error sharing:', error);
        }
    };

    const handleMessageUser = () => {
        if (book?.user?._id === user?._id) { showAlert({ title: 'Info', message: 'This is your own book', type: 'info' }); return; }
        router.push({ pathname: '/chat', params: { userId: book!.user._id, username: book!.user.username, profileImage: book!.user.profileImage } });
    };

    const handleShareToChat = async (friendId: string) => {
        if (!book || !token) return;
        setSharingTo(friendId);
        try {
            const result = await sendMessage(friendId, "", undefined, undefined, undefined, token, undefined, undefined, undefined, undefined, undefined, undefined, { _id: book._id, title: book.title, author: book.author, image: book.image });
            if (result.success) {
                showAlert({ title: 'Shared!', message: `Book shared!`, type: 'success' });
                setShowShareModal(false);
            } else {
                showAlert({ title: 'Error', message: result.error || 'Failed to share', type: 'error' });
            }
        } catch (error) {
            console.error('[BookDetail] Error sharing:', error);
        } finally {
            setSharingTo(null);
        }
    };

    const handleReadBook = () => {
        if (book?.pdfUrl) {
            router.push({
                pathname: '/pdf-reader',
                params: {
                    bookId: book._id,
                    title: book.title,
                    pdfUrl: book.pdfUrl
                }
            });
        } else if (book?.hasContent) {
            router.push({ pathname: '/book-reader', params: { bookId: book._id, bookTitle: book.title } });
        } else {
            showAlert({ title: 'Info', message: 'This book has no content available to read.', type: 'info' });
        }
    };

    const handleTipPress = async (amount: number) => {
        if (!token || !book) return;

        setIsTipping(true);
        const result = await sendTip(book.user._id, amount, token);
        setIsTipping(false);

        if (result.success) {
            showAlert({ title: 'Success', message: `You tipped ${amount} Ink Drops to ${book.user.username}!`, type: 'success' });
            setShowTipModal(false);
            fetchBalance(token);
        } else {
            showAlert({ title: 'Error', message: result.error || 'Failed to send tip', type: 'error' });
        }
    };

    const handleAddToLibrary = async () => {
        if (!book) return;
        try {
            const result = await addBook({
                bookId: book._id,
                status: 'want_to_read'
            });
            if (result) {
                showAlert({ title: 'Success', message: 'Added to your library! 📚', type: 'success' });
            }
        } catch (err: any) {
            showAlert({ title: 'Error', message: err.message || 'Failed to add to library', type: 'error' });
        }
    };

    const renderRatingStars = (rating: number = 0) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) { stars.push(<Ionicons key={i} name={i <= rating ? 'star' : 'star-outline'} size={20} color={COLORS.ratingGold} style={{ marginRight: 4 }} />); }
        return stars;
    };

    if (error) return (
        <SafeScreen top={true} bottom={false}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} style={{ marginBottom: 16 }} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={fetchBookDetails} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                    <Text style={{ color: COLORS.textSecondary, fontWeight: '600' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        </SafeScreen>
    );

    if (loading) return (
        <SafeScreen top={true} bottom={false}>
            <Stack.Screen options={{ headerShown: false }} />
            <BookDetailSkeleton />
        </SafeScreen>
    );
    if (!book) return (<SafeScreen><View style={styles.errorContainer}><Text style={styles.errorText}>Book not found</Text></View></SafeScreen>);

    const tabs = ['details', 'comments'];
    if (book.hasContent || book.pdfUrl) tabs.push('read');

    return (
        <SafeScreen top={true} bottom={false}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.container}>
                {/* Dynamic Blurred Background */}
                <View style={StyleSheet.absoluteFill}>
                    <Image
                        source={{ uri: book.image }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        blurRadius={20}
                    />
                    <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.overlay }]} />
                </View>

                {/* Custom Header with Back and Share Button */}
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row' }}>
                        <TouchableOpacity
                            onPress={() => {
                                if (!token) {
                                    showAlert({ title: 'Login Required', message: 'Please login to share!', type: 'info' });
                                    return;
                                }
                                if (user?._id) {
                                    fetchFollowing(user._id);
                                }
                                fetchConversations(token);
                                setShowShareModal(true);
                            }}
                            style={[styles.headerButton, { marginRight: 8 }]}
                        >
                            <Ionicons name="chatbubble-ellipses-outline" size={22} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
                            <Ionicons name="share-outline" size={22} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.tabContainer}>
                    {tabs.map(tabName => (
                        <TouchableOpacity key={tabName} onPress={() => setActiveTab(tabName as any)} style={[styles.tab, activeTab === tabName && styles.tabActive]}>
                            <Text style={[styles.tabText, activeTab === tabName && styles.tabTextActive]}>{tabName.charAt(0).toUpperCase() + tabName.slice(1)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {activeTab === 'details' && (
                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Animated.View>
                            <Image source={{ uri: book.image }} style={styles.bookImage} contentFit="cover" />
                        </Animated.View>

                        <Animated.View
                            style={styles.infoSection}
                        >
                            <View style={styles.headerInfoCentered}>
                                <Text style={styles.titleCentered}>{book.title}</Text>
                                {book.author && <Text style={styles.authorCentered}>by {book.author}</Text>}
                                <View style={styles.ratingCentered}>{renderRatingStars(book.rating)}</View>
                                {book.genre && <View style={styles.genreBadgeCentered}><Text style={styles.genreText}>{book.genre}</Text></View>}
                            </View>

                            {/* Prominent Read Button */}
                            {(book.hasContent || book.pdfUrl) && (
                                <TouchableOpacity onPress={handleReadBook} style={styles.mainReadButton}>
                                    <Ionicons name="book" size={20} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={styles.mainReadButtonText}>{book.contentType === 'pdf' || book.pdfUrl ? 'Read PDF' : 'Read Now'}</Text>
                                </TouchableOpacity>
                            )}

                            <Text style={styles.captionCentered}>{book.caption}</Text>

                            <View style={styles.detailDivider} />

                            <GlassCard style={styles.userSectionCentered}>
                                <TouchableOpacity style={styles.profileRow} onPress={() => router.push({ pathname: '/user-profile', params: { userId: book.user._id } })}>
                                    <Image source={{ uri: book.user.profileImage }} style={styles.avatarSmall} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.usernameSmall} numberOfLines={1}>{book.user.username}</Text>
                                        <Text style={styles.userLevelSmall}>Lvl {book.user.level || 1}</Text>
                                    </View>
                                </TouchableOpacity>
                                {book.user._id !== user?._id && (
                                    <View style={styles.userActionsRow}>
                                        <TouchableOpacity
                                            onPress={() => setShowTipModal(true)}
                                            style={[styles.glassIconButton, { borderColor: COLORS.primaryGlow }]}
                                        >
                                            <Ionicons name="water" size={18} color={COLORS.primary} />
                                        </TouchableOpacity>
                                        <FollowButton userId={book.user._id} initialFollowing={book.user.isFollowing || false} />
                                        <TouchableOpacity onPress={handleMessageUser} style={styles.glassIconButton}><Ionicons name="chatbubble-outline" size={18} color={COLORS.textPrimary} /></TouchableOpacity>
                                    </View>
                                )}
                            </GlassCard>

                            {/* Recommendation-only notice */}
                            {(!book.hasContent && !book.pdfUrl) && (
                                <GlassCard style={styles.recommendationNotice}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                        <Ionicons name="information-circle" size={20} color={COLORS.secondary} style={{ marginRight: 8 }} />
                                        <Text style={styles.recommendationTitle}>Book Recommendation</Text>
                                    </View>
                                    <Text style={styles.recommendationText}>
                                        This is a curated book recommendation shared by {book.user.username}.
                                        The full content is not available to read within the app.
                                    </Text>
                                </GlassCard>
                            )}

                            <View style={styles.statsRowLarge}>
                                <LikeButton
                                    bookId={book._id}
                                    initialLiked={book.isLiked}
                                    initialCount={book.likeCount || 0}
                                    initialCommentCount={book.commentCount || 0}
                                    size={28}
                                />
                                <View style={styles.statLarge}><Ionicons name="chatbubble-outline" size={28} color={COLORS.textSecondary} /><View><Text style={styles.statValLarge}>{book.commentCount || 0}</Text><Text style={styles.statLabLarge}>COMMENTS</Text></View></View>
                            </View>

                            {/* More by this Author Section */}
                            {authorBooks.length > 0 && (
                                <View style={styles.moreFromAuthorSection}>
                                    <View style={styles.sectionHeader}>
                                        <Text style={styles.sectionTitle}>More by {book.user.username}</Text>
                                        <TouchableOpacity onPress={() => {
                                            console.log('[BookDetail] Navigating to profile:', book.user._id);
                                            router.push({ pathname: '/user-profile', params: { userId: book.user._id } });
                                        }}>
                                            <Text style={styles.viewAllText}>View All</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <FlatList
                                        data={authorBooks}
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        keyExtractor={(item) => item._id}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={styles.authorBookCard}
                                                onPress={() => {
                                                    console.log('[BookDetail] Navigating to book:', item._id);
                                                    router.push({ pathname: '/book-detail', params: { bookId: item._id } });
                                                }}
                                            >
                                                <Image source={{ uri: item.image }} style={styles.authorBookImage} />
                                                <Text style={styles.authorBookTitle} numberOfLines={2}>{item.title}</Text>
                                            </TouchableOpacity>
                                        )}
                                        contentContainerStyle={styles.authorBooksList}
                                    />
                                </View>
                            )}
                        </Animated.View>
                    </ScrollView>
                )}
                {activeTab === 'comments' && <CommentSection bookId={book._id} />}
                {activeTab === 'read' && (
                    <View style={styles.readTab}>
                        <Animated.View entering={FadeInDown.duration(600)} style={{ width: '100%', alignItems: 'center' }}>
                            {bookshelfItem ? (
                                <GlassCard style={styles.readingStatusCard}>
                                    <View style={styles.statusHeader}>
                                        <View style={styles.statusBadge}>
                                            <Text style={styles.statusBadgeText}>
                                                {bookshelfItem.status.replace('_', ' ').toUpperCase()}
                                            </Text>
                                        </View>
                                        <Text style={styles.lastReadText}>
                                            Last read: {bookshelfItem.lastReadAt ? new Date(bookshelfItem.lastReadAt).toLocaleDateString() : 'Never'}
                                        </Text>
                                    </View>

                                    <View style={styles.progressSection}>
                                        <Text style={styles.progressTitle}>Your Progress</Text>
                                        <ReadingProgressBar
                                            currentPage={bookshelfItem.currentPage}
                                            totalPages={bookshelfItem.totalPages}
                                            progress={bookshelfItem.progress}
                                            height={16}
                                        />
                                    </View>

                                    <View style={styles.readActions}>
                                        <TouchableOpacity onPress={handleReadBook} style={styles.premiumReadBtn}>
                                            <Ionicons name="play" size={24} color="#fff" style={{ marginRight: 8 }} />
                                            <Text style={styles.premiumReadText}>Continue Reading</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => router.push({ pathname: '/book-progress/[id]', params: { id: bookshelfItem._id } })}
                                            style={styles.manageBtn}
                                        >
                                            <Ionicons name="settings-outline" size={20} color={COLORS.textPrimary} />
                                        </TouchableOpacity>
                                    </View>
                                </GlassCard>
                            ) : (
                                <GlassCard style={styles.emptyReadCard}>
                                    <Ionicons name="bookmark-outline" size={64} color={COLORS.primary} style={{ marginBottom: 16, opacity: 0.5 }} />
                                    <Text style={styles.emptyReadTitle}>Start Your Journey</Text>
                                    <Text style={styles.emptyReadSubtitle}>Add this book to your library to track progress and earn rewards.</Text>

                                    <GlazedButton
                                        title="Add to Library"
                                        onPress={handleAddToLibrary}
                                        loading={isBookshelfLoading}
                                        style={styles.addToShelfBtn}
                                    />

                                    <TouchableOpacity onPress={handleReadBook} style={styles.previewBtn}>
                                        <Text style={styles.previewBtnText}>Read Preview</Text>
                                    </TouchableOpacity>
                                </GlassCard>
                            )}

                            {/* Additional Info / Guide */}
                            <View style={styles.readingInfo}>
                                <View style={styles.infoRow}>
                                    <Ionicons name="timer-outline" size={20} color={COLORS.secondary} />
                                    <Text style={styles.infoRowText}>Track reading time & speed</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Ionicons name="water-outline" size={20} color={COLORS.ratingGold} />
                                    <Text style={styles.infoRowText}>Earn Ink Drops as you read</Text>
                                </View>
                            </View>
                        </Animated.View>
                    </View>
                )}
            </View>

            {/* Tip Modal */}
            <Modal visible={showTipModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <GlassCard style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Tip Author</Text>
                            <TouchableOpacity onPress={() => setShowTipModal(false)}>
                                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>Support {book?.user.username} with Ink Drops</Text>
                        <View style={styles.walletInfo}>
                            <Ionicons name="water" size={16} color={COLORS.primary} />
                            <Text style={styles.walletText}>Balance: {balance} Ink Drops</Text>
                        </View>

                        <View style={styles.tipGrid}>
                            {INK_DROPS_CONFIG.TIP_AMOUNTS.map(amount => (
                                <TouchableOpacity
                                    key={amount}
                                    style={styles.tipOption}
                                    onPress={() => handleTipPress(amount)}
                                    disabled={isTipping}
                                >
                                    <Text style={styles.tipOptionText}>{amount}</Text>
                                    <Ionicons name="water" size={12} color={COLORS.ratingGold} />
                                </TouchableOpacity>
                            ))}
                        </View>

                        {balance < 10 && (
                            <TouchableOpacity
                                style={styles.getMoreBtn}
                                onPress={() => { setShowTipModal(false); router.push('/wallet'); }}
                            >
                                <Text style={styles.getMoreText}>Get more Ink Drops</Text>
                            </TouchableOpacity>
                        )}

                        {isTipping && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />}
                    </GlassCard>
                </View>
            </Modal>

            {/* Share to Chat Modal */}
            <Modal visible={showShareModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <GlassCard style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Share with Friends</Text>
                            <TouchableOpacity onPress={() => setShowShareModal(false)}>
                                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalSubtitle}>Select a friend to share "{book?.title}"</Text>

                        <ScrollView style={{ maxHeight: 300 }}>
                            {(() => {
                                // Merge conversations and following list
                                const allFriends = [
                                    ...conversations.map(conv => {
                                        const otherUserInfo = typeof conv.otherUser === 'string' ? null : conv.otherUser;
                                        const otherUserId = typeof conv.otherUser === 'string' ? conv.otherUser : conv.otherUser._id;
                                        return {
                                            _id: otherUserId,
                                            username: otherUserInfo?.username || 'Friend',
                                            profileImage: otherUserInfo?.profileImage || ''
                                        };
                                    }),
                                    ...followingList.map(f => ({
                                        _id: f._id,
                                        username: f.username,
                                        profileImage: f.profileImage
                                    }))
                                ];

                                // Deduplicate by ID
                                const uniqueFriends = Array.from(new Map(allFriends.map(f => [f._id, f])).values());

                                if (uniqueFriends.length > 0) {
                                    return uniqueFriends.map((friend, index) => (
                                        <TouchableOpacity
                                            key={friend._id || index}
                                            style={styles.friendItem}
                                            onPress={() => handleShareToChat(friend._id)}
                                            disabled={sharingTo !== null}
                                        >
                                            <Image
                                                source={{ uri: friend.profileImage }}
                                                style={styles.friendAvatar}
                                            />
                                            <Text style={styles.friendName}>
                                                {friend.username}
                                            </Text>
                                            {sharingTo === friend._id ? (
                                                <ActivityIndicator size="small" color={COLORS.primary} />
                                            ) : (
                                                <Ionicons name="send" size={20} color={COLORS.primary} />
                                            )}
                                        </TouchableOpacity>
                                    ));
                                }
                                return (
                                    <View style={{ padding: 20, alignItems: 'center' }}>
                                        <Text style={{ color: COLORS.textSecondary }}>No friends found.</Text>
                                    </View>
                                );
                            })()}
                        </ScrollView>
                    </GlassCard>
                </View>
            </Modal>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 5,
        zIndex: 10
    },
    headerButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.glass.bg,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.glass.border
    },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: 40 },
    errorText: { fontSize: 18, color: COLORS.textPrimary, textAlign: 'center', marginBottom: 24, fontWeight: '600' },
    retryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 },
    retryButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
    tabContainer: { flexDirection: 'row', backgroundColor: COLORS.surface, marginHorizontal: 20, borderRadius: 30, padding: 4, marginVertical: 16, borderWidth: 1, borderColor: COLORS.glassBorder },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 24 },
    tabActive: { backgroundColor: COLORS.surfaceHighlight },
    tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: 0.5 },
    tabTextActive: { color: COLORS.textPrimary, fontWeight: '700' },
    content: { flex: 1 },
    scrollContent: { paddingBottom: 60 },
    bookImage: { width: '100%', height: 450, opacity: 0.95 },
    infoSection: {
        padding: 24,
        marginTop: -60,
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        ...SHADOWS.strong
    },
    headerInfoCentered: { alignItems: 'center', marginBottom: 24 },
    titleCentered: { fontSize: 32, fontWeight: '900', color: COLORS.textPrimary, textAlign: 'center', letterSpacing: -1, marginBottom: 8 },
    authorCentered: { fontSize: 18, color: COLORS.textSecondary, fontWeight: '700', marginBottom: 16 },
    ratingCentered: { flexDirection: 'row', marginBottom: 16 },
    genreBadgeCentered: { backgroundColor: 'rgba(217, 119, 6, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(217, 119, 6, 0.3)' },
    genreText: { fontSize: 12, fontWeight: '800', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
    captionCentered: { fontSize: 16, color: COLORS.textSecondary, lineHeight: 26, textAlign: 'center', paddingHorizontal: 10 },
    detailDivider: { height: 1, backgroundColor: COLORS.surfaceLight, marginVertical: 32, opacity: 0.5 },
    userSectionCentered: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, marginBottom: 32, gap: 12 },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    avatarSmall: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: COLORS.surfaceLight },
    usernameSmall: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
    userLevelSmall: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700' },
    userActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'flex-end' },
    glassIconButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.surfaceLight },
    statsRowLarge: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 20 },
    statLarge: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    statValLarge: { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary },
    statLabLarge: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1 },
    readTab: { flex: 1, padding: 24, paddingTop: 40 },

    // Reading Status Card
    readingStatusCard: { padding: 24, width: '100%', marginBottom: 32 },
    statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    statusBadge: { backgroundColor: COLORS.primaryGlow, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    statusBadgeText: { color: COLORS.primary, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    lastReadText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
    progressSection: { marginBottom: 32 },
    progressTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12 },
    readActions: { flexDirection: 'row', gap: 12 },
    premiumReadBtn: {
        flex: 1,
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        ...createColoredShadow(COLORS.primary, 'medium') // Assuming createColoredShadow is defined elsewhere or removed
    },
    premiumReadText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    manageBtn: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: COLORS.surfaceHighlight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.glassBorder
    },

    // Empty Read Card
    emptyReadCard: { padding: 32, width: '100%', alignItems: 'center' },
    emptyReadTitle: { fontSize: 24, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 8 },
    emptyReadSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 20 },
    addToShelfBtn: { width: '100%', height: 56, marginBottom: 12 },
    previewBtn: { padding: 12 },
    previewBtnText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 14, textDecorationLine: 'underline' },

    readingInfo: { width: '100%', gap: 16, paddingHorizontal: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    infoRowText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '500' },

    readTitle: { fontSize: 24, fontWeight: '900', color: COLORS.textPrimary, marginTop: 20, marginBottom: 8 },
    readSubtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 32 },
    readButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16 },
    readButtonText: { fontSize: 16, fontWeight: '800', color: '#fff' },
    mainReadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, marginVertical: 16, width: '80%', alignSelf: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    mainReadButtonText: { fontSize: 16, fontWeight: '800', color: '#fff' },
    recommendationNotice: { padding: 16, marginBottom: 20, backgroundColor: 'rgba(96, 165, 250, 0.1)', borderWidth: 1, borderColor: 'rgba(96, 165, 250, 0.3)' },
    recommendationTitle: { fontSize: 15, fontWeight: '800', color: COLORS.secondary },
    recommendationText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', padding: 24 },
    modalContent: { padding: 24, borderRadius: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    modalTitle: { fontSize: 22, fontWeight: '900', color: COLORS.textPrimary },
    modalSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 },
    walletInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignSelf: 'flex-start' },
    walletText: { color: COLORS.ratingGold, fontWeight: '700', fontSize: 13 },
    tipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
    tipOption: { flex: 1, minWidth: '30%', backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    tipOptionText: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 16 },
    getMoreBtn: { marginTop: 20, paddingVertical: 12, alignItems: 'center', backgroundColor: COLORS.ratingGold + '20', borderRadius: 12, borderWidth: 1, borderColor: COLORS.ratingGold + '40' },
    getMoreText: { color: COLORS.ratingGold, fontWeight: '700' },

    // More by author styles
    moreFromAuthorSection: { marginTop: 40, borderTopWidth: 1, borderTopColor: COLORS.surfaceHighlight, paddingTop: 32 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 4 },
    sectionTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: -0.5 },
    viewAllText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
    authorBooksList: { gap: 16, paddingRight: 24 },
    authorBookCard: { width: 120, gap: 8 },
    authorBookImage: { width: 120, height: 180, borderRadius: 12, backgroundColor: COLORS.surface },
    authorBookTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 18 },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        gap: 12
    },
    friendAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceHighlight
    },
    friendName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary
    },
});
