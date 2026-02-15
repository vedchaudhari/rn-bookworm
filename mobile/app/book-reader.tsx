import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../constants/colors';
import { useAuthStore } from '../store/authContext';
import { useUIStore } from '../store/uiStore';
import { apiClient } from '../lib/apiClient';
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

type ReaderTheme = 'dark' | 'sepia' | 'light';

const THEMES = {
    dark: { bg: COLORS.background, text: COLORS.textPrimary, card: COLORS.surface, border: COLORS.glassBorderLight },
    sepia: { bg: '#F4ECD8', text: '#5B4636', card: '#EADFCA', border: '#D3C4A9' },
    light: { bg: '#FFFFFF', text: '#121212', card: '#F5F5F5', border: '#EEEEEE' },
};

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
    const [theme, setTheme] = useState<ReaderTheme>('dark');

    const scrollViewRef = useRef<ScrollView>(null);
    const { token } = useAuthStore();
    const { isPro } = useSubscriptionStore();
    const { showAlert } = useUIStore();
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
            const [chaptersData, metadataData] = await Promise.all([
                apiClient.get<any>(`/api/chapters/${bookId}/chapters`),
                apiClient.get<any>(`/api/chapters/${bookId}/reader/metadata`)
            ]);

            if (chaptersData.chapters && chaptersData.chapters.length > 0) {
                setChapters(chaptersData.chapters);

                // Resume from last read chapter if progress exists
                if (metadataData.progress?.lastReadChapter) {
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
        } catch (error: any) {
            console.error('Error fetching chapters:', error);
            showAlert({ title: 'Error', message: error.message || 'Failed to load book chapters', type: 'error' });
            setLoading(false);
        }
    };

    const fetchChapterContent = async (chapterNum: number) => {
        setLoadingChapter(true);
        try {
            const data = await apiClient.get<any>(`/api/chapters/${bookId}/chapters/${chapterNum}/read`);

            setCurrentChapter(data.chapter);
            setLoading(false); // Initial loading done
            setLoadingChapter(false);

            // Scroll to top
            scrollViewRef.current?.scrollTo({ y: 0, animated: false });

        } catch (error: any) {
            console.error('Error fetching chapter content:', error);
            showAlert({ title: 'Error', message: error.message || 'Failed to load chapter content', type: 'error' });
            setLoadingChapter(false);
            setLoading(false);
        }
    };

    const markChapterComplete = async (chapterNum: number) => {
        try {
            await apiClient.post(`/api/chapters/${bookId}/chapters/${chapterNum}/complete`);
        } catch (error) {
            console.error('Error marking chapter complete:', error);
        }
    };

    const increaseFontSize = () => { setFontSize(prev => Math.min(prev + 2, 28)); };
    const decreaseFontSize = () => { setFontSize(prev => Math.max(prev - 2, 14)); };
    const toggleTheme = () => {
        const sequence: ReaderTheme[] = ['dark', 'sepia', 'light'];
        const next = sequence[(sequence.indexOf(theme) + 1) % sequence.length];
        setTheme(next);
    };

    const currentColors = THEMES[theme];

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
            showAlert({
                title: 'Congratulations!',
                message: 'You have completed this book!',
                type: 'success',
                onConfirm: () => router.back()
            });
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
                <View style={[styles.headerRow, { backgroundColor: currentColors.bg, borderBottomColor: currentColors.border }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={currentColors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: currentColors.text }]} numberOfLines={1}>
                        {currentChapter ? `Ch ${currentChapter.chapterNumber}: ${currentChapter.title}` : bookTitle}
                    </Text>
                    <View style={styles.headerControls}>
                        <TouchableOpacity onPress={toggleTheme} style={styles.fontButton}>
                            <Ionicons
                                name={theme === 'dark' ? "moon" : theme === 'sepia' ? "sunny" : "sunny-outline"}
                                size={20}
                                color={currentColors.text}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={decreaseFontSize} style={styles.fontButton}>
                            <Ionicons name="text" size={18} color={currentColors.text} />
                            <Ionicons name="remove" size={12} color={currentColors.text} style={{ marginLeft: -6 }} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={increaseFontSize} style={styles.fontButton}>
                            <Ionicons name="text" size={22} color={currentColors.text} />
                            <Ionicons name="add" size={12} color={currentColors.text} style={{ marginLeft: -6, marginBottom: 8 }} />
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
                        style={[styles.container, { backgroundColor: currentColors.bg }]}
                        contentContainerStyle={styles.content}
                        showsVerticalScrollIndicator={false}
                    >
                        {currentChapter && (
                            <View style={styles.chapter}>
                                <Text style={[styles.chapterCount, { color: currentColors.text + '80' }]}>
                                    Chapter {currentChapterIndex + 1} of {chapters.length}
                                </Text>
                                <Text style={[styles.chapterTitle, { color: currentColors.text }]}>{currentChapter.title}</Text>

                                {/* Content Renderer - Handles newlines properly */}
                                <Text style={[styles.chapterContent, { fontSize, lineHeight: fontSize * 1.6, color: currentColors.text }]}>
                                    {currentChapter.content}
                                </Text>

                                <View style={styles.navigationControls}>
                                    <TouchableOpacity
                                        onPress={handlePrevChapter}
                                        disabled={currentChapterIndex === 0}
                                        style={[styles.navButton, styles.navButtonPrev, { backgroundColor: currentColors.card, borderColor: currentColors.border }, currentChapterIndex === 0 && styles.navButtonDisabled]}
                                    >
                                        <Ionicons name="chevron-back" size={20} color={currentColors.text} />
                                        <Text style={[styles.navButtonTextPrev, { color: currentColors.text }]}>Previous</Text>
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

                        <View style={[styles.footer, { borderTopColor: currentColors.border }]}>
                            <Text style={[styles.footerText, { color: currentColors.text + '60' }]}>
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
        borderBottomColor: COLORS.glassBorderLight
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
    navButtonPrev: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.glassBorder },
    navButtonNext: { backgroundColor: COLORS.primary },
    navButtonDisabled: { opacity: 0.3 },
    navButtonTextPrev: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
    navButtonTextNext: { color: COLORS.white, fontSize: 15, fontWeight: '600' },

    mainContent: { color: COLORS.textPrimary, lineHeight: 28 },
    emptyContainer: { alignItems: 'center', padding: 40, marginTop: 60 },
    emptyText: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16 },
    emptySubtext: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' },
    footer: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.glassBorderLight, alignItems: 'center' },
    footerText: { fontSize: 13, color: COLORS.textMuted },
});

