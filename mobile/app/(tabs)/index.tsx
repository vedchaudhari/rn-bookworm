import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, StyleSheet, ListRenderItemInfo, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useAuthStore } from '../../store/authContext';
import styles from "../../assets/styles/home.styles";
import { Image } from 'expo-image';
import { apiClient } from '../../lib/apiClient';
import { Ionicons } from "@expo/vector-icons";
import COLORS from '../../constants/colors';
import { formatPublishDate } from '../../lib/utils';
import Loader from '../../components/Loader';
import Animated, { FadeInDown } from 'react-native-reanimated';
import BannerAdComponent from '../../components/ads/BannerAd';
import SafeScreen from "../../components/SafeScreen";
import SkeletonLoader from '../../components/SkeletonLoader';
import AppHeader from '../../components/AppHeader';

import SocialPostCard from '../../components/SocialPostCard';
import EmptyState from '../../components/EmptyState';

interface Book {
    _id: string;
    title: string;
    caption: string;
    image: string;
    rating: number;
    createdAt: string;
    isLiked?: boolean;
    isBookmarked?: boolean;
    likeCount?: number;
    commentCount?: number;
    user: {
        _id: string;
        username: string;
        profileImage: string;
    };
}

export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export default function Home() {
    const { token, isCheckingAuth, logout } = useAuthStore();
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'following'>('all');
    const router = useRouter();

    const fetchBooks = async (pageNum = 1, refresh = false, tab = activeTab) => {
        try {
            if (refresh) setRefreshing(true);
            else if (pageNum === 1) setLoading(true);

            const endpoint = tab === 'following' ? '/api/books/following' : '/api/books';

            const data = await apiClient.get<any>(endpoint, {
                page: pageNum,
                limit: 10
            });

            setBooks(prevBooks => {
                const rawBooks = refresh || pageNum === 1 ? data.books : [...prevBooks, ...data.books];
                const uniqueBooks = Array.from(new Map(rawBooks.map((book: Book) => [book._id, book])).values());
                return uniqueBooks as Book[];
            });

            setHasMore(pageNum < data.totalPages);
            setPage(pageNum);
        } catch (error) {
            console.log("Error fetching books:", error);
        } finally {
            if (refresh) {
                await sleep(100);
                setRefreshing(false);
            } else setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            if (token && !isCheckingAuth) {
                fetchBooks(1, false, activeTab);
            }
        }, [activeTab, token, isCheckingAuth])
    );

    const handleTabChange = (tab: 'all' | 'following') => {
        if (tab === activeTab) return;
        setActiveTab(tab);
        setPage(1);
        fetchBooks(1, false, tab);
    };

    const handleLoadMore = async () => {
        if (hasMore && !loading && !refreshing) {
            await fetchBooks(page + 1);
        }
    };

    const renderItem = ({ item, index }: ListRenderItemInfo<Book>) => (
        <Animated.View entering={FadeInDown.delay(index * 100).duration(600).springify()}>
            <SocialPostCard
                post={item}
                index={index}
                onDelete={(deletedId) => {
                    setBooks(prev => prev.filter(b => b._id !== deletedId));
                }}
            />
        </Animated.View>
    );

    const insets = useSafeAreaInsets();
    const TAB_BAR_HEIGHT = 64;
    const TAB_BAR_BOTTOM = Math.max(insets.bottom, 16);
    const TAB_BAR_SPACE = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM + 20;

    const BookListSkeleton = () => (
        <View style={{ paddingTop: 20 }}>
            {[1, 2, 3].map((key) => (
                <View key={key} style={{ marginHorizontal: 16, marginBottom: 20, borderRadius: 20, backgroundColor: COLORS.surface, overflow: 'hidden' }}>
                    <SkeletonLoader width="100%" height={200} borderRadius={0} />
                    <View style={{ padding: 16, gap: 10 }}>
                        <SkeletonLoader width="60%" height={24} />
                        <SkeletonLoader width="40%" height={16} />
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                            <SkeletonLoader width={40} height={40} borderRadius={20} />
                            <View style={{ gap: 6 }}>
                                <SkeletonLoader width={100} height={14} />
                                <SkeletonLoader width={60} height={12} />
                            </View>
                        </View>
                    </View>
                </View>
            ))}
        </View>
    );


    return (
        <SafeScreen top={false} bottom={false}>
            <AppHeader />
            <View style={styles.container}>
                <FlatList
                    data={books}
                    renderItem={renderItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={[styles.listContainer, { paddingBottom: 160 }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => fetchBooks(1, true)} colors={[COLORS.primary]} tintColor={COLORS.primary} />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.1}
                    ListHeaderComponent={
                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>Feed</Text>
                            <Text style={styles.headerSubtitle}>Curated stories for your shelf</Text>
                            <View style={styles.tabContainer}>
                                <TouchableOpacity style={[styles.tab, activeTab === 'all' && styles.activeTab]} onPress={() => handleTabChange('all')}>
                                    <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All Books</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.tab, activeTab === 'following' && styles.activeTab]} onPress={() => handleTabChange('following')}>
                                    <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>Following</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={{ marginTop: 16 }}><BannerAdComponent position="top" /></View>
                        </View>
                    }
                    ListFooterComponent={hasMore && books.length > 0 ? <ActivityIndicator style={styles.footerLoader} size="small" color={COLORS.primary} /> : null}
                    ListEmptyComponent={
                        loading ? (
                            <BookListSkeleton />
                        ) : (
                            <EmptyState
                                icon="book-outline"
                                title="No recommendations yet"
                                subtitle="Be the first to share a book or follow more users!"
                                onRetry={() => fetchBooks(1, true)}
                            />
                        )
                    }
                />

                {/* Floating Add Button */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => router.push('/create' as any)}
                >
                    <Ionicons name="add" size={30} color={COLORS.white} />
                </TouchableOpacity>
            </View>
        </SafeScreen>
    );
}
