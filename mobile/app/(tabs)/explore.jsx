import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import COLORS from '../../constants/colors';
import { API_URL } from '../../constants/api';
import { useAuthStore } from '../../store/authContext';
import SafeScreen from '../../components/SafeScreen';
import GlazedView from '../../components/GlazedView';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 56) / 2;

export default function Explore() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('trending');
    const [selectedGenre, setSelectedGenre] = useState('All');
    const [trending, setTrending] = useState([]);
    const [recommended, setRecommended] = useState([]);
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const router = useRouter();
    const { token } = useAuthStore();

    const genres = ['All', 'Fiction', 'Fantasy', 'Sci-Fi', 'Mystery', 'Romance', 'Non-Fiction', 'Horror'];

    const fetchTrending = async () => {
        try {
            const res = await fetch(`${API_URL}/api/books?limit=10`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setTrending(data.books);
        } catch (error) { console.error(error); }
    };

    const fetchRecommended = async () => {
        try {
            const res = await fetch(`${API_URL}/api/books?limit=10&page=2`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setRecommended(data.books);
        } catch (error) { console.error(error); }
    };

    const searchBooks = async (query) => {
        if (!query) return;
        setSearchLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/books/search?q=${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setBooks(data.books);
        } catch (error) { console.error(error); }
        setSearchLoading(false);
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([fetchTrending(), fetchRecommended()]);
            setLoading(false);
        };
        init();
    }, []);

    useEffect(() => {
        if (searchQuery) {
            const timer = setTimeout(() => searchBooks(searchQuery), 500);
            setActiveTab('search');
            return () => clearTimeout(timer);
        } else {
            setActiveTab('trending');
        }
    }, [searchQuery]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchTrending(), fetchRecommended()]);
        setRefreshing(false);
    };

    const renderGenreChip = (genre) => (
        <TouchableOpacity
            key={genre}
            onPress={() => setSelectedGenre(genre)}
            style={[styles.genreChip, selectedGenre === genre && styles.genreChipActive]}
        >
            <Text style={[styles.genreText, selectedGenre === genre && styles.genreTextActive]}>{genre}</Text>
        </TouchableOpacity>
    );

    const renderBookItem = ({ item, index }) => (
        <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={styles.bookCardWrapper}>
            <TouchableOpacity
                onPress={() => router.push({ pathname: '/book-detail', params: { bookId: item._id } })}
                activeOpacity={0.9}
            >
                <GlazedView style={styles.bookCard}>
                    <Image source={{ uri: item.image }} style={styles.bookImage} contentFit="cover" />
                    <View style={styles.bookInfo}>
                        <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
                        <Text style={styles.bookAuthor} numberOfLines={1}>{item.author || 'Author Name'}</Text>
                        <View style={styles.cardFooter}>
                            <View style={styles.ratingBadge}>
                                <Ionicons name="star" size={12} color="#f4b400" />
                                <Text style={styles.ratingText}>{item.rating?.toFixed(1) || '4.5'}</Text>
                            </View>
                            <View style={styles.statsBadge}>
                                <Ionicons name="chatbubble-outline" size={12} color={COLORS.textMuted} />
                                <Text style={styles.statsText}>{item.commentCount || 0}</Text>
                            </View>
                        </View>
                    </View>
                </GlazedView>
            </TouchableOpacity>
        </Animated.View>
    );

    const getCurrentBooks = () => {
        if (activeTab === 'search') return books;
        if (activeTab === 'recommended') return recommended;
        return trending;
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

    return (
        <SafeScreen>
            <View style={styles.container}>
                {/* Centered Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Explore</Text>
                </View>

                {/* Refined Search Bar */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={COLORS.textMuted} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Books, authors, genres..."
                        placeholderTextColor={COLORS.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchLoading && <ActivityIndicator size="small" color={COLORS.primary} />}
                </View>

                {/* Genre Scroll */}
                <View>
                    <FlatList
                        horizontal
                        data={genres}
                        renderItem={({ item }) => renderGenreChip(item)}
                        keyExtractor={(item) => item}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.genreListContent}
                    />
                </View>

                {/* Premium Tabs */}
                {searchQuery.length === 0 && (
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            onPress={() => setActiveTab('trending')}
                            style={[styles.tab, activeTab === 'trending' && styles.tabActive]}
                        >
                            <Text style={[styles.tabText, activeTab === 'trending' && styles.tabTextActive]}>Trending</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActiveTab('recommended')}
                            style={[styles.tab, activeTab === 'recommended' && styles.tabActive]}
                        >
                            <Text style={[styles.tabText, activeTab === 'recommended' && styles.tabTextActive]}>Recommended</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Grid */}
                <FlatList
                    data={getCurrentBooks()}
                    renderItem={renderBookItem}
                    keyExtractor={(item) => item._id}
                    numColumns={2}
                    columnWrapperStyle={styles.columnWrapper}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
                    }
                />
            </View>
        </SafeScreen>
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
    header: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: COLORS.textPrimary,
        letterSpacing: -1,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        marginHorizontal: 20,
        marginBottom: 20,
        paddingHorizontal: 16,
        borderRadius: 16,
        height: 54,
        borderWidth: 1,
        borderColor: COLORS.surfaceLight,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.textPrimary,
        fontWeight: '500',
    },
    genreListContent: {
        paddingHorizontal: 20,
        gap: 10,
        paddingBottom: 20,
    },
    genreChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.surfaceLight,
    },
    genreChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    genreText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '700',
    },
    genreTextActive: {
        color: '#fff',
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 20,
        gap: 12,
    },
    tab: {
        flex: 1,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.surfaceLight,
    },
    tabActive: {
        backgroundColor: COLORS.surfaceLight,
        borderColor: COLORS.primary + '30',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.textMuted,
    },
    tabTextActive: {
        color: COLORS.primary,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    bookCardWrapper: {
        width: COLUMN_WIDTH,
    },
    bookCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        overflow: 'hidden',
    },
    bookImage: {
        width: '100%',
        height: 200,
    },
    bookInfo: {
        padding: 12,
    },
    bookTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    bookAuthor: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '600',
        marginBottom: 10,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 13,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    statsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statsText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
};
