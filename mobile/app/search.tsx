import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SafeScreen from '../components/SafeScreen';
import COLORS from '../constants/colors';
import { apiClient } from '../lib/apiClient';
import AppHeader from '../components/AppHeader';
import Animated, { FadeInDown } from 'react-native-reanimated';
import GlazedView from '../components/GlazedView';
import { Image } from 'expo-image';

export default function GlobalSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState<'all' | 'books' | 'users'>('all');
    const router = useRouter();
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length > 1) {
                performSearch();
            } else {
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query, type]);

    const performSearch = async () => {
        setLoading(true);
        try {
            const data = await apiClient.get<any>('/api/discovery/search', {
                q: query,
                type: type === 'all' ? undefined : type
            });

            // Format results into a single list with types for the flatlist
            const combinedResults = [
                ...(data.books || []).map((b: any) => ({ ...b, itemType: 'book' })),
                ...(data.users || []).map((u: any) => ({ ...u, itemType: 'user' }))
            ];

            setResults(combinedResults);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        if (item.itemType === 'user') {
            return (
                <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
                    <TouchableOpacity
                        style={styles.userCard}
                        onPress={() => router.push({ pathname: '/user-profile', params: { userId: item._id } })}
                    >
                        <Image source={{ uri: item.profileImage }} style={styles.userImage} contentFit="cover" />
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{item.username}</Text>
                            <Text style={styles.userBio} numberOfLines={1}>{item.bio || 'Bookworm Explorer'}</Text>
                            <View style={styles.userBadge}>
                                <Text style={styles.userBadgeText}>LEVEL {item.level || 1}</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                </Animated.View>
            );
        }

        return (
            <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
                <TouchableOpacity
                    style={styles.card}
                    onPress={() => router.push({ pathname: '/book-detail', params: { bookId: item._id } })}
                >
                    <Image source={{ uri: item.image }} style={styles.bookImage} contentFit="cover" />
                    <View style={styles.bookInfo}>
                        <Text style={styles.bookTitle}>{item.title}</Text>
                        <Text style={styles.bookAuthor}>{item.author || 'Author'}</Text>
                        <View style={styles.badgeRow}>
                            <View style={styles.genreBadge}>
                                <Text style={styles.genreText}>{item.genre || 'General'}</Text>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <SafeScreen top={false} bottom={false}>
            <AppHeader showBack showSearch={false} />
            <View style={styles.container}>
                <View style={styles.searchBarContainer}>
                    <Ionicons name="search" size={22} color={COLORS.primary} style={styles.searchIcon} />
                    <TextInput
                        ref={inputRef}
                        style={styles.input}
                        placeholder="Search books, authors, or genres..."
                        placeholderTextColor={COLORS.textMuted}
                        value={query}
                        onChangeText={setQuery}
                        autoFocus
                    />
                    {loading && <ActivityIndicator color={COLORS.primary} />}
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Type Filter Tabs */}
                {query.length > 0 && (
                    <View style={styles.tabs}>
                        <TouchableOpacity
                            onPress={() => setType('all')}
                            style={[styles.tab, type === 'all' && styles.activeTab]}
                        >
                            <Text style={[styles.tabText, type === 'all' && styles.activeTabText]}>All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setType('books')}
                            style={[styles.tab, type === 'books' && styles.activeTab]}
                        >
                            <Text style={[styles.tabText, type === 'books' && styles.activeTabText]}>Books</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setType('users')}
                            style={[styles.tab, type === 'users' && styles.activeTab]}
                        >
                            <Text style={[styles.tabText, type === 'users' && styles.activeTabText]}>Users</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {query.length === 0 ? (
                    <View style={styles.centered}>
                        <Ionicons name="compass-outline" size={80} color={COLORS.surfaceHighlight} />
                        <Text style={styles.hintTitle}>Discover Books</Text>
                        <Text style={styles.hintText}>Explore thousands of stories across your favorite genres.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={results}
                        renderItem={renderItem}
                        keyExtractor={(item) => item._id}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={!loading ? (
                            <View style={styles.centered}>
                                <Text style={styles.noResults}>No matches found for "{query}"</Text>
                            </View>
                        ) : null}
                    />
                )}
            </View>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        margin: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    searchIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '500',
    },
    list: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: 25,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.surfaceLight,
    },
    bookImage: {
        width: 90,
        height: 130,
    },
    bookInfo: {
        flex: 1,
        padding: 16,
        justifyContent: 'center',
    },
    bookTitle: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
    },
    bookAuthor: {
        color: COLORS.textMuted,
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 12,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 8,
    },
    genreBadge: {
        backgroundColor: COLORS.primary + '20',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    genreText: {
        color: COLORS.primary,
        fontSize: 10,
        fontWeight: '900',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        marginTop: 60,
    },
    hintTitle: {
        color: COLORS.white,
        fontSize: 22,
        fontWeight: '900',
        marginTop: 20,
        textAlign: 'center',
    },
    hintText: {
        color: COLORS.textMuted,
        fontSize: 15,
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 22,
    },
    noResults: {
        color: COLORS.textMuted,
        fontSize: 16,
        fontWeight: '600',
    },
    tabs: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 12
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceHighlight + '20',
        borderWidth: 1,
        borderColor: 'transparent'
    },
    activeTab: {
        backgroundColor: COLORS.primary + '20',
        borderColor: COLORS.primary + '40'
    },
    tabText: {
        color: COLORS.textMuted,
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    activeTabText: {
        color: COLORS.primary
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight + '40'
    },
    userImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.surfaceHighlight
    },
    userInfo: {
        flex: 1,
        marginLeft: 12
    },
    userName: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '800'
    },
    userBio: {
        color: COLORS.textMuted,
        fontSize: 12,
        marginTop: 2
    },
    userBadge: {
        marginTop: 6,
        alignSelf: 'flex-start',
        backgroundColor: COLORS.primary + '15',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    userBadgeText: {
        color: COLORS.primary,
        fontSize: 9,
        fontWeight: '900'
    }
});
