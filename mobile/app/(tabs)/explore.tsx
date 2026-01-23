import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Dimensions, StyleSheet, ListRenderItemInfo } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import COLORS from '../../constants/colors';
import { apiClient } from '../../lib/apiClient';
import { useAuthStore } from '../../store/authContext';
import SafeScreen from '../../components/SafeScreen';
import GlazedView from '../../components/GlazedView';
import Animated, { FadeInDown } from 'react-native-reanimated';
import FollowButton from '../../components/FollowButton';
import styles from '../../assets/styles/explore.styles';
import EmptyState from '../../components/EmptyState';

const { width } = Dimensions.get('window');

interface Book {
    _id: string;
    title: string;
    author?: string;
    image: string;
    rating?: number;
    commentCount?: number;
}

interface User {
    _id: string;
    username: string;
    profileImage: string;
    bio?: string;
    level?: number;
    isFollowing?: boolean;
}

export default function Explore() {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState<'books' | 'users'>('books');
    const [activeTab, setActiveTab] = useState<'trending' | 'recommended' | 'search'>('trending');
    const [selectedGenre, setSelectedGenre] = useState('All');
    const [trending, setTrending] = useState<Book[]>([]);
    const [recommended, setRecommended] = useState<Book[]>([]);
    const [books, setBooks] = useState<Book[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const router = useRouter();
    const { token } = useAuthStore();
    const genres = ['All', 'Fiction', 'Fantasy', 'Sci-Fi', 'Mystery', 'Romance', 'Non-Fiction', 'Horror'];

    const fetchTrending = async () => {
        try {
            const data = await apiClient.get<any>('/api/books', { limit: 10 });
            const uniqueTrending = Array.from(new Map((data.books || []).map((b: any) => [b._id, b])).values());
            setTrending(uniqueTrending as Book[]);
        } catch (error) { console.error(error); }
    };

    const fetchRecommended = async () => {
        try {
            const data = await apiClient.get<any>('/api/books', { limit: 10, page: 2 });
            const uniqueRecs = Array.from(new Map((data.books || []).map((b: any) => [b._id, b])).values());
            setRecommended(uniqueRecs as Book[]);
        } catch (error) { console.error(error); }
    };

    const fetchSuggestedUsers = async () => {
        try {
            const data = await apiClient.get<any>('/api/users/suggested');
            // By definition, suggested users are not followed, so we explicitly set isFollowing to false
            // to avoid the FollowButton falling back to local cache checks.
            const usersWithFollowStatus = (data.users || []).map((user: User) => ({
                ...user,
                isFollowing: false
            }));
            setSuggestedUsers(usersWithFollowStatus);
        } catch (error) { console.error(error); }
    };

    const searchAbortController = React.useRef<AbortController | null>(null);

    const handleSearch = async (query: string) => {
        if (!query) return;

        // Cancel previous search
        if (searchAbortController.current) {
            searchAbortController.current.abort();
        }
        searchAbortController.current = new AbortController();

        setSearchLoading(true);
        if (searchType === 'books') setBooks([]);
        else setUsers([]);

        try {
            if (searchType === 'books') {
                const data = await apiClient.get<any>('/api/discovery/search', { q: query }, { signal: searchAbortController.current.signal });
                setBooks(data.books || []);
            } else {
                const data = await apiClient.get<any>('/api/users/search', { q: query }, { signal: searchAbortController.current.signal });
                setUsers(data.users || []);
            }
        } catch (error: any) {
            if (error.name === 'AbortError') return;
            console.error('Search error:', error);
            if (searchType === 'books') setBooks([]);
            else setUsers([]);
        } finally {
            if (!searchAbortController.current?.signal.aborted) {
                setSearchLoading(false);
            }
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([fetchTrending(), fetchRecommended(), fetchSuggestedUsers()]);
            setLoading(false);
        };
        init();
    }, []);

    useEffect(() => {
        if (searchQuery) {
            const timer = setTimeout(() => handleSearch(searchQuery), 500);
            setActiveTab('search');
            return () => clearTimeout(timer);
        } else { setActiveTab('trending'); }
    }, [searchQuery, searchType]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchTrending(), fetchRecommended()]);
        setRefreshing(false);
    };

    const renderGenreChip = (genre: string) => (
        <TouchableOpacity key={genre} onPress={() => setSelectedGenre(genre)} style={[styles.genreChip, selectedGenre === genre && styles.genreChipActive]}>
            <Text style={[styles.genreText, selectedGenre === genre && styles.genreTextActive]}>{genre}</Text>
        </TouchableOpacity>
    );

    const renderBookItem = ({ item, index }: ListRenderItemInfo<Book>) => (
        <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={styles.bookCardWrapper}>
            <TouchableOpacity onPress={() => router.push({ pathname: '/book-detail', params: { bookId: item._id } })} activeOpacity={0.9}>
                <GlazedView style={styles.bookCard}>
                    <Image source={{ uri: item.image }} style={styles.bookImage} contentFit="cover" />
                    <View style={styles.bookInfo}>
                        <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
                        <Text style={styles.bookAuthor} numberOfLines={1}>{item.author || 'Author Name'}</Text>
                        <View style={styles.cardFooter}>
                            <View style={styles.ratingBadge}>
                                <Ionicons name="star" size={12} color={COLORS.gold} />
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

    const renderUserItem = ({ item, index }: ListRenderItemInfo<User>) => (
        <Animated.View entering={FadeInDown.delay(index * 100).springify()} style={styles.userCard}>
            <TouchableOpacity onPress={() => router.push({ pathname: '/user-profile', params: { userId: item._id } })} style={styles.userCardContent}>
                <Image source={{ uri: item.profileImage }} style={styles.userAvatar} />
                <View style={styles.userCardInfo}>
                    <Text style={styles.userCardName}>{item.username}</Text>
                    <Text style={styles.userCardBio} numberOfLines={1}>{item.bio || 'Book lover'}</Text>
                    <View style={styles.userCardBadge}><Text style={styles.userCardBadgeText}>Level {item.level || 1}</Text></View>
                </View>
                <FollowButton userId={item._id} initialFollowing={item.isFollowing} compact />
            </TouchableOpacity>
        </Animated.View>
    );

    const renderSuggestedUser = ({ item }: ListRenderItemInfo<User>) => (
        <TouchableOpacity onPress={() => router.push({ pathname: '/user-profile', params: { userId: item._id } })} style={styles.suggestedUserCard}>
            <Image source={{ uri: item.profileImage }} style={styles.suggestedAvatar} />
            <Text style={styles.suggestedName} numberOfLines={1}>{item.username}</Text>
            <FollowButton userId={item._id} initialFollowing={item.isFollowing} compact style={{ width: '100%', minWidth: 0 }} />
        </TouchableOpacity>
    );

    const renderEmptyState = () => {
        if (searchLoading) return null;
        return (
            <EmptyState
                icon={searchType === 'books' ? "book-outline" : "people-outline"}
                title="No results found"
                subtitle={`We couldn't find any ${searchType.toLowerCase()} matching "${searchQuery}"`}
                onRetry={() => handleSearch(searchQuery)}
            />
        );
    };

    const getCurrentItems = (): (Book | User)[] => {
        if (searchQuery) return searchType === 'books' ? books : users;
        if (activeTab === 'recommended') return recommended;
        return trending;
    };

    const insets = useSafeAreaInsets();
    const TAB_BAR_SPACE = 64 + Math.max(insets.bottom, 16) + 20;

    if (loading) {
        return (<SafeScreen><View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeScreen>);
    }

    return (
        <SafeScreen top={true} bottom={false}>
            <View style={styles.container}>
                <View style={styles.header}><Text style={styles.headerTitle}>Explore</Text></View>
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputRow}>
                        <Ionicons name="search" size={22} color={COLORS.textMuted} style={styles.searchIcon} />
                        <TextInput style={styles.searchInput} placeholder={searchType === 'books' ? "Books, authors, genres..." : "Search users..."} placeholderTextColor={COLORS.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
                        {searchLoading && <ActivityIndicator size="small" color={COLORS.primary} />}
                    </View>
                    {searchQuery.length > 0 && (
                        <View style={styles.searchTypeToggle}>
                            <TouchableOpacity onPress={() => setSearchType('books')} style={[styles.typeBtn, searchType === 'books' && styles.typeBtnActive]}>
                                <Ionicons name="book" size={16} color={searchType === 'books' ? COLORS.white : COLORS.textMuted} />
                                <Text style={[styles.typeText, searchType === 'books' && styles.typeTextActive]}>Books</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setSearchType('users')} style={[styles.typeBtn, searchType === 'users' && styles.typeBtnActive]}>
                                <Ionicons name="people" size={16} color={searchType === 'users' ? COLORS.white : COLORS.textMuted} />
                                <Text style={[styles.typeText, searchType === 'users' && styles.typeTextActive]}>Users</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
                <FlatList
                    data={getCurrentItems() as any}
                    renderItem={searchQuery && searchType === 'users' ? renderUserItem as any : renderBookItem as any}
                    keyExtractor={(item: any, index: number) => `${item._id || 'explore'}-${index}`}
                    numColumns={searchQuery && searchType === 'users' ? 1 : 2}
                    key={searchQuery && searchType === 'users' ? 'users-list' : 'books-grid'}
                    columnWrapperStyle={searchQuery && searchType === 'users' ? undefined : styles.columnWrapper}
                    contentContainerStyle={[styles.listContent, { paddingBottom: TAB_BAR_SPACE }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
                    ListEmptyComponent={searchQuery ? renderEmptyState : null}
                    ListHeaderComponent={
                        <>
                            {searchQuery.length === 0 && (
                                <>
                                    <View><FlatList horizontal data={genres} renderItem={({ item }) => renderGenreChip(item)} keyExtractor={(item, index) => `${item}-${index}`} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreListContent} /></View>
                                    {suggestedUsers.length > 0 && (
                                        <View style={styles.sectionHeader}>
                                            <Text style={styles.sectionHeaderTitle}>Discover Readers</Text>
                                            <FlatList horizontal data={suggestedUsers} renderItem={renderSuggestedUser} keyExtractor={(item, index) => `${item._id || 'suggested'}-${index}`} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestedListContent} />
                                        </View>
                                    )}
                                    <View style={styles.tabContainer}>
                                        <TouchableOpacity onPress={() => setActiveTab('trending')} style={[styles.tab, activeTab === 'trending' && styles.tabActive]}>
                                            <Text style={[styles.tabText, activeTab === 'trending' && styles.tabTextActive]}>Trending</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => setActiveTab('recommended')} style={[styles.tab, activeTab === 'recommended' && styles.tabActive]}>
                                            <Text style={[styles.tabText, activeTab === 'recommended' && styles.tabTextActive]}>Recommended</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </>
                    }
                />
            </View>
        </SafeScreen>
    );
}
