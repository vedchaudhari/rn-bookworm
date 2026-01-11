import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import FollowButton from '../../components/FollowButton';

import styles from '../../assets/styles/explore.styles';

const { width } = Dimensions.get('window');

export default function Explore() {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState('books'); // 'books' or 'users'
    const [activeTab, setActiveTab] = useState('trending');
    const [selectedGenre, setSelectedGenre] = useState('All');
    const [trending, setTrending] = useState([]);
    const [recommended, setRecommended] = useState([]);
    const [books, setBooks] = useState([]);
    const [users, setUsers] = useState([]);
    const [suggestedUsers, setSuggestedUsers] = useState([]);
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

    const fetchSuggestedUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/api/users/suggested`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setSuggestedUsers(data.users);
        } catch (error) { console.error(error); }
    };

    const handleSearch = async (query) => {
        if (!query) return;
        setSearchLoading(true);
        // Clear previous results to avoid stale data
        if (searchType === 'books') setBooks([]);
        else setUsers([]);

        try {
            if (searchType === 'books') {
                const res = await fetch(
                    `${API_URL}/api/discovery/search?q=${encodeURIComponent(query)}`,
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );


                if (!res.ok) {
                    console.error('Book search failed:', res.status, res.statusText);
                    setBooks([]);
                    return;
                }

                const data = await res.json();
                setBooks(data.books || []);
            } else {
                const res = await fetch(
                    `${API_URL}/api/users/search?q=${encodeURIComponent(query)}`,
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );

                if (!res.ok) {
                    console.error('User search failed:', res.status, res.statusText);
                    setUsers([]);
                    return;
                }

                const data = await res.json();
                setUsers(data.users || []);
            }
        } catch (error) {
            console.error('Search error:', error);
            if (searchType === 'books') setBooks([]);
            else setUsers([]);
        } finally {
            setSearchLoading(false);
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
        } else {
            setActiveTab('trending');
        }
    }, [searchQuery, searchType]);

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

    const renderUserItem = ({ item, index }) => (
        <Animated.View
            entering={FadeInDown.delay(index * 100).springify()}
            style={styles.userCard}
        >
            <TouchableOpacity
                onPress={() => router.push({ pathname: '/user-profile', params: { userId: item._id } })}
                style={styles.userCardContent}
            >
                <Image source={{ uri: item.profileImage }} style={styles.userAvatar} />
                <View style={styles.userCardInfo}>
                    <Text style={styles.userCardName}>{item.username}</Text>
                    <Text style={styles.userCardBio} numberOfLines={1}>{item.bio || 'Book lover'}</Text>
                    <View style={styles.userCardBadge}>
                        <Text style={styles.userCardBadgeText}>Level {item.level || 1}</Text>
                    </View>
                </View>
                <FollowButton
                    userId={item._id}
                    initialFollowing={item.isFollowing}
                    compact
                />
            </TouchableOpacity>
        </Animated.View>
    );

    const renderSuggestedUser = ({ item, index }) => (
        <TouchableOpacity
            onPress={() => router.push({ pathname: '/user-profile', params: { userId: item._id } })}
            style={styles.suggestedUserCard}
        >
            <Image source={{ uri: item.profileImage }} style={styles.suggestedAvatar} />
            <Text style={styles.suggestedName} numberOfLines={1}>{item.username}</Text>
            <FollowButton
                userId={item._id}
                initialFollowing={item.isFollowing}
                compact
                style={{ width: '100%', minWidth: 0 }}
            />
        </TouchableOpacity>
    );

    const renderEmptyState = () => {
        if (searchLoading) return null;
        return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                    <Ionicons
                        name={searchType === 'books' ? "book-outline" : "people-outline"}
                        size={40}
                        color={COLORS.primary}
                    />
                </View>
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptySubtitle}>
                    We couldn't find any {searchType.toLowerCase()} matching "{searchQuery}"
                </Text>
            </View>
        );
    };

    const getCurrentItems = () => {
        if (searchQuery) {
            return searchType === 'books' ? books : users;
        }
        if (activeTab === 'recommended') return recommended;
        return trending;
    };

    const insets = useSafeAreaInsets();
    const TAB_BAR_HEIGHT = 64;
    const TAB_BAR_BOTTOM = Math.max(insets.bottom, 16);
    const TAB_BAR_SPACE = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM + 20;

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
        <SafeScreen top={true} bottom={false}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Explore</Text>
                </View>

                {/* Refined Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputRow}>
                        <Ionicons name="search" size={22} color={COLORS.textMuted} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={searchType === 'books' ? "Books, authors, genres..." : "Search users..."}
                            placeholderTextColor={COLORS.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchLoading && <ActivityIndicator size="small" color={COLORS.primary} />}
                    </View>

                    {searchQuery.length > 0 && (
                        <View style={styles.searchTypeToggle}>
                            <TouchableOpacity
                                onPress={() => setSearchType('books')}
                                style={[styles.typeBtn, searchType === 'books' && styles.typeBtnActive]}
                            >
                                <Ionicons name="book" size={16} color={searchType === 'books' ? COLORS.white : COLORS.textMuted} />
                                <Text style={[styles.typeText, searchType === 'books' && styles.typeTextActive]}>Books</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setSearchType('users')}
                                style={[styles.typeBtn, searchType === 'users' && styles.typeBtnActive]}
                            >
                                <Ionicons name="people" size={16} color={searchType === 'users' ? COLORS.white : COLORS.textMuted} />
                                <Text style={[styles.typeText, searchType === 'users' && styles.typeTextActive]}>Users</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <FlatList
                    data={getCurrentItems()}
                    renderItem={searchQuery && searchType === 'users' ? renderUserItem : renderBookItem}
                    keyExtractor={(item) => item._id}
                    numColumns={searchQuery && searchType === 'users' ? 1 : 2}
                    key={searchQuery && searchType === 'users' ? 'users-list' : 'books-grid'}
                    columnWrapperStyle={searchQuery && searchType === 'users' ? null : styles.columnWrapper}
                    contentContainerStyle={[styles.listContent, { paddingBottom: TAB_BAR_SPACE }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
                    }
                    ListEmptyComponent={searchQuery ? renderEmptyState : null}
                    ListHeaderComponent={
                        <>
                            {searchQuery.length === 0 && (
                                <>
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

                                    {/* Suggested Users Row */}
                                    {suggestedUsers.length > 0 && (
                                        <View style={styles.sectionHeader}>
                                            <Text style={styles.sectionHeaderTitle}>Discover Readers</Text>
                                            <FlatList
                                                horizontal
                                                data={suggestedUsers}
                                                renderItem={renderSuggestedUser}
                                                keyExtractor={(item) => item._id}
                                                showsHorizontalScrollIndicator={false}
                                                contentContainerStyle={styles.suggestedListContent}
                                            />
                                        </View>
                                    )}

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
                                </>
                            )}
                        </>
                    }
                />
            </View>
        </SafeScreen>
    );
}

