import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, ListRenderItemInfo } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../constants/colors';
import { useAuthStore } from '../store/authContext';
import { apiClient } from '../lib/apiClient';
import { useUIStore } from '../store/uiStore';
import LikeButton from '../components/LikeButton';
import CommentSection from '../components/CommentSection';
import FollowButton from '../components/FollowButton';
import GlassCard from '../components/GlassCard';
import SafeScreen from '../components/SafeScreen';
import { useCurrencyStore } from '../store/currencyStore';
import { INK_DROPS_CONFIG } from '../constants/monetization';
import { Modal, TextInput } from 'react-native';

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
    const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'read'>('details');

    // Tipping State
    const [showTipModal, setShowTipModal] = useState(false);
    const [tipAmount, setTipAmount] = useState('');
    const [isTipping, setIsTipping] = useState(false);

    const { token, user } = useAuthStore();
    const { balance, sendTip, fetchBalance } = useCurrencyStore();
    const { showAlert } = useUIStore();
    const router = useRouter();

    useEffect(() => {
        if (tab === 'comments' || tab === 'read') setActiveTab(tab as any);
        fetchBookDetails();
    }, [bookId, tab]);

    const fetchBookDetails = async () => {
        try {
            const data = await apiClient.get<any>('/api/books', { page: 1, limit: 100 });
            const foundBook = data.books.find((b: Book) => b._id === bookId);
            if (foundBook) setBook(foundBook);
            setLoading(false);
        } catch (error) { console.error('Error fetching book:', error); setLoading(false); }
    };

    const handleMessageUser = () => {
        if (book?.user?._id === user?._id) { showAlert({ title: 'Info', message: 'This is your own book', type: 'info' }); return; }
        router.push({ pathname: '/chat', params: { userId: book!.user._id, username: book!.user.username, profileImage: book!.user.profileImage } });
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

    const renderRatingStars = (rating: number) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) { stars.push(<Ionicons key={i} name={i <= rating ? 'star' : 'star-outline'} size={20} color={COLORS.gold} style={{ marginRight: 4 }} />); }
        return stars;
    };

    if (loading) return (<SafeScreen><View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeScreen>);
    if (!book) return (<SafeScreen><View style={styles.errorContainer}><Text style={styles.errorText}>Book not found</Text></View></SafeScreen>);

    const tabs = ['details', 'comments'];
    if (book.hasContent || book.pdfUrl) tabs.push('read');

    return (
        <SafeScreen top={true} bottom={false}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.container}>
                {/* Custom Header with Back Button */}
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.tabContainer}>
                    {tabs.map(tabName => (
                        <TouchableOpacity key={tabName} onPress={() => setActiveTab(tabName as any)} style={[styles.tab, activeTab === tabName && styles.tabActive]}>
                            <Text style={[styles.tabText, activeTab === tabName && styles.tabTextActive]}>{tabName.charAt(0).toUpperCase() + tabName.slice(1)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {activeTab === 'details' && (
                    <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <Image source={{ uri: book.image }} style={styles.bookImage} contentFit="cover" />
                        <View style={styles.infoSection}>
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
                                            style={[styles.glassIconButton, { borderColor: COLORS.gold + '40' }]}
                                        >
                                            <Ionicons name="water" size={18} color={COLORS.gold} />
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
                                <LikeButton bookId={book._id} initialLiked={book.isLiked} initialCount={book.likeCount || 0} size={28} />
                                <View style={styles.statLarge}><Ionicons name="chatbubble-outline" size={28} color={COLORS.textSecondary} /><View><Text style={styles.statValLarge}>{book.commentCount || 0}</Text><Text style={styles.statLabLarge}>COMMENTS</Text></View></View>
                            </View>
                        </View>
                    </ScrollView>
                )}
                {activeTab === 'comments' && <CommentSection bookId={book._id} />}
                {activeTab === 'read' && (
                    <View style={styles.readTab}>
                        <Ionicons name={book.contentType === 'pdf' || book.pdfUrl ? "document-text-outline" : "book-outline"} size={80} color={COLORS.primary} />
                        <Text style={styles.readTitle}>{book.contentType === 'pdf' || book.pdfUrl ? 'Read as PDF' : 'Read this book'}</Text>
                        <Text style={styles.readSubtitle}>{book.contentType === 'pdf' || book.pdfUrl ? 'View original book layout' : 'Dive into the full content and chapters'}</Text>
                        <TouchableOpacity onPress={handleReadBook} style={styles.readButton}>
                            <Ionicons name={book.contentType === 'pdf' || book.pdfUrl ? "document-text" : "book-outline"} size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.readButtonText}>{book.contentType === 'pdf' || book.pdfUrl ? 'Open PDF Reader' : 'Start Reading'}</Text>
                        </TouchableOpacity>
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
                            <Ionicons name="water" size={16} color={COLORS.gold} />
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
                                    <Ionicons name="water" size={12} color={COLORS.gold} />
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
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    headerRow: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 5 },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    errorText: { fontSize: 16, color: COLORS.textSecondary },
    tabContainer: { flexDirection: 'row', backgroundColor: COLORS.surface, marginHorizontal: 20, borderRadius: 30, padding: 4, marginVertical: 16, borderWidth: 1, borderColor: COLORS.borderLight },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 24 },
    tabActive: { backgroundColor: COLORS.surfaceHighlight },
    tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: 0.5 },
    tabTextActive: { color: COLORS.textPrimary, fontWeight: '700' },
    content: { flex: 1 },
    scrollContent: { paddingBottom: 60 },
    bookImage: { width: '100%', height: 450 },
    infoSection: { padding: 24, marginTop: -60, backgroundColor: COLORS.background, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
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
    readTab: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
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
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 },
    modalContent: { padding: 24, borderRadius: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    modalTitle: { fontSize: 22, fontWeight: '900', color: COLORS.textPrimary },
    modalSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 },
    walletInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignSelf: 'flex-start' },
    walletText: { color: COLORS.gold, fontWeight: '700', fontSize: 13 },
    tipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
    tipOption: { flex: 1, minWidth: '30%', backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    tipOptionText: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 16 },
    getMoreBtn: { marginTop: 20, paddingVertical: 12, alignItems: 'center', backgroundColor: COLORS.gold + '20', borderRadius: 12, borderWidth: 1, borderColor: COLORS.gold + '40' },
    getMoreText: { color: COLORS.gold, fontWeight: '700' },
});
