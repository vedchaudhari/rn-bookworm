import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../constants/colors';
import { useAuthStore } from '../store/authContext';
import { API_URL } from '../constants/api';
import SafeScreen from '../components/SafeScreen';
import { useSubscriptionStore } from '../store/subscriptionStore';
import InterstitialAdManager from '../components/ads/InterstitialAdManager';

interface ChapterMeta {
    chapterNumber: number;
    title: string;
    wordCount: number;
    readingTimeEstimate: number;
    isPremium: boolean;
}

interface ChapterContent extends ChapterMeta {
    content: string;
}

export default function BookReaderScreen() {
    const insets = useSafeAreaInsets();
    const { bookId, bookTitle } = useLocalSearchParams<{ bookId: string; bookTitle: string }>();

    // State
    const [chapters, setChapters] = useState<ChapterMeta[]>([]);
    const [currentChapter, setCurrentChapter] = useState<ChapterContent | null>(null);
    const [loading, setLoading] = useState(true); // Initial load of chapter list
    const [loadingChapter, setLoadingChapter] = useState(false); // Loading specific chapter
    const [fontSize, setFontSize] = useState(18);
    const [currentChapterIndex, setCurrentChapterIndex] = useState(0);

    const scrollViewRef = useRef<ScrollView>(null);
    const { token } = useAuthStore();
    const { isPro } = useSubscriptionStore();
    const router = useRouter();

    // 1. Fetch Chapter List on Mount
    useEffect(() => {
        fetchChapterList();
    }, [bookId]);

    // 2. Fetch Chapter Content when Index Changes
    useEffect(() => {
        if (chapters.length > 0) {
            fetchChapterContent(chapters[currentChapterIndex].chapterNumber);
        }
    }, [currentChapterIndex, chapters]);

    const fetchChapterList = async () => {
        try {
            // Fetch both chapter list and reader progress metadata
            const [chaptersResponse, metadataResponse] = await Promise.all([
                fetch(`${API_URL}/api/chapters/${bookId}/chapters`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_URL}/api/chapters/${bookId}/reader/metadata`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            const chaptersData = await chaptersResponse.json();
            const metadataData = await metadataResponse.json();

            if (!chaptersResponse.ok) throw new Error(chaptersData.message);

            if (chaptersData.chapters && chaptersData.chapters.length > 0) {
                setChapters(chaptersData.chapters);

                // Resume from last read chapter if progress exists
                if (metadataResponse.ok && metadataData.progress?.lastReadChapter) {
                    const lastReadChapter = metadataData.progress.lastReadChapter;
                    const chapterIndex = chaptersData.chapters.findIndex(
                        (ch: ChapterMeta) => ch.chapterNumber === lastReadChapter
                    );

                    // Set to last read chapter if found, otherwise start from beginning
                    if (chapterIndex !== -1) {
                        setCurrentChapterIndex(chapterIndex);
                        console.log(`Resuming from Chapter ${lastReadChapter} (index ${chapterIndex})`);
                    } else {
                        console.log('Last read chapter not found, starting from Chapter 1');
                    }
                } else {
                    console.log('No reading progress found, starting from Chapter 1');
                }
            } else {
                setLoading(false); // No chapters found
            }
        } catch (error) {
            console.error('Error fetching chapters:', error);
            Alert.alert('Error', 'Failed to load book chapters');
            setLoading(false);
        }
    };

    const fetchChapterContent = async (chapterNum: number) => {
        setLoadingChapter(true);
        try {
            const response = await fetch(`${API_URL}/api/chapters/${bookId}/chapters/${chapterNum}/read`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.message);

            setCurrentChapter(data.chapter);
            setLoading(false); // Initial loading done
            setLoadingChapter(false);

            // Scroll to top
            scrollViewRef.current?.scrollTo({ y: 0, animated: false });

        } catch (error) {
            console.error('Error fetching chapter content:', error);
            Alert.alert('Error', 'Failed to load chapter content');
            setLoadingChapter(false);
            setLoading(false);
        }
    };

    const markChapterComplete = async (chapterNum: number) => {
        try {
            await fetch(`${API_URL}/api/chapters/${bookId}/chapters/${chapterNum}/complete`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Error marking chapter complete:', error);
        }
    };

    const increaseFontSize = () => { setFontSize(prev => Math.min(prev + 2, 28)); };
    const decreaseFontSize = () => { setFontSize(prev => Math.max(prev - 2, 14)); };

    const handleNextChapter = async () => {
        if (currentChapterIndex < chapters.length - 1) {
            // Mark current as complete before moving
            markChapterComplete(chapters[currentChapterIndex].chapterNumber);

            // Show Ad (if not Pro)
            await InterstitialAdManager.onChapterView(isPro);

            setCurrentChapterIndex(prev => prev + 1);
        } else {
            // Last chapter finished
            markChapterComplete(chapters[currentChapterIndex].chapterNumber);
            Alert.alert('Congratulations!', 'You have completed this book!', [
                { text: 'Awesome', onPress: () => router.back() }
            ]);
        }
    };

    const handlePrevChapter = () => {
        if (currentChapterIndex > 0) {
            setCurrentChapterIndex(prev => prev - 1);
        }
    };

    if (loading) return (
        <SafeScreen>
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ marginTop: 10, color: COLORS.textSecondary }}>Loading book...</Text>
            </View>
        </SafeScreen>
    );

    // No chapters found state
    if (!chapters || chapters.length === 0) return (
        <SafeScreen top={true} bottom={false}>
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>{bookTitle}</Text>
                </View>
                <View style={styles.emptyContainer}>
                    <Ionicons name="document-text-outline" size={60} color={COLORS.textSecondary} />
                    <Text style={styles.emptyText}>No content available yet</Text>
                    <Text style={styles.emptySubtext}>The author hasn't published any chapters.</Text>
                </View>
            </View>
        </SafeScreen>
    );

    return (
        <SafeScreen top={true} bottom={false}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.container}>
                {/* Custom Header with Reader Controls */}
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {currentChapter ? `Ch ${currentChapter.chapterNumber}: ${currentChapter.title}` : bookTitle}
                    </Text>
                    <View style={styles.headerControls}>
                        <TouchableOpacity onPress={decreaseFontSize} style={styles.fontButton}>
                            <Ionicons name="text" size={18} color={COLORS.textPrimary} />
                            <Ionicons name="remove" size={12} color={COLORS.textPrimary} style={{ marginLeft: -6 }} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={increaseFontSize} style={styles.fontButton}>
                            <Ionicons name="text" size={22} color={COLORS.textPrimary} />
                            <Ionicons name="add" size={12} color={COLORS.textPrimary} style={{ marginLeft: -6, marginBottom: 8 }} />
                        </TouchableOpacity>
                    </View>
                </View>

                {loadingChapter ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    </View>
                ) : (
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.container}
                        contentContainerStyle={styles.content}
                        showsVerticalScrollIndicator={false}
                    >
                        {currentChapter && (
                            <View style={styles.chapter}>
                                <Text style={styles.chapterCount}>
                                    Chapter {currentChapterIndex + 1} of {chapters.length}
                                </Text>
                                <Text style={styles.chapterTitle}>{currentChapter.title}</Text>

                                {/* Content Renderer - Handles newlines properly */}
                                <Text style={[styles.chapterContent, { fontSize, lineHeight: fontSize * 1.6 }]}>
                                    {currentChapter.content}
                                </Text>

                                <View style={styles.navigationControls}>
                                    <TouchableOpacity
                                        onPress={handlePrevChapter}
                                        disabled={currentChapterIndex === 0}
                                        style={[styles.navButton, styles.navButtonPrev, currentChapterIndex === 0 && styles.navButtonDisabled]}
                                    >
                                        <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
                                        <Text style={styles.navButtonTextPrev}>Previous</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={handleNextChapter}
                                        style={[styles.navButton, styles.navButtonNext]}
                                    >
                                        <Text style={styles.navButtonTextNext}>
                                            {currentChapterIndex === chapters.length - 1 ? 'Finish' : 'Next Chapter'}
                                        </Text>
                                        <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>
                                {currentChapter?.wordCount} words • ~{currentChapter?.readingTimeEstimate} min read
                            </Text>
                        </View>
                    </ScrollView>
                )}
            </View>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background }, // Use reader-friendly background (e.g., warmer white if available)
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 10,
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight
    },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginHorizontal: 8 },
    headerControls: { flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 8 },
    fontButton: { padding: 4, flexDirection: 'row', alignItems: 'center' },

    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

    content: { paddingHorizontal: 20, paddingVertical: 24, paddingBottom: 60 },
    chapter: { marginBottom: 32 },
    chapterCount: { fontSize: 12, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontWeight: '600' },
    chapterTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 24, lineHeight: 32 },
    chapterContent: { color: COLORS.textPrimary, textAlign: 'left' },

    navigationControls: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40, marginBottom: 20 },
    navButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 30, gap: 8 },
    navButtonPrev: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    navButtonNext: { backgroundColor: COLORS.primary },
    navButtonDisabled: { opacity: 0.3 },
    navButtonTextPrev: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
    navButtonTextNext: { color: COLORS.white, fontSize: 15, fontWeight: '600' },

    mainContent: { color: COLORS.textPrimary, lineHeight: 28 },
    emptyContainer: { alignItems: 'center', padding: 40, marginTop: 60 },
    emptyText: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16 },
    emptySubtext: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' },
    footer: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.borderLight, alignItems: 'center' },
    footerText: { fontSize: 13, color: COLORS.textMuted },
});

